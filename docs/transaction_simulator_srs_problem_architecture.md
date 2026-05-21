# Transaction Simulator / Ledger Transfer System

Tài liệu này gồm 3 phần:

1. **SRS - Software Requirements Specification**: mô tả yêu cầu và tính năng cơ bản của ứng dụng.
2. **Báo cáo bài toán và giải pháp**: liệt kê các vấn đề thường gặp trong hệ thống transaction và cách thiết kế đã đề xuất xử lý chúng.
3. **Tài liệu kiến trúc hệ thống**: mô tả kiến trúc, luồng xử lý, module, dữ liệu và deployment.

---

# PHẦN 1: SRS - SOFTWARE REQUIREMENTS SPECIFICATION

## 1. Giới thiệu

### 1.1. Tên hệ thống

**Transaction Simulator / Ledger Transfer System**

### 1.2. Mục tiêu hệ thống

Ứng dụng được xây dựng nhằm mô phỏng một hệ thống giao dịch chuyển tiền nội bộ giữa các tài khoản giả lập. Mục tiêu chính không phải là tạo ra sản phẩm fintech hoàn chỉnh, mà là tạo một môi trường thực hành backend nâng cao với các chủ đề:

- PostgreSQL transaction.
- Row-level locking.
- Race condition và deadlock.
- Idempotency.
- Double-entry ledger.
- Message queue.
- Worker xử lý bất đồng bộ.
- Retry và Dead Letter Queue.
- Logging, monitoring, tracing.
- Reconciliation dữ liệu.
- Deployment lên VPS/cloud giá rẻ.

### 1.3. Phạm vi MVP

MVP tập trung vào các chức năng cơ bản sau:

- Quản lý tài khoản giả lập.
- Nạp số dư giả lập.
- Tạo giao dịch chuyển tiền giữa hai tài khoản.
- Ghi ledger/sổ cái.
- Theo dõi trạng thái giao dịch.
- Xử lý idempotency.
- Xử lý event bất đồng bộ bằng outbox + worker + queue.
- Retry khi lỗi và đưa message lỗi vào DLQ.
- Quan sát hệ thống qua dashboard đơn giản.
- Chạy reconciliation để kiểm tra tính đúng đắn dữ liệu.

### 1.4. Ngoài phạm vi MVP

Các phần sau chưa cần làm ở giai đoạn đầu:

- Tích hợp thanh toán thật.
- KYC, AML, compliance thật.
- Multi-currency exchange rate thật.
- Multi-region deployment.
- Kubernetes production.
- High availability PostgreSQL cluster.
- Microservices tách database hoàn toàn.
- Exactly-once messaging tuyệt đối.
- Mobile app.

---

## 2. Người dùng hệ thống

### 2.1. Solo Developer / Admin

Đây là người dùng chính của hệ thống.

Có thể:

- Tạo account giả lập.
- Tạo transfer.
- Xem trạng thái giao dịch.
- Xem ledger.
- Xem queue/DLQ.
- Replay message lỗi.
- Chạy reconciliation.
- Theo dõi metrics/logs.

### 2.2. Demo User

Người dùng thử hệ thống qua UI.

Có thể:

- Xem danh sách account.
- Tạo giao dịch chuyển tiền.
- Xem kết quả giao dịch.
- Xem lịch sử giao dịch.

Demo User không cần quyền can thiệp DLQ hoặc replay message.

---

## 3. Yêu cầu chức năng

## FR-01: Quản lý tài khoản giả lập

### Mô tả

Hệ thống cho phép tạo và quản lý các tài khoản nội bộ dùng để mô phỏng giao dịch.

### Dữ liệu chính

Mỗi account có:

- `id`
- `code`
- `name`
- `currency`
- `available_balance_minor`
- `status`
- `created_at`
- `updated_at`

### Trạng thái account

```text
ACTIVE
LOCKED
CLOSED
```

### Chức năng

- Tạo account mới.
- Xem danh sách account.
- Xem chi tiết account.
- Khóa account.
- Mở khóa account.
- Đóng account.

### Acceptance Criteria

- Không thể tạo hai account có cùng `code`.
- Account `LOCKED` không được phép gửi tiền.
- Account `CLOSED` không được phép gửi hoặc nhận tiền.
- Balance không dùng kiểu `float`; phải dùng integer minor unit, ví dụ VND là đơn vị đồng, USD là cent.

---

## FR-02: Nạp số dư giả lập

### Mô tả

Hệ thống cho phép nạp số dư giả lập vào account để phục vụ test transaction.

### Chức năng

- Nạp tiền vào account.
- Ghi ledger entry loại `TOPUP`.
- Cập nhật balance account.

### Acceptance Criteria

- Chỉ account `ACTIVE` mới được nạp tiền.
- Amount phải lớn hơn 0.
- Sau khi nạp, ledger và balance phải khớp.

---

## FR-03: Tạo giao dịch chuyển tiền

### Mô tả

Người dùng có thể tạo giao dịch chuyển tiền từ account nguồn sang account đích.

### Input

```json
{
  "sourceAccountId": "uuid",
  "destinationAccountId": "uuid",
  "amountMinor": 100000,
  "currency": "VND",
  "reference": "SIM-001",
  "scenario": "normal"
}
```

### Header bắt buộc

```http
Idempotency-Key: unique-key-per-command
X-Request-Id: request-id
```

### Output thành công

```json
{
  "transferId": "uuid",
  "status": "PENDING"
}
```

### Trạng thái transfer

```text
PENDING
PROCESSING
SUCCESS
FAILED
REVERSED
```

### Acceptance Criteria

- Không cho phép chuyển tiền cho chính account nguồn.
- Account nguồn và account đích phải tồn tại.
- Account nguồn và account đích phải `ACTIVE`.
- Amount phải lớn hơn 0.
- Currency của transfer phải khớp với currency của hai account.
- Nếu số dư không đủ, transfer phải `FAILED` hoặc request bị reject với lỗi nghiệp vụ.
- Giao dịch không được tạo duplicate nếu client retry cùng `Idempotency-Key`.

---

## FR-04: Xử lý idempotency

### Mô tả

Hệ thống phải đảm bảo việc retry request không tạo giao dịch trùng.

### Quy tắc

- Cùng `client_id` + `Idempotency-Key` + cùng payload: trả lại kết quả cũ.
- Cùng `client_id` + `Idempotency-Key` nhưng payload khác: trả lỗi `409 Conflict`.
- Idempotency record nên có TTL logic hoặc retention policy.

### Acceptance Criteria

- Gửi cùng một request 100 lần chỉ tạo một transfer.
- Gửi cùng key nhưng đổi amount phải bị từ chối.
- Idempotency được enforce bằng unique constraint trong PostgreSQL.

---

## FR-05: Ghi ledger/sổ cái

### Mô tả

Mọi thay đổi số dư phải được ghi vào ledger. Ledger là dữ liệu bất biến, dùng để audit và reconciliation.

### Loại ledger entry

```text
TOPUP
DEBIT
CREDIT
REVERSAL_DEBIT
REVERSAL_CREDIT
```

### Ví dụ transfer thành công

| account | entry_type | side | amount |
|---|---|---|---:|
| Account A | TRANSFER | DEBIT | 100000 |
| Account B | TRANSFER | CREDIT | 100000 |

### Acceptance Criteria

- Transfer thành công phải có đủ một debit và một credit.
- Ledger entry sau khi tạo không được update hoặc delete bằng flow nghiệp vụ thông thường.
- Balance account phải có thể tính lại được từ ledger.

---

## FR-06: Xem trạng thái và lịch sử giao dịch

### Mô tả

Người dùng có thể xem danh sách transfer, chi tiết transfer và lịch sử giao dịch theo account.

### Chức năng

- `GET /transfers`
- `GET /transfers/:id`
- `GET /accounts/:id/ledger`
- `GET /accounts/:id/transfers`

### Acceptance Criteria

- Danh sách transfer có phân trang.
- Có filter theo status, account, thời gian.
- Chi tiết transfer hiển thị được timeline xử lý.

---

## FR-07: Transactional outbox

### Mô tả

Khi API tạo transfer, hệ thống không publish trực tiếp message ra queue trong cùng request. Thay vào đó, API ghi event vào bảng `outbox_events` trong cùng PostgreSQL transaction.

### Luồng

```text
API receives transfer request
→ BEGIN DB transaction
→ Validate and lock accounts
→ Insert transfer
→ Insert ledger entries or pending state
→ Insert outbox event
→ COMMIT
→ Outbox worker publishes event to RabbitMQ
```

### Acceptance Criteria

- Không có trường hợp DB commit thành công nhưng event không có dấu vết.
- Outbox worker có thể retry publish nếu RabbitMQ tạm thời lỗi.
- Event đã publish phải được đánh dấu `published_at`.

---

## FR-08: Worker xử lý bất đồng bộ

### Mô tả

Worker nhận event từ RabbitMQ và xử lý các tác vụ bất đồng bộ liên quan đến transfer.

### Event cơ bản

```text
transfer.created
transfer.processing
transfer.completed
transfer.failed
```

### Chức năng worker

- Consume message từ RabbitMQ.
- Xử lý logic theo event type.
- Cập nhật trạng thái transfer.
- Ghi log và metrics.
- Ack message nếu xử lý thành công.
- Nack hoặc đưa vào retry nếu lỗi tạm thời.

### Acceptance Criteria

- Worker phải idempotent.
- Duplicate message không được tạo double debit hoặc double credit.
- Worker crash giữa chừng không làm mất message.

---

## FR-09: Retry và Dead Letter Queue

### Mô tả

Khi xử lý message thất bại, hệ thống cần retry theo backoff. Nếu vượt quá số lần retry, message được chuyển vào DLQ.

### Quy tắc gợi ý

```text
Retry 1: sau 5 giây
Retry 2: sau 30 giây
Retry 3: sau 2 phút
Sau đó: DLQ
```

### Acceptance Criteria

- Lỗi tạm thời được retry.
- Lỗi không thể khôi phục được đưa vào DLQ.
- Admin có thể xem DLQ.
- Admin có thể replay message trong DLQ.

---

## FR-10: Mô phỏng lỗi

### Mô tả

Hệ thống cho phép tạo transfer với các scenario lỗi để luyện debugging và vận hành.

### Scenario đề xuất

```text
normal
insufficient_funds
worker_crash
slow_processing
db_timeout
duplicate_message
random_failure
```

### Acceptance Criteria

- Scenario lỗi phải được log rõ ràng.
- Lỗi retryable phải đi qua retry flow.
- Lỗi non-retryable phải vào DLQ hoặc FAILED state.

---

## FR-11: Reconciliation

### Mô tả

Hệ thống có job kiểm tra dữ liệu giữa `accounts.balance`, `ledger_entries` và `transfers`.

### Kiểm tra tối thiểu

- Balance hiện tại có khớp với tổng ledger không.
- Transfer `SUCCESS` có đủ debit và credit không.
- Transfer `PENDING` quá lâu có bị stuck không.
- Outbox event chưa publish quá lâu có tồn tại không.
- Message DLQ có tăng bất thường không.

### Acceptance Criteria

- Có API hoặc admin action để chạy reconciliation thủ công.
- Có scheduled job chạy định kỳ.
- Kết quả reconciliation được lưu lại để xem lịch sử.

---

## FR-12: Dashboard vận hành cơ bản

### Mô tả

FE cung cấp một dashboard đơn giản để quan sát hệ thống.

### Màn hình đề xuất

- Account list.
- Create transfer form.
- Transfer list.
- Transfer detail.
- Ledger view.
- Queue status.
- DLQ view.
- Reconciliation result.
- Metrics overview.

### Acceptance Criteria

- FE không cần thiết kế phức tạp.
- FE phải giúp thao tác và quan sát backend dễ dàng.
- Các màn hình admin có thể đơn giản nhưng phải đủ thông tin để debug.

---

## FR-13: Logging, metrics, health check

### Mô tả

Hệ thống phải có khả năng quan sát cơ bản.

### Logging

Mỗi log quan trọng nên có:

```text
request_id
trace_id
transfer_id
message_id
account_id
status
error_code
latency_ms
```

### Metrics tối thiểu

```text
http_requests_total
http_request_duration_seconds
transfer_created_total
transfer_success_total
transfer_failed_total
queue_depth
outbox_pending_events
dlq_depth
worker_processing_duration_seconds
reconciliation_mismatch_total
```

### Health endpoint

```text
GET /health/live
GET /health/ready
GET /metrics
```

### Acceptance Criteria

- `/health/live` trả OK nếu app process còn sống.
- `/health/ready` chỉ OK nếu kết nối được DB, RabbitMQ, Redis nếu có.
- `/metrics` expose được Prometheus metrics.

---

## 4. Yêu cầu phi chức năng

## NFR-01: Correctness

Đây là yêu cầu quan trọng nhất.

Hệ thống không được:

- Tạo tiền từ không khí.
- Làm mất tiền.
- Double debit.
- Double credit.
- Tạo duplicate transfer khi client retry.
- Ghi ledger thiếu dòng.

## NFR-02: Performance target MVP

Với cấu hình 1 VPS giá rẻ khoảng 2 vCPU / 4 GB RAM, mục tiêu là:

| Chỉ số | Mục tiêu MVP |
|---|---:|
| Concurrent users | 5-20 |
| Create transfer | 5-20 TPS |
| Read API | 50-100 RPS |
| API latency p95 | < 500 ms |
| Transfer completed p95 | < 2-5 giây |
| Balance mismatch | 0 |
| Lost message | 0 |

## NFR-03: Reliability

- Message xử lý theo hướng at-least-once.
- Consumer phải idempotent.
- Retry phải có giới hạn.
- Message lỗi phải vào DLQ.
- Outbox event không được mất sau khi DB commit.

## NFR-04: Observability

- Có structured JSON logs.
- Có metrics Prometheus.
- Có trace/correlation ID xuyên qua API → DB → Outbox → Queue → Worker.
- Có dashboard Grafana hoặc dashboard nội bộ đơn giản.

## NFR-05: Maintainability

- Code chia module rõ ràng.
- Không tách microservices quá sớm.
- Ưu tiên modular monolith + worker process riêng.
- Có migration DB.
- Có integration test với PostgreSQL/RabbitMQ thật nếu có thể.

## NFR-06: Security cơ bản

- Không hardcode secret.
- Dùng `.env` hoặc Docker secret.
- Admin endpoints cần auth đơn giản.
- Không log thông tin nhạy cảm nếu sau này có dữ liệu thật.
- Rate limit cơ bản cho API tạo transfer.

---

## 5. Data model đề xuất

```mermaid
erDiagram
    ACCOUNTS ||--o{ TRANSFERS : source
    ACCOUNTS ||--o{ TRANSFERS : destination
    TRANSFERS ||--o{ LEDGER_ENTRIES : has
    TRANSFERS ||--o{ OUTBOX_EVENTS : emits
    TRANSFERS ||--o{ TRANSFER_EVENTS : timeline
    PROCESSED_MESSAGES ||--|| TRANSFER_EVENTS : deduplicate

    ACCOUNTS {
      uuid id PK
      text code UK
      text name
      text currency
      bigint available_balance_minor
      text status
      int version
      timestamptz created_at
      timestamptz updated_at
    }

    TRANSFERS {
      uuid id PK
      text client_id
      text idem_key
      uuid source_account_id FK
      uuid destination_account_id FK
      bigint amount_minor
      text currency
      text status
      text failure_code
      timestamptz created_at
      timestamptz updated_at
    }

    LEDGER_ENTRIES {
      bigserial id PK
      uuid transfer_id FK
      uuid account_id FK
      text entry_type
      text side
      bigint amount_minor
      text currency
      timestamptz created_at
    }

    OUTBOX_EVENTS {
      uuid id PK
      text aggregate_type
      uuid aggregate_id
      text event_type
      text routing_key
      jsonb payload
      int attempts
      timestamptz next_retry_at
      timestamptz published_at
      text last_error
      timestamptz created_at
    }

    PROCESSED_MESSAGES {
      text consumer_name PK
      text message_id PK
      timestamptz processed_at
    }
```

---

## 6. API endpoints MVP

## Account API

```http
POST /v1/accounts
GET /v1/accounts
GET /v1/accounts/:id
POST /v1/accounts/:id/topup
POST /v1/accounts/:id/lock
POST /v1/accounts/:id/unlock
```

## Transfer API

```http
POST /v1/transfers
GET /v1/transfers
GET /v1/transfers/:id
GET /v1/accounts/:id/transfers
GET /v1/accounts/:id/ledger
```

## Admin/Ops API

```http
GET /v1/admin/outbox
GET /v1/admin/dlq
POST /v1/admin/dlq/:messageId/replay
POST /v1/admin/reconciliation/run
GET /v1/admin/reconciliation/runs
GET /health/live
GET /health/ready
GET /metrics
```

---

# PHẦN 2: BÁO CÁO BÀI TOÁN CÓ THỂ GẶP VÀ GIẢI PHÁP

## 1. Tổng quan

Hệ thống mô phỏng transaction tuy nhỏ nhưng có nhiều vấn đề backend thực tế. Các vấn đề chính không nằm ở giao diện, mà nằm ở:

- Tính đúng đắn dữ liệu.
- Đồng thời hóa request.
- Xử lý retry.
- Không mất message.
- Không xử lý duplicate message sai cách.
- Khả năng quan sát khi hệ thống lỗi.
- Khả năng khôi phục khi một phần hệ thống chết.

Thiết kế đã đề xuất trong phần nghiên cứu trước đó dùng các nguyên tắc:

- PostgreSQL là source of truth.
- Giao dịch tiền dùng ACID transaction.
- Queue không phải source of truth.
- Event chỉ được phát sau khi DB commit thông qua transactional outbox.
- Consumer luôn idempotent.
- Retry có giới hạn và có DLQ.
- Logging/metrics/tracing được tích hợp từ đầu.
- Reconciliation được dùng để kiểm chứng dữ liệu.

---

## 2. Bài toán 1: Race condition khi nhiều request cùng chuyển tiền

### Mô tả vấn đề

Hai request cùng lúc đọc số dư account A là 100.000.

Request 1 chuyển 80.000.
Request 2 chuyển 80.000.

Nếu cả hai cùng đọc số dư cũ rồi cùng trừ, hệ thống có thể cho phép chuyển tổng 160.000 dù account chỉ có 100.000.

### Hậu quả

- Balance âm ngoài ý muốn.
- Ledger không phản ánh đúng số dư.
- Hệ thống tạo tiền hoặc mất tiền.

### Giải pháp trong thiết kế

Dùng PostgreSQL transaction và row-level lock:

```sql
SELECT id
FROM accounts
WHERE id IN (:sourceAccountId, :destinationAccountId)
ORDER BY id
FOR UPDATE;
```

Sau khi lock account, chỉ một transaction được quyền thay đổi số dư account đó tại một thời điểm.

### Vì sao giải pháp hiệu quả

- Các request cạnh tranh trên cùng account sẽ bị serialize tại database.
- Logic kiểm tra số dư và update balance nằm trong cùng DB transaction.
- Request khác phải chờ lock được release rồi mới đọc số dư mới.

---

## 3. Bài toán 2: Deadlock khi lock nhiều account

### Mô tả vấn đề

Request 1:

```text
Lock Account A
Lock Account B
```

Request 2:

```text
Lock Account B
Lock Account A
```

Hai request chờ nhau và tạo deadlock.

### Hậu quả

- Một transaction bị PostgreSQL abort.
- User nhận lỗi 500 nếu app không xử lý tốt.
- Worker có thể fail và retry nhiều lần.

### Giải pháp trong thiết kế

Luôn lock account theo thứ tự cố định, ví dụ sort theo `account_id`:

```text
orderedIds = [sourceAccountId, destinationAccountId].sort()
```

Sau đó lock theo thứ tự đó.

Ngoài ra cần retry với lỗi:

```text
40P01 - deadlock_detected
40001 - serialization_failure
```

### Vì sao giải pháp hiệu quả

- Lock ordering làm giảm mạnh khả năng deadlock.
- Retry giúp hệ thống tự phục hồi khi deadlock vẫn xảy ra trong một số tình huống hiếm.

---

## 4. Bài toán 3: Client retry tạo duplicate transfer

### Mô tả vấn đề

Client gửi request tạo transfer. Server xử lý thành công nhưng network timeout khiến client không nhận được response. Client retry request.

Nếu backend không kiểm soát, có thể tạo 2 transfer giống nhau.

### Hậu quả

- Account bị trừ tiền hai lần.
- Ledger có duplicate debit/credit.
- Người dùng mất tiền giả lập không đúng.

### Giải pháp trong thiết kế

Dùng idempotency key:

```http
Idempotency-Key: abc-123
```

Lưu vào bảng `idempotency_keys` hoặc cột unique trong `transfers`:

```sql
UNIQUE (client_id, idem_key)
```

Lưu thêm `request_hash` để phát hiện cùng key nhưng payload khác.

### Vì sao giải pháp hiệu quả

- Retry cùng request trả về kết quả cũ.
- Cùng key nhưng payload khác bị từ chối.
- Constraint trong DB đảm bảo an toàn ngay cả khi nhiều request chạy đồng thời.

---

## 5. Bài toán 4: Dual-write giữa database và message queue

### Mô tả vấn đề

Một flow sai phổ biến:

```text
1. Ghi transfer vào DB
2. Publish message vào RabbitMQ
```

Nếu DB commit thành công nhưng publish RabbitMQ fail, hệ thống có transfer trong DB nhưng không có message cho worker xử lý.

Nếu publish trước rồi DB fail, message lại trỏ đến dữ liệu chưa tồn tại.

### Hậu quả

- Transfer bị stuck.
- Event bị mất.
- Worker không xử lý giao dịch.
- Dữ liệu DB và queue lệch nhau.

### Giải pháp trong thiết kế

Dùng **transactional outbox**.

Trong cùng DB transaction:

```text
Insert transfer
Insert ledger/pending state
Insert outbox_event
Commit
```

Sau đó `worker-outbox` đọc bảng `outbox_events` và publish message ra RabbitMQ.

### Vì sao giải pháp hiệu quả

- Nếu DB commit thành công, event chắc chắn tồn tại trong DB.
- Nếu RabbitMQ fail, outbox event vẫn còn để retry.
- Queue không còn là nơi duy nhất lưu dấu vết event.

---

## 6. Bài toán 5: Message bị xử lý nhiều lần

### Mô tả vấn đề

Message queue thực tế thường hoạt động theo hướng at-least-once. Một message có thể được deliver nhiều lần nếu:

- Worker xử lý xong nhưng crash trước khi ack.
- RabbitMQ redeliver message.
- Admin replay message từ DLQ.
- Network lỗi giữa worker và broker.

### Hậu quả

- Double debit.
- Double credit.
- Transfer bị chuyển trạng thái sai.
- Projection bị ghi trùng.

### Giải pháp trong thiết kế

Dùng idempotent consumer với bảng `processed_messages`:

```sql
INSERT INTO processed_messages (consumer_name, message_id)
VALUES (:consumerName, :messageId)
ON CONFLICT DO NOTHING;
```

Nếu insert thành công, consumer xử lý message.
Nếu conflict, nghĩa là message đã xử lý, consumer ack luôn.

### Vì sao giải pháp hiệu quả

- Duplicate message không gây duplicate side effect.
- Việc kiểm tra duplicate nằm trong DB transaction cùng với side effect.
- Replay DLQ trở nên an toàn hơn.

---

## 7. Bài toán 6: Worker crash giữa chừng

### Mô tả vấn đề

Worker nhận message, bắt đầu xử lý, nhưng process chết trước khi hoàn tất.

### Hậu quả

- Message có thể bị redeliver.
- Transfer có thể ở trạng thái `PROCESSING` quá lâu.
- Một số side effect có thể đã xảy ra.

### Giải pháp trong thiết kế

- RabbitMQ dùng manual ack.
- Chỉ ack sau khi DB transaction xử lý xong.
- Consumer idempotent.
- Có stuck transfer scanner.
- Có reconciliation job.

### Vì sao giải pháp hiệu quả

- Nếu worker crash trước ack, message được redeliver.
- Nếu xử lý đã commit nhưng ack chưa kịp gửi, duplicate message vẫn an toàn nhờ `processed_messages`.
- Stuck scanner giúp phát hiện transfer bị treo.

---

## 8. Bài toán 7: Retry không kiểm soát gây quá tải hệ thống

### Mô tả vấn đề

Nếu message lỗi được retry ngay lập tức liên tục, hệ thống có thể bị retry storm.

### Hậu quả

- Worker bận xử lý lại message chắc chắn fail.
- DB bị quá tải.
- Queue backlog tăng nhanh.
- Log bị spam.

### Giải pháp trong thiết kế

Dùng retry với exponential backoff và retry limit:

```text
Retry 1: 5s
Retry 2: 30s
Retry 3: 2m
Sau đó: DLQ
```

Phân loại lỗi:

```text
Retryable: timeout, connection reset, temporary DB error
Non-retryable: invalid account, invalid state, schema error, business rule violation
```

### Vì sao giải pháp hiệu quả

- Backoff giảm áp lực khi hệ thống đang lỗi.
- Retry limit tránh message độc hại quay vòng mãi.
- DLQ giữ lại message để debug thủ công.

---

## 9. Bài toán 8: Không biết hệ thống đang lỗi ở đâu

### Mô tả vấn đề

Request đi qua nhiều bước:

```text
Next.js → NestJS API → PostgreSQL → Outbox → RabbitMQ → Worker → PostgreSQL
```

Nếu không có observability, khi transfer stuck rất khó biết lỗi ở API, DB, queue hay worker.

### Hậu quả

- Debug mất nhiều thời gian.
- Không biết message có bị mất không.
- Không biết DB lock hay worker chậm.
- Không biết queue backlog tăng khi nào.

### Giải pháp trong thiết kế

Dùng 3 nhóm observability:

1. **Structured logging** bằng Pino.
2. **Metrics** bằng Prometheus + Grafana.
3. **Tracing** bằng OpenTelemetry.

Các ID cần truyền xuyên suốt:

```text
request_id
trace_id
correlation_id
transfer_id
message_id
```

### Vì sao giải pháp hiệu quả

- Có thể trace một transfer từ HTTP request đến worker.
- Có thể thấy queue depth, DLQ count, latency, error rate.
- Có thể phát hiện bottleneck qua dashboard.

---

## 10. Bài toán 9: Balance projection lệch với ledger

### Mô tả vấn đề

Bảng `accounts.available_balance_minor` là projection để đọc nhanh. Nếu có bug trong update balance, projection có thể lệch với ledger.

### Hậu quả

- UI hiển thị sai số dư.
- Transfer sau đó ra quyết định dựa trên số dư sai.
- Dữ liệu không còn đáng tin.

### Giải pháp trong thiết kế

Dùng ledger là nguồn kiểm chứng và chạy reconciliation:

```sql
SELECT account_id, SUM(
  CASE
    WHEN side = 'CREDIT' THEN amount_minor
    WHEN side = 'DEBIT' THEN -amount_minor
  END
) AS computed_balance
FROM ledger_entries
GROUP BY account_id;
```

So sánh `computed_balance` với `accounts.available_balance_minor`.

### Vì sao giải pháp hiệu quả

- Ledger bất biến giúp truy vết lại lịch sử.
- Reconciliation phát hiện drift.
- Có thể tạo admin report để sửa dữ liệu trong môi trường mô phỏng.

---

## 11. Bài toán 10: Migration gây lock hoặc downtime

### Mô tả vấn đề

Một migration như thêm index lớn hoặc alter table có thể lock bảng, khiến API bị treo.

### Hậu quả

- API latency tăng mạnh.
- Request timeout.
- Worker không ghi DB được.

### Giải pháp trong thiết kế

- Không dùng `synchronize: true` trong production.
- Dùng migration có kiểm soát.
- Dùng expand-and-contract pattern.
- Với index lớn, dùng `CREATE INDEX CONCURRENTLY`.
- Chạy migration nặng ở thời điểm ít tải.

### Vì sao giải pháp hiệu quả

- Giảm lock thời gian dài.
- Cho phép deploy thay đổi schema an toàn hơn.
- Phù hợp khi sau này app có dữ liệu lớn hơn.

---

## 12. Bài toán 11: VPS nhỏ bị thiếu tài nguyên

### Mô tả vấn đề

Trên VPS 2 vCPU / 4 GB RAM, bạn chạy nhiều service:

```text
Next.js
NestJS API
Worker
PostgreSQL
RabbitMQ
Redis
Prometheus
Grafana
```

Nếu cấu hình không hợp lý, máy có thể hết RAM hoặc CPU cao liên tục.

### Hậu quả

- OOM kill.
- PostgreSQL chậm.
- Queue backlog tăng.
- API timeout.

### Giải pháp trong thiết kế

- Giữ kiến trúc nhỏ.
- Dùng Docker Compose.
- Giới hạn connection pool.
- Giới hạn worker concurrency/prefetch.
- Monitoring CPU/RAM/disk.
- Không chạy stack logging quá nặng ở giai đoạn đầu.
- Có thể dùng managed Postgres nếu muốn giảm tải VPS.

### Vì sao giải pháp hiệu quả

- Tránh over-engineering.
- Giữ chi phí thấp.
- Dễ debug vì số lượng runtime process ít.

---

# PHẦN 3: TÀI LIỆU KIẾN TRÚC HỆ THỐNG

## 1. Kiến trúc tổng quan

Kiến trúc đề xuất là **modular monolith ở tầng code**, nhưng **tách runtime process** cho API và worker.

Điều này phù hợp với một dev đơn lẻ vì:

- Không phải vận hành nhiều microservice phức tạp.
- Vẫn học được queue, worker, outbox, monitoring.
- Codebase dễ quản lý.
- Dễ deploy lên VPS giá rẻ bằng Docker Compose.

---

## 2. Component diagram

```mermaid
flowchart LR
    User[User / Admin] --> Web[Next.js Web UI]
    Web --> API[NestJS API]

    API --> PG[(PostgreSQL)]
    API --> Redis[(Redis Cache)]

    PG --> OutboxWorker[NestJS Outbox Worker]
    OutboxWorker --> RabbitMQ[(RabbitMQ)]

    RabbitMQ --> ProcessingWorker[NestJS Processing Worker]
    ProcessingWorker --> PG
    ProcessingWorker --> Redis

    API --> Metrics[Prometheus Metrics Endpoint]
    ProcessingWorker --> Metrics
    OutboxWorker --> Metrics

    Metrics --> Prometheus[Prometheus]
    Prometheus --> Grafana[Grafana]

    API --> Logs[JSON Logs]
    ProcessingWorker --> Logs
    OutboxWorker --> Logs

    Logs --> LokiOrFile[File logs / Loki optional]
```

---

## 3. Runtime containers

| Container | Công nghệ | Vai trò |
|---|---|---|
| `web` | Next.js | UI thao tác account, transfer, dashboard |
| `api` | NestJS | REST API, validation, transaction, query |
| `worker-outbox` | NestJS | Đọc `outbox_events`, publish message sang RabbitMQ |
| `worker-processing` | NestJS | Consume message, xử lý transfer, retry/DLQ |
| `postgres` | PostgreSQL | Source of truth |
| `rabbitmq` | RabbitMQ | Message broker |
| `redis` | Redis | Cache read-side, optional locking primitive |
| `prometheus` | Prometheus | Metrics collection |
| `grafana` | Grafana | Dashboard |
| `nginx/caddy` | Reverse proxy | TLS, route traffic |

---

## 4. Logical module architecture trong NestJS

```text
src/
  main-api.ts
  main-worker-outbox.ts
  main-worker-processing.ts

  modules/
    accounts/
      accounts.controller.ts
      accounts.service.ts
      account.entity.ts

    transfers/
      transfers.controller.ts
      transfers.service.ts
      transfer.entity.ts
      transfer-locking.service.ts

    ledger/
      ledger.service.ts
      ledger-entry.entity.ts

    idempotency/
      idempotency.service.ts
      idempotency-key.entity.ts

    outbox/
      outbox.service.ts
      outbox-worker.ts
      outbox-event.entity.ts

    messaging/
      rabbitmq.publisher.ts
      rabbitmq.consumer.ts
      event-contracts.ts

    reconciliation/
      reconciliation.service.ts
      reconciliation.controller.ts

    observability/
      logger.module.ts
      metrics.module.ts
      tracing.ts

    admin/
      dlq.controller.ts
      ops.controller.ts
```

---

## 5. Luồng tạo transfer

```mermaid
sequenceDiagram
    participant User as User
    participant Web as Next.js UI
    participant API as NestJS API
    participant PG as PostgreSQL
    participant Outbox as Outbox Worker
    participant MQ as RabbitMQ
    participant Worker as Processing Worker

    User->>Web: Submit transfer form
    Web->>API: POST /v1/transfers + Idempotency-Key

    API->>PG: BEGIN
    API->>PG: Check idempotency key
    API->>PG: Lock source and destination accounts
    API->>PG: Validate balance and status
    API->>PG: Insert transfer
    API->>PG: Insert ledger entries or pending state
    API->>PG: Insert outbox event
    API->>PG: COMMIT

    API-->>Web: 201 Created / 202 Accepted

    Outbox->>PG: Pick pending outbox events
    Outbox->>MQ: Publish transfer.created
    Outbox->>PG: Mark event as published

    MQ->>Worker: Deliver transfer.created
    Worker->>PG: BEGIN
    Worker->>PG: Check processed_messages
    Worker->>PG: Process transfer state
    Worker->>PG: Insert transfer event timeline
    Worker->>PG: COMMIT
    Worker->>MQ: ACK
```

---

## 6. Luồng idempotency

```mermaid
flowchart TD
    A[Receive POST /transfers] --> B[Read Idempotency-Key]
    B --> C{Key exists?}

    C -- No --> D[Insert key + request_hash]
    D --> E[Create transfer]
    E --> F[Store response summary]
    F --> G[Return new response]

    C -- Yes --> H{Payload hash same?}
    H -- Yes --> I[Return previous response]
    H -- No --> J[Return 409 Conflict]
```

---

## 7. Luồng retry và DLQ

```mermaid
flowchart TD
    A[Worker receives message] --> B[Process message]
    B --> C{Success?}

    C -- Yes --> D[ACK message]
    C -- No --> E{Retryable error?}

    E -- No --> F[Send to DLQ]
    E -- Yes --> G{Attempts < max?}

    G -- Yes --> H[Send to retry queue with delay]
    H --> I[Return to main queue]
    I --> A

    G -- No --> F

    F --> J[Admin reviews DLQ]
    J --> K{Replay?}
    K -- Yes --> I
    K -- No --> L[Mark ignored]
```

---

## 8. Luồng reconciliation

```mermaid
flowchart TD
    A[Start reconciliation job] --> B[Calculate balance from ledger]
    B --> C[Compare with accounts.available_balance]
    C --> D{Mismatch?}

    D -- No --> E[Mark check as PASSED]
    D -- Yes --> F[Create reconciliation issue]

    A --> G[Find SUCCESS transfers without full ledger]
    G --> H[Find stuck PENDING/PROCESSING transfers]
    H --> I[Find old unpublished outbox events]
    I --> J[Save reconciliation report]
```

---

## 9. Database design chi tiết

## 9.1. `accounts`

Lưu trạng thái hiện tại của account.

```sql
CREATE TABLE accounts (
  id UUID PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  currency CHAR(3) NOT NULL,
  available_balance_minor BIGINT NOT NULL DEFAULT 0,
  status TEXT NOT NULL,
  version INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (available_balance_minor >= 0),
  CHECK (status IN ('ACTIVE', 'LOCKED', 'CLOSED'))
);
```

## 9.2. `transfers`

Lưu command chuyển tiền và trạng thái hiện tại.

```sql
CREATE TABLE transfers (
  id UUID PRIMARY KEY,
  client_id TEXT NOT NULL,
  idem_key TEXT NOT NULL,
  request_hash TEXT NOT NULL,
  source_account_id UUID NOT NULL REFERENCES accounts(id),
  destination_account_id UUID NOT NULL REFERENCES accounts(id),
  amount_minor BIGINT NOT NULL,
  currency CHAR(3) NOT NULL,
  status TEXT NOT NULL,
  failure_code TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (client_id, idem_key),
  CHECK (amount_minor > 0),
  CHECK (source_account_id <> destination_account_id),
  CHECK (status IN ('PENDING', 'PROCESSING', 'SUCCESS', 'FAILED', 'REVERSED'))
);
```

## 9.3. `ledger_entries`

Lưu sổ cái bất biến.

```sql
CREATE TABLE ledger_entries (
  id BIGSERIAL PRIMARY KEY,
  transfer_id UUID REFERENCES transfers(id),
  account_id UUID NOT NULL REFERENCES accounts(id),
  entry_type TEXT NOT NULL,
  side TEXT NOT NULL,
  amount_minor BIGINT NOT NULL,
  currency CHAR(3) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (amount_minor > 0),
  CHECK (side IN ('DEBIT', 'CREDIT'))
);
```

## 9.4. `outbox_events`

Lưu event cần publish sau khi DB commit.

```sql
CREATE TABLE outbox_events (
  id UUID PRIMARY KEY,
  aggregate_type TEXT NOT NULL,
  aggregate_id UUID NOT NULL,
  event_type TEXT NOT NULL,
  routing_key TEXT NOT NULL,
  payload JSONB NOT NULL,
  attempts INT NOT NULL DEFAULT 0,
  next_retry_at TIMESTAMPTZ,
  published_at TIMESTAMPTZ,
  locked_at TIMESTAMPTZ,
  last_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_outbox_pending
ON outbox_events (created_at)
WHERE published_at IS NULL;
```

## 9.5. `processed_messages`

Chống duplicate message processing.

```sql
CREATE TABLE processed_messages (
  consumer_name TEXT NOT NULL,
  message_id TEXT NOT NULL,
  processed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (consumer_name, message_id)
);
```

---

## 10. Công nghệ đề xuất

| Layer | Công nghệ | Ghi chú |
|---|---|---|
| Frontend | Next.js | UI mỏng, dashboard, form tạo transfer |
| Backend API | NestJS | REST API, module rõ ràng |
| Database | PostgreSQL | Source of truth, transaction, locking |
| ORM/Query | TypeORM hoặc Prisma + raw SQL | Với transaction/locking nên dùng raw SQL khi cần |
| Message Queue | RabbitMQ | Phù hợp worker queue, retry, DLQ |
| Cache | Redis | Chỉ dùng cho read cache, không làm source of truth |
| Logging | Pino / nestjs-pino | Structured JSON logs |
| Metrics | Prometheus + Grafana | Dashboard và alert cơ bản |
| Tracing | OpenTelemetry | Trace request qua API/worker |
| Deployment | Docker Compose | Phù hợp VPS giá rẻ |
| Reverse Proxy | Caddy hoặc Nginx | TLS, routing |
| Testing | Jest + Testcontainers + k6 | Unit, integration, load test |

---

## 11. Deployment architecture giá rẻ

## 11.1. Baseline VPS

```mermaid
flowchart TD
    Internet[Internet] --> Proxy[Caddy / Nginx]
    Proxy --> Web[Next.js Container]
    Proxy --> API[NestJS API Container]

    API --> Postgres[(PostgreSQL Container)]
    API --> Redis[(Redis Container)]
    API --> RabbitMQ[(RabbitMQ Container)]

    Outbox[Outbox Worker Container] --> Postgres
    Outbox --> RabbitMQ

    Worker[Processing Worker Container] --> RabbitMQ
    Worker --> Postgres
    Worker --> Redis

    Prometheus[Prometheus Container] --> API
    Prometheus --> Worker
    Prometheus --> Outbox
    Grafana[Grafana Container] --> Prometheus
```

### Cấu hình mục tiêu

```text
VPS: 2 vCPU / 4 GB RAM / 40-80 GB SSD
OS: Ubuntu LTS
Runtime: Docker + Docker Compose
TLS: Caddy automatic HTTPS hoặc Nginx + Certbot
```

### Target hiệu năng

```text
Create transfer: 5-20 TPS
Read API: 50-100 RPS
p95 API latency: < 500ms
p95 transfer completed: < 2-5s
Balance mismatch: 0
Lost message: 0
```

---

## 12. Docker Compose phác thảo

```yaml
services:
  web:
    build:
      context: .
      target: web-runner
    environment:
      NEXT_PUBLIC_API_BASE_URL: https://api.example.com
    depends_on:
      - api

  api:
    build:
      context: .
      target: api-runner
    environment:
      DATABASE_URL: postgres://postgres:postgres@postgres:5432/txsim
      RABBITMQ_URL: amqp://guest:guest@rabbitmq:5672
      REDIS_URL: redis://redis:6379
    depends_on:
      postgres:
        condition: service_healthy
      rabbitmq:
        condition: service_healthy
      redis:
        condition: service_started

  worker-outbox:
    build:
      context: .
      target: worker-runner
    command: node dist/main-worker-outbox.js
    environment:
      DATABASE_URL: postgres://postgres:postgres@postgres:5432/txsim
      RABBITMQ_URL: amqp://guest:guest@rabbitmq:5672
    depends_on:
      postgres:
        condition: service_healthy
      rabbitmq:
        condition: service_healthy

  worker-processing:
    build:
      context: .
      target: worker-runner
    command: node dist/main-worker-processing.js
    environment:
      DATABASE_URL: postgres://postgres:postgres@postgres:5432/txsim
      RABBITMQ_URL: amqp://guest:guest@rabbitmq:5672
      REDIS_URL: redis://redis:6379
    depends_on:
      postgres:
        condition: service_healthy
      rabbitmq:
        condition: service_healthy

  postgres:
    image: postgres:17
    environment:
      POSTGRES_DB: txsim
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
    volumes:
      - pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres -d txsim"]
      interval: 10s
      timeout: 5s
      retries: 10

  rabbitmq:
    image: rabbitmq:4-management
    ports:
      - "15672:15672"
    healthcheck:
      test: ["CMD", "rabbitmq-diagnostics", "ping"]
      interval: 10s
      timeout: 5s
      retries: 10

  redis:
    image: redis:7

  prometheus:
    image: prom/prometheus
    volumes:
      - ./ops/prometheus.yml:/etc/prometheus/prometheus.yml

  grafana:
    image: grafana/grafana
    ports:
      - "3001:3000"
    volumes:
      - grafana-data:/var/lib/grafana

volumes:
  pgdata:
  grafana-data:
```

---

## 13. Chiến lược testing

## 13.1. Unit test

Tập trung test:

- Validate transfer input.
- Idempotency logic.
- Balance calculation.
- Retry classification.

## 13.2. Integration test

Dùng PostgreSQL thật qua Docker/Testcontainers.

Test bắt buộc:

```text
Tạo transfer thành công
Không đủ tiền thì fail
Retry cùng idempotency key không tạo duplicate
Nhiều request đồng thời không làm sai balance
Ledger khớp với account balance
Outbox event được tạo cùng transaction
Consumer duplicate message không tạo side effect trùng
```

## 13.3. Load test

Dùng k6 hoặc autocannon.

Test đề xuất:

```text
50 RPS read API trong 5 phút
5 TPS create transfer trong 10 phút
10 TPS transfer trên cùng một nhóm account để test lock contention
1000 request duplicate Idempotency-Key
Kill worker khi queue đang xử lý
Replay DLQ
Run reconciliation sau load test
```

Pass condition:

```text
0 balance mismatch
0 missing ledger entry
0 duplicate transfer ngoài idempotency rule
queue backlog giảm về 0 sau khi dừng load
DLQ replay không tạo double debit/credit
```

---

## 14. Roadmap triển khai

## Phase 1: Core transaction

- Setup monorepo hoặc repo chuẩn.
- Setup Next.js + NestJS.
- Setup PostgreSQL bằng Docker Compose.
- Tạo account API.
- Tạo topup API.
- Tạo transfer API.
- Implement DB transaction + row lock.
- Implement ledger.
- Implement idempotency.

## Phase 2: Async processing

- Setup RabbitMQ.
- Implement outbox table.
- Implement outbox worker.
- Implement processing worker.
- Implement retry và DLQ.
- Implement admin replay DLQ.

## Phase 3: Observability

- Structured logging.
- Prometheus metrics.
- Grafana dashboard.
- Health check.
- OpenTelemetry tracing cơ bản.

## Phase 4: Reconciliation và hardening

- Reconciliation job.
- Stuck transfer scanner.
- Load test.
- Backup script.
- Deployment lên VPS.
- CI/CD cơ bản.

---

## 15. Kết luận kiến trúc

Thiết kế này phù hợp cho một dev đơn lẻ vì giữ được cân bằng:

- Đủ nhỏ để làm được.
- Đủ thực tế để học backend nâng cao.
- Đủ nhiều lỗi mô phỏng để luyện vận hành.
- Đủ rẻ để deploy trên VPS phổ biến.
- Đủ rõ ràng để mở rộng sau này.

Trọng tâm của hệ thống không phải là UI đẹp hay scale cực lớn. Trọng tâm là:

```text
Dữ liệu đúng
Transaction an toàn
Message không mất
Retry kiểm soát được
Duplicate không gây sai dữ liệu
Có log/metric/trace để debug
Có reconciliation để tự kiểm chứng
```


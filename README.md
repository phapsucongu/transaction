# Transaction Simulator

Transaction Simulator là một dự án mô phỏng hệ thống giao dịch tài khoản. Mục tiêu chính của dự án là xây dựng backend có khả năng xử lý chuyển tiền an toàn, ghi nhận lịch sử giao dịch, chống xử lý trùng request và xử lý event bất đồng bộ bằng message queue.

Dự án tập trung vào các bài toán backend thường gặp trong hệ thống tài chính như database transaction, ledger, idempotency, transactional outbox, retry, DLQ và reconciliation.

---

## Tech Stack

### Backend

- **NestJS + TypeScript**: dùng để xây dựng REST API có cấu trúc module rõ ràng, dễ mở rộng và dễ tách các phần như Auth, Accounts, Transfers, Workers, Admin.
- **PostgreSQL**: dùng làm database chính vì cần transaction mạnh, row-level locking và dữ liệu nhất quán cho các thao tác liên quan đến tiền.
- **RabbitMQ**: dùng để xử lý event bất đồng bộ giữa API và worker, giúp tách luồng xử lý chính khỏi các tác vụ nền.
- **JWT + bcryptjs**: dùng cho authentication, authorization và bảo vệ mật khẩu người dùng.
- **Docker Compose**: dùng để chạy PostgreSQL và RabbitMQ trong môi trường local.

---

## Kiến trúc hệ thống

```txt
Client / Frontend
      |
      v
NestJS REST API
      |
      |-- Auth / Role
      |-- Accounts
      |-- Topup
      |-- Transfers
      |
      v
PostgreSQL
      |
      |-- accounts
      |-- transfers
      |-- ledger_entries
      |-- outbox_events
      |-- processed_messages
      |
      v
Outbox Worker
      |
      v
RabbitMQ Exchange: txsim.events
      |
      v
Queue: txsim.transfer.events
      |
      v
Processing Worker
      |
      v
Retry Queue / DLQ / processed_messages
```

---


### 1. PostgreSQL transaction

Các thao tác liên quan đến tiền không được phép chỉ thành công một phần. Ví dụ một giao dịch chuyển tiền phải đảm bảo source account bị trừ tiền, destination account được cộng tiền, ledger được ghi và transfer được cập nhật trong cùng một transaction.

Nếu có lỗi ở bất kỳ bước nào, toàn bộ thao tác phải rollback.

```txt
BEGIN
  lock accounts
  update balances
  insert ledger entries
  update transfer
  insert outbox event
COMMIT
```

Cách này giúp tránh tình trạng balance bị lệch hoặc ledger bị thiếu.

---

### 2. Ledger để lưu lịch sử biến động tiền

Dự án không chỉ lưu số dư hiện tại trong bảng `accounts`, mà còn ghi mọi biến động vào `ledger_entries`.

Ví dụ một transfer thành công tạo 2 ledger entries:

```txt
Source account      DEBIT
Destination account CREDIT
```

Ledger giúp hệ thống có thể:

- Truy vết lịch sử giao dịch.
- Kiểm tra số dư.
- Debug lỗi.
- Chạy reconciliation để phát hiện lệch balance.

---

### 3. Idempotency để chống xử lý trùng request

Khi client gửi request chuyển tiền, có thể xảy ra timeout hoặc mất kết nối. Client có thể retry cùng request đó.

Nếu không có idempotency, cùng một request có thể bị xử lý nhiều lần và gây trừ tiền nhiều lần.

Dự án dùng `Idempotency-Key` kết hợp với `client_id` và `request_hash` để đảm bảo:

```txt
Cùng key + cùng body  -> trả lại kết quả cũ
Cùng key + khác body  -> trả 409 Conflict
```

---

### 4. Transactional Outbox 

API không publish trực tiếp sang RabbitMQ. Thay vào đó, API insert event vào bảng `outbox_events` trong cùng transaction với transfer.

Lý do là nếu database commit thành công nhưng publish RabbitMQ thất bại, hệ thống sẽ mất event. Transactional Outbox giải quyết vấn đề này bằng cách lưu event trong database trước, sau đó worker publish event ra RabbitMQ.

```txt
Transfer API
  -> update balance + ledger
  -> insert outbox_events
  -> commit

Outbox Worker
  -> đọc outbox_events
  -> publish RabbitMQ
  -> set published_at
```

---

### 5. RabbitMQ 

RabbitMQ được dùng để tách phần xử lý chính của API khỏi các tác vụ nền.

Sau khi transfer thành công, API chỉ cần ghi outbox event. Outbox Worker sẽ publish event sang RabbitMQ, sau đó Processing Worker consume event để xử lý tiếp.

Kiến trúc RabbitMQ gồm:

```txt
txsim.events                    topic exchange
txsim.transfer.events           main queue
txsim.transfer.events.retry     retry queue
txsim.transfer.events.dlq       dead letter queue
```

Cách này giúp hệ thống dễ mở rộng thêm worker hoặc thêm event mới sau này.

---

### 6. Retry Queue và DLQ 

Nếu worker xử lý message lỗi, không nên đưa message quay lại main queue ngay lập tức vì có thể gây retry vô hạn.

Thay vào đó, message lỗi được đưa vào retry queue, chờ một khoảng thời gian rồi quay lại main queue để xử lý lại.

Nếu lỗi quá số lần cho phép, message được đưa vào DLQ.

```txt
Main Queue
  -> Processing Worker
  -> Error
  -> Retry Queue
  -> wait TTL
  -> Main Queue
  -> retry
  -> too many failures
  -> DLQ
```

DLQ giúp admin có thể kiểm tra message lỗi và replay sau khi đã sửa nguyên nhân lỗi.

---

### 7. Reconciliation để kiểm tra tính đúng đắn dữ liệu

Reconciliation API dùng để kiểm tra số dư hiện tại trong `accounts` có khớp với tổng ledger hay không.

Logic chính:

```txt
accounts.available_balance_minor == SUM(CREDIT) - SUM(DEBIT)
```

Nếu có lệch, hệ thống trả về danh sách account bị mismatch. Đây là bước quan trọng trong các hệ thống liên quan đến tiền vì balance hiện tại phải luôn có thể giải thích được từ ledger.

---

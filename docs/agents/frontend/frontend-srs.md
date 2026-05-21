# Frontend SRS

## 1. Giới thiệu

### 1.1 Tên frontend

**Transaction Simulator Web UI**

### 1.2 Mục tiêu

Frontend cung cấp giao diện web để người dùng thao tác với backend Transaction Simulator:

- Đăng nhập và quản lý phiên làm việc.
- Điều hướng theo quyền.
- Xem và thao tác account giả lập.
- Nạp tiền giả lập.
- Tạo transfer giữa hai account.
- Xem trạng thái, timeline và lịch sử giao dịch.
- Xem ledger theo account.

Frontend tập trung vào **tính rõ ràng, dễ dùng, dễ debug**, không tập trung vào thiết kế phức tạp.

### 1.3 Phạm vi hiện tại

Phạm vi frontend giai đoạn này bám theo các chức năng backend đã ưu tiên:

- FR-01: Quản lý tài khoản giả lập.
- FR-02: Nạp số dư giả lập.
- FR-03: Tạo giao dịch chuyển tiền.
- FR-04: Xử lý idempotency ở luồng tạo transfer.
- FR-05: Xem ledger/sổ cái.
- FR-06: Xem trạng thái và lịch sử giao dịch.
- Bổ sung: Xác thực và phân quyền tài khoản.

### 1.4 Ngoài phạm vi hiện tại

Frontend giai đoạn này chưa cần làm sâu:

- Dashboard vận hành queue/outbox/DLQ.
- Replay DLQ.
- Reconciliation UI đầy đủ.
- Prometheus/Grafana embedded dashboard.
- Quản trị user nâng cao.
- KYC/AML.
- Mobile app.
- Multi-language.
- Dark mode bắt buộc.
- UI realtime bằng WebSocket.

Có thể để placeholder menu disabled hoặc ghi “Coming soon” cho các chức năng ops nếu backend đã có nhưng chưa cần UI.

## 2. Người dùng và quyền

### 2.1 Role dự kiến

Agent phải đối soát role thật trong backend. Nếu chưa rõ, dùng role dự kiến sau để thiết kế UI, nhưng không hardcode vĩnh viễn:

| Role | Mô tả | Quyền UI dự kiến |
|---|---|---|
| `ADMIN` | Người quản trị/demo chính | Toàn quyền trong frontend |
| `OPERATOR` | Người thao tác nghiệp vụ giả lập | Xem account, topup, tạo transfer, xem ledger/transfer |
| `VIEWER` | Người xem demo | Chỉ xem list/detail/history |

Nếu backend chỉ có role khác, agent phải cập nhật route matrix và guard theo backend thật.

### 2.2 Nguyên tắc phân quyền frontend

- Frontend chỉ giúp ẩn/hiện UI và redirect route.
- Backend vẫn là nguồn phân quyền cuối cùng.
- Nếu backend trả `401`, chuyển về login.
- Nếu backend trả `403`, hiển thị trang không đủ quyền.
- Không tin dữ liệu role lưu local nếu chưa xác minh qua `/me` hoặc endpoint tương đương.

## 3. Yêu cầu chức năng

## FE-FR-01: Đăng nhập

### Mô tả

Người dùng có thể đăng nhập vào hệ thống để sử dụng frontend.

### UI

Route đề xuất:

```text
/login
```

Form gồm:

- Email/username.
- Password.
- Submit button.
- Error alert khi sai thông tin.
- Loading state.

### Acceptance Criteria

- Validate required fields.
- Không log password.
- Sau login thành công, gọi hoặc cập nhật session user.
- Redirect về trang người dùng định truy cập trước đó hoặc dashboard.
- Nếu đã login mà vào `/login`, redirect về dashboard.

## FE-FR-02: Đăng xuất

### Mô tả

Người dùng có thể đăng xuất.

### UI

- Menu user ở app bar.
- Nút logout.

### Acceptance Criteria

- Gọi logout endpoint nếu backend có.
- Clear client session state phù hợp.
- Invalidate TanStack Query cache liên quan user.
- Redirect về `/login`.

## FE-FR-03: Lấy thông tin phiên hiện tại

### Mô tả

Frontend cần biết user hiện tại và role để guard route.

### API dự kiến

Agent phải đối soát backend thật. Endpoint thường gặp:

```http
GET /v1/auth/me
GET /v1/users/me
```

### Acceptance Criteria

- Khi app load, kiểm tra session.
- Trạng thái loading không flash nội dung private.
- `401` thì xem như chưa login.
- User info được cache nhưng phải invalidate sau logout.

## FE-FR-04: Route guard

### Mô tả

Các route private phải yêu cầu đăng nhập.

### Route private

```text
/
/dashboard
/accounts
/accounts/:id
/transfers
/transfers/:id
/ledger
```

### Acceptance Criteria

- Chưa login vào private route thì redirect `/login`.
- Lưu return URL nếu phù hợp.
- Không render dữ liệu private trước khi xác minh session.

## FE-FR-05: Role guard

### Mô tả

Các action cần quyền cao phải được bảo vệ ở UI.

### Action dự kiến cần quyền

| Action | Role dự kiến |
|---|---|
| Create account | `ADMIN`, `OPERATOR` nếu backend cho phép |
| Topup account | `ADMIN`, `OPERATOR` |
| Lock/unlock/close account | `ADMIN` |
| Create transfer | `ADMIN`, `OPERATOR` |
| View list/detail | `ADMIN`, `OPERATOR`, `VIEWER` |

### Acceptance Criteria

- Nút/action bị ẩn hoặc disabled nếu thiếu quyền.
- Route bị cấm hiển thị trang `403`.
- Nếu backend trả `403`, hiển thị message rõ ràng.

## FE-FR-06: Dashboard tổng quan

### Mô tả

Trang đầu sau login hiển thị tổng quan đơn giản.

### UI

Route:

```text
/dashboard
```

Card đề xuất:

- Tổng số account.
- Số account active/locked/closed nếu API hỗ trợ.
- Tổng số transfer gần đây nếu API hỗ trợ.
- Link nhanh: Create Account, Create Transfer, Transfers, Accounts.

### Acceptance Criteria

- Không yêu cầu backend phải có endpoint tổng hợp.
- Nếu không có stats API, frontend có thể lấy dữ liệu list page đầu hoặc hiển thị quick actions.
- Có loading/error/empty state.

## FE-FR-07: Danh sách account

### Mô tả

Người dùng xem danh sách account giả lập.

### UI

Route:

```text
/accounts
```

Bảng cột đề xuất:

- Code.
- Name.
- Currency.
- Available balance.
- Status.
- Created at.
- Actions.

Filter đề xuất:

- Search theo code/name nếu backend hỗ trợ.
- Status.
- Currency.
- Pagination.

### Acceptance Criteria

- Có loading skeleton hoặc spinner.
- Có empty state.
- Có error state kèm retry.
- Balance hiển thị từ minor unit integer.
- Status dùng MUI Chip.
- Click row hoặc action để vào detail.

## FE-FR-08: Tạo account

### Mô tả

Người dùng có quyền có thể tạo account giả lập.

### UI

Có thể dùng:

```text
/accounts/new
```

hoặc dialog trong `/accounts`.

Form gồm:

- Code.
- Name.
- Currency.

### Acceptance Criteria

- Validate required.
- Validate currency 3 ký tự hoặc theo enum backend.
- Sau create thành công, invalidate accounts query.
- Redirect tới detail hoặc đóng dialog và reload list.
- Hiển thị lỗi duplicate code nếu backend trả về.

## FE-FR-09: Chi tiết account

### Mô tả

Người dùng xem chi tiết account.

### UI

Route:

```text
/accounts/:id
```

Thông tin:

- Code, name, currency, status.
- Available balance.
- Created/updated at.
- Action buttons: Topup, Lock, Unlock, Close nếu có quyền.
- Tabs:
  - Overview.
  - Ledger.
  - Transfers.

### Acceptance Criteria

- Có loading/error state.
- Status action invalidate account detail và list.
- Ledger tab và Transfers tab có pagination.
- Không cho thao tác nếu account `CLOSED` hoặc backend không cho phép.

## FE-FR-10: Nạp tiền giả lập

### Mô tả

Người dùng có quyền có thể topup account.

### UI

Dialog trên account detail.

Form:

- Amount.
- Optional reference/note nếu backend có.
- Confirm button.

### Acceptance Criteria

- Amount phải là số nguyên minor unit hoặc input tiền được convert an toàn sang minor unit.
- Không dùng float cho logic tiền.
- Amount > 0.
- Sau topup thành công:
  - Invalidate account detail.
  - Invalidate ledger account.
  - Invalidate account list.
- Hiển thị success snackbar.

## FE-FR-11: Tạo transfer

### Mô tả

Người dùng có quyền tạo giao dịch chuyển tiền giữa hai account.

### UI

Route:

```text
/transfers/new
```

Form:

- Source account.
- Destination account.
- Amount.
- Currency.
- Reference nếu backend hỗ trợ.
- Scenario nếu backend vẫn cho test scenario ở frontend; mặc định `normal`.

### Header bắt buộc theo backend

Nếu backend yêu cầu, frontend phải gửi:

```http
Idempotency-Key: <uuid>
X-Request-Id: <uuid>
```

### Acceptance Criteria

- Source và destination không được trùng.
- Amount > 0.
- Currency khớp lựa chọn account nếu frontend có đủ dữ liệu.
- Khi submit, disable button để tránh double click.
- Mỗi lần submit mới tạo một idempotency key ổn định cho attempt đó.
- Nếu network timeout và user retry cùng form submission, không tự tạo request trùng ngoài kiểm soát.
- Sau thành công, redirect tới transfer detail hoặc list.
- Hiển thị trạng thái `PENDING`/`SUCCESS`/`FAILED` theo response thật.

## FE-FR-12: Danh sách transfer

### Mô tả

Người dùng xem danh sách transfer có phân trang và filter.

### UI

Route:

```text
/transfers
```

Bảng cột đề xuất:

- Transfer ID short.
- Source account.
- Destination account.
- Amount.
- Currency.
- Status.
- Created at.
- Updated at.
- Actions.

Filter:

- Status.
- Account.
- Date range.
- Reference nếu backend hỗ trợ.

### Acceptance Criteria

- Query params trên URL nên phản ánh filter/pagination để reload không mất trạng thái.
- Có loading/error/empty state.
- Status hiển thị rõ bằng Chip.
- Click vào detail.

## FE-FR-13: Chi tiết transfer

### Mô tả

Người dùng xem chi tiết transfer và timeline xử lý.

### UI

Route:

```text
/transfers/:id
```

Thông tin:

- ID.
- Source/destination account.
- Amount/currency.
- Status.
- Failure code/message nếu có.
- Created/updated at.
- Reference.
- Timeline events nếu backend trả.
- Ledger entries liên quan nếu backend trả hoặc link tới ledger.

### Acceptance Criteria

- Có nút refresh.
- Nếu transfer đang `PENDING` hoặc `PROCESSING`, có thể refetch định kỳ nhẹ hoặc nút refresh thủ công.
- Timeline hiển thị theo thứ tự thời gian.
- Failure state dễ nhìn.

## FE-FR-14: Ledger theo account

### Mô tả

Người dùng xem ledger entries của một account.

### UI

Có thể ở:

```text
/accounts/:id?tab=ledger
/accounts/:id/ledger
```

Cột đề xuất:

- Created at.
- Entry type.
- Side.
- Amount.
- Currency.
- Transfer ID.
- Balance impact.

### Acceptance Criteria

- Ledger là read-only.
- Không có action sửa/xóa ledger.
- Có pagination.
- DEBIT/CREDIT hiển thị dễ phân biệt.
- Link sang transfer detail nếu có `transfer_id`.

## FE-FR-15: Lịch sử transfer theo account

### Mô tả

Người dùng xem các transfer liên quan tới account.

### UI

Có thể ở:

```text
/accounts/:id?tab=transfers
/accounts/:id/transfers
```

### Acceptance Criteria

- Có pagination.
- Hiển thị account đó là source hay destination.
- Link tới transfer detail.
- Filter status/date nếu backend hỗ trợ.

## FE-FR-16: Xử lý lỗi API thống nhất

### Mô tả

Frontend cần hiển thị lỗi backend dễ hiểu.

### Acceptance Criteria

- `400`: hiển thị lỗi validation/business.
- `401`: redirect login hoặc yêu cầu đăng nhập lại.
- `403`: trang hoặc alert không đủ quyền.
- `404`: not found page/state.
- `409`: hiển thị conflict, đặc biệt idempotency payload mismatch.
- `500`: generic error kèm request id nếu response có.
- Không hiển thị stack trace backend cho user thường.

## FE-FR-17: Layout chính

### Mô tả

Ứng dụng có layout nhất quán.

### Thành phần

- App bar.
- Sidebar hoặc navigation drawer.
- User menu.
- Breadcrumb/title.
- Main content.
- Snackbar/Toast global.
- Loading indicator khi route hoặc mutation đang xử lý.

### Acceptance Criteria

- Responsive ở mức desktop/tablet.
- Mobile không cần tối ưu sâu nhưng không vỡ layout nghiêm trọng.
- Navigation item ẩn/disabled theo quyền.

## 4. Yêu cầu phi chức năng

## NFR-01: Correctness

- Frontend không tự tính business outcome của transfer.
- Frontend không tự sửa balance.
- Frontend không dùng float để biểu diễn tiền.
- Frontend hiển thị dữ liệu theo backend response.

## NFR-02: Maintainability

- Code chia feature rõ ràng.
- API client tập trung.
- Query keys thống nhất.
- Form schema tách khỏi component UI lớn.
- Không tạo component quá dài.

## NFR-03: Security cơ bản

- Không hardcode token/secret.
- Không lưu password.
- Không log token/cookie.
- Nếu dùng bearer token, cân nhắc rủi ro XSS khi lưu localStorage; ưu tiên cookie httpOnly nếu backend hỗ trợ.
- Route guard không thay thế backend authorization.

## NFR-04: Performance

- List page dùng pagination.
- Không refetch quá dày.
- Chỉ polling transfer detail khi cần.
- Cache TanStack Query hợp lý.
- Không load toàn bộ accounts/transfers nếu backend có phân trang.

## NFR-05: Testability

Tối thiểu nên có:

- Unit test cho money formatting/parsing.
- Component test cho form validate.
- Hook/API test với mock.
- E2E smoke:
  - Login.
  - View accounts.
  - Create transfer.
  - View transfer detail.

## 5. Route matrix đề xuất

| Route | Auth | Role | Mô tả |
|---|---|---|---|
| `/login` | No | Public | Login |
| `/` | Yes | Any | Redirect dashboard |
| `/dashboard` | Yes | Any | Tổng quan |
| `/accounts` | Yes | Any allowed | Account list |
| `/accounts/new` | Yes | ADMIN/OPERATOR | Create account |
| `/accounts/:id` | Yes | Any allowed | Account detail |
| `/transfers` | Yes | Any allowed | Transfer list |
| `/transfers/new` | Yes | ADMIN/OPERATOR | Create transfer |
| `/transfers/:id` | Yes | Any allowed | Transfer detail |
| `/403` | Optional | Public | Forbidden |
| `/404` | Optional | Public | Not found |

Agent phải cập nhật matrix này theo role thực tế của backend.

## 6. Data display convention

### 6.1 Money

Backend dùng minor unit integer, ví dụ:

```json
{
  "available_balance_minor": 100000,
  "currency": "VND"
}
```

Frontend phải:

- Lưu trong state dưới dạng integer hoặc string numeric an toàn.
- Format khi hiển thị.
- Parse input cẩn thận.
- Không dùng `number` float cho phép tính tiền phức tạp.

Với MVP, có thể nhập trực tiếp minor unit để đơn giản, ví dụ label: `Amount (minor unit)`.

### 6.2 Date/time

- Hiển thị local time.
- Tooltip hoặc detail có ISO time nếu cần debug.
- Filter date range phải gửi format backend yêu cầu.

### 6.3 Status

Account status:

```text
ACTIVE
LOCKED
CLOSED
```

Transfer status:

```text
PENDING
PROCESSING
SUCCESS
FAILED
REVERSED
```

Hiển thị bằng MUI Chip, màu sắc nhất quán trong toàn app.

## 7. API contract cần xác minh trước khi code thật

Agent phải xác minh:

```text
POST /v1/auth/login
POST /v1/auth/logout
GET  /v1/auth/me

POST /v1/accounts
GET  /v1/accounts
GET  /v1/accounts/:id
POST /v1/accounts/:id/topup
POST /v1/accounts/:id/lock
POST /v1/accounts/:id/unlock
POST /v1/accounts/:id/close

POST /v1/transfers
GET  /v1/transfers
GET  /v1/transfers/:id
GET  /v1/accounts/:id/transfers
GET  /v1/accounts/:id/ledger
```

Tên endpoint chỉ là dự kiến. Backend thật là nguồn chuẩn.

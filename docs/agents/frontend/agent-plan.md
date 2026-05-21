# Agent Implementation Plan

## Tổng quan

Plan này chia việc frontend thành các phase nhỏ để coding agent làm tuần tự. Mỗi phase có mục tiêu, đầu ra và checklist verify.

Thư mục làm việc mặc định:

```text
/frontend
```

Tài liệu hỗ trợ:

```text
/docs/agents/frontend
```

Không nhảy phase nếu phase trước chưa đạt Definition of Done.

## Phase 0: Khảo sát contract backend

### Mục tiêu

Xác định backend contract thật trước khi code UI gọi API.

### Việc cần làm

1. Đọc backend routes/controllers/DTO hoặc Swagger/OpenAPI.
2. Xác định auth model:
   - Login endpoint.
   - Logout endpoint.
   - Me endpoint.
   - Cookie hay bearer token.
   - Refresh token nếu có.
3. Xác định role model:
   - Tên enum role.
   - Quyền từng role.
   - Cách backend trả role.
4. Xác định account endpoints.
5. Xác định transfer endpoints.
6. Xác định ledger endpoints.
7. Xác định pagination shape.
8. Xác định error response shape.
9. Xác định header bắt buộc:
   - `Idempotency-Key`.
   - `X-Request-Id`.
10. Ghi vào `docs/agents/frontend/contract-notes.md`.

### Output

```text
docs/agents/frontend/contract-notes.md
```

### Không được làm ở phase này

- Không sửa backend.
- Không bịa endpoint.
- Không code form thật nếu contract chưa rõ.

### Verify

- Có file `contract-notes.md`.
- Mỗi endpoint quan trọng có path/method/body/response hoặc ghi rõ “chưa tìm thấy”.

## Phase 1: Khởi tạo Next.js frontend skeleton

### Mục tiêu

Tạo project frontend trong `/frontend`.

### Việc cần làm

1. Nếu `/frontend` chưa tồn tại, tạo Next.js app với TypeScript và App Router.
2. Cài MUI.
3. Cài TanStack Query.
4. Cài React Hook Form, Zod, resolver.
5. Cấu hình ESLint/TypeScript.
6. Tạo `.env.example`.
7. Tạo layout cơ bản.
8. Tạo providers:
   - MUI.
   - TanStack Query.
   - CssBaseline.
9. Tạo route public/private group.

### Output

```text
web/
  app/
  src/
  package.json
  .env.example
```

### Verify

Chạy trong `/frontend`:

```bash
pnpm lint
pnpm typecheck
pnpm build
```

Nếu script chưa có, thêm script trong `/frontend/package.json`.

## Phase 2: API client và error handling

### Mục tiêu

Tạo lớp giao tiếp backend thống nhất.

### Việc cần làm

1. Tạo `src/config/env.ts`.
2. Tạo `src/lib/api/client.ts`.
3. Tạo `src/lib/api/errors.ts`.
4. Tạo `src/lib/api/request-id.ts`.
5. Nếu có OpenAPI:
   - Cấu hình Orval hoặc openapi-typescript.
   - Sinh client vào `src/lib/api/generated`.
6. Nếu chưa có OpenAPI:
   - Tạo API function typed thủ công theo `contract-notes.md`.
7. Chuẩn hóa error:
   - status.
   - code.
   - message.
   - details.
   - requestId.

### Output

```text
src/lib/api/*
src/config/env.ts
```

### Verify

```bash
pnpm typecheck
pnpm test
```

## Phase 3: Auth foundation

### Mục tiêu

Làm login/logout/me và guard route.

### Việc cần làm

1. Tạo auth types.
2. Tạo auth API.
3. Tạo query/mutation:
   - `useMe`
   - `useLoginMutation`
   - `useLogoutMutation`
4. Tạo login page.
5. Tạo protected layout.
6. Tạo route guard.
7. Tạo basic forbidden page.
8. Tạo permission helpers.
9. Tạo `RoleGate`.

### Output

```text
app/(auth)/login/page.tsx
app/(protected)/layout.tsx
app/403/page.tsx
src/lib/auth/*
src/components/common/RoleGate.tsx
```

### Acceptance

- Chưa login vào `/dashboard` bị redirect `/login`.
- Login thành công vào dashboard.
- Logout clear session/cache.
- `401` xử lý thống nhất.
- `403` hiển thị rõ.

### Verify

```bash
pnpm lint
pnpm typecheck
pnpm test
```

## Phase 4: App shell và navigation

### Mục tiêu

Tạo layout chính dễ dùng.

### Việc cần làm

1. Tạo AppShell.
2. Tạo Sidebar/Navigation.
3. Tạo AppBar.
4. Tạo UserMenu.
5. Tạo PageHeader.
6. Tạo ErrorAlert, EmptyState, DataState.
7. Navigation item ẩn/disabled theo quyền.

### Output

```text
src/app-shell/*
src/components/common/*
```

### Verify

```bash
pnpm lint
pnpm typecheck
pnpm build
```

## Phase 5: Accounts list và create account

### Mục tiêu

Làm màn hình danh sách account và tạo account.

### Việc cần làm

1. Tạo accounts types/API/query.
2. Tạo account schemas.
3. Tạo AccountStatusChip.
4. Tạo AccountTable.
5. Tạo `/accounts`.
6. Tạo create account page hoặc dialog.
7. Implement filter/pagination theo backend contract.
8. Invalidate query sau create.

### Output

```text
app/(protected)/accounts/page.tsx
app/(protected)/accounts/new/page.tsx
src/features/accounts/*
```

### Acceptance

- List có loading/error/empty.
- Pagination hoạt động.
- Create account validate form.
- Duplicate code hiển thị lỗi nếu backend trả.
- Role guard cho create.

### Verify

```bash
pnpm lint
pnpm typecheck
pnpm test
```

## Phase 6: Account detail, topup, status actions

### Mục tiêu

Làm chi tiết account và action nghiệp vụ cơ bản.

### Việc cần làm

1. Tạo `/accounts/[accountId]`.
2. Tạo AccountDetailCard.
3. Tạo TopupDialog.
4. Tạo lock/unlock/close action nếu backend có.
5. Tạo ConfirmDialog cho action nguy hiểm.
6. Invalidate đúng query sau mutation.
7. Disable action theo status và role.

### Output

```text
app/(protected)/accounts/[accountId]/page.tsx
src/features/accounts/components/TopupDialog.tsx
src/components/common/ConfirmDialog.tsx
```

### Acceptance

- Detail hiển thị balance/status.
- Topup amount > 0.
- Sau topup refetch account và ledger.
- Lock/unlock/close có confirm nếu có làm.
- Không optimistic update balance.

### Verify

```bash
pnpm lint
pnpm typecheck
pnpm test
```

## Phase 7: Ledger theo account

### Mục tiêu

Hiển thị ledger readonly.

### Việc cần làm

1. Tạo ledger type/table.
2. Tạo hook query account ledger.
3. Tạo tab Ledger trong account detail.
4. Pagination.
5. Link sang transfer detail nếu có transfer id.
6. Format side/amount/status rõ ràng.

### Output

```text
src/features/ledger/components/LedgerTable.tsx
src/features/accounts/components/AccountLedgerTab.tsx
```

### Acceptance

- Ledger readonly.
- Không có nút sửa/xóa.
- Loading/error/empty đủ.
- Pagination hoạt động.

### Verify

```bash
pnpm lint
pnpm typecheck
pnpm test
```

## Phase 8: Transfers list

### Mục tiêu

Làm danh sách transfer có filter.

### Việc cần làm

1. Tạo transfer types/API/query.
2. Tạo TransferStatusChip.
3. Tạo TransferTable.
4. Tạo `/transfers`.
5. Filter:
   - status.
   - account.
   - date range nếu backend hỗ trợ.
6. Đồng bộ filter/pagination lên URL query params nếu không quá phức tạp.

### Output

```text
app/(protected)/transfers/page.tsx
src/features/transfers/*
```

### Acceptance

- List có loading/error/empty.
- Pagination hoạt động.
- Filter hoạt động theo contract.
- Click detail.

### Verify

```bash
pnpm lint
pnpm typecheck
pnpm test
```

## Phase 9: Create transfer

### Mục tiêu

Làm form tạo transfer an toàn.

### Việc cần làm

1. Tạo TransferForm.
2. Load account options.
3. Validate:
   - source required.
   - destination required.
   - source != destination.
   - amount > 0.
   - currency required.
4. Generate `Idempotency-Key`.
5. Generate `X-Request-Id`.
6. Disable submit khi pending.
7. Handle conflict `409`.
8. Redirect sang transfer detail sau thành công.

### Output

```text
app/(protected)/transfers/new/page.tsx
src/features/transfers/components/TransferForm.tsx
src/features/transfers/transfers.schemas.ts
```

### Acceptance

- Không double submit.
- Không tạo source=destination.
- Headers đúng theo backend.
- Success/error snackbar rõ.
- Không tự update balance.

### Verify

```bash
pnpm lint
pnpm typecheck
pnpm test
```

## Phase 10: Transfer detail và timeline

### Mục tiêu

Làm màn hình chi tiết transfer.

### Việc cần làm

1. Tạo `/transfers/[transferId]`.
2. Tạo TransferDetailCard.
3. Tạo TransferTimeline.
4. Hiển thị failure code/message nếu có.
5. Refresh button.
6. Polling nhẹ nếu status `PENDING`/`PROCESSING`, hoặc chỉ refresh thủ công nếu muốn đơn giản.

### Output

```text
app/(protected)/transfers/[transferId]/page.tsx
src/features/transfers/components/TransferDetailCard.tsx
src/features/transfers/components/TransferTimeline.tsx
```

### Acceptance

- Detail rõ ràng.
- Timeline theo thứ tự thời gian.
- Failure state dễ nhìn.
- Link sang account source/destination.

### Verify

```bash
pnpm lint
pnpm typecheck
pnpm test
```

## Phase 11: Transfers theo account

### Mục tiêu

Hoàn thiện tab lịch sử transfer trong account detail.

### Việc cần làm

1. Tạo AccountTransfersTab.
2. Dùng endpoint account transfers.
3. Pagination.
4. Hiển thị direction:
   - OUT nếu account là source.
   - IN nếu account là destination.
5. Link transfer detail.

### Output

```text
src/features/accounts/components/AccountTransfersTab.tsx
```

### Verify

```bash
pnpm lint
pnpm typecheck
pnpm test
```

## Phase 12: Dashboard

### Mục tiêu

Tạo dashboard đơn giản sau login.

### Việc cần làm

1. Quick action cards.
2. Optional stats nếu API dễ có.
3. Recent transfers nếu đã có transfer list API.
4. Link nhanh tới Accounts/Transfers/Create Transfer.

### Output

```text
app/(protected)/dashboard/page.tsx
src/features/dashboard/DashboardPage.tsx
```

### Acceptance

- Không phụ thuộc endpoint stats nếu backend chưa có.
- Không crash khi API optional fail.
- Giao diện sạch, đủ dùng.

### Verify

```bash
pnpm lint
pnpm typecheck
pnpm build
```

## Phase 13: Mocking và tests

### Mục tiêu

Tăng độ tin cậy tối thiểu cho frontend.

### Việc cần làm

1. Cài Vitest/Testing Library nếu chưa có.
2. Cài MSW nếu cần mock.
3. Test:
   - money utils.
   - permission helpers.
   - login validation.
   - transfer validation.
   - status chips.
4. Cài Playwright nếu làm e2e smoke.
5. Tạo smoke flow nếu backend/mock sẵn.

### Output

```text
src/test/*
src/mocks/*
tests/e2e/*
```

### Verify

```bash
pnpm test
pnpm test:e2e
```

Nếu e2e phụ thuộc backend chưa chạy, ghi rõ cách chạy và không block toàn bộ frontend.

## Phase 14: Polish và hardening

### Mục tiêu

Làm UI đủ sạch để demo.

### Việc cần làm

1. Đồng bộ title/breadcrumb.
2. Kiểm tra empty/error/loading state.
3. Kiểm tra responsive cơ bản.
4. Kiểm tra 401/403/404.
5. Kiểm tra form disable khi pending.
6. Kiểm tra không log secret/token.
7. Kiểm tra query invalidation.
8. Kiểm tra build production.

### Verify

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

## Phase 15: Documentation

### Mục tiêu

Để người dùng chạy và tiếp tục phát triển frontend dễ dàng.

### Việc cần làm

Tạo hoặc cập nhật:

```text
web/README.md
```

Nội dung:

- Prerequisites.
- Env variables.
- Install.
- Dev.
- Build.
- Test.
- Backend contract notes.
- Known limitations.
- Agent TODOs.

### Verify

- README chạy được theo hướng dẫn.
- Không chứa secret.

## Final Definition of Done

Frontend được xem là hoàn thành giai đoạn này khi:

- Có login/logout/me hoặc mock rõ ràng nếu backend chưa sẵn.
- Có route guard.
- Có role guard.
- Có accounts list/detail/create.
- Có topup/status actions theo backend.
- Có transfers list/create/detail.
- Có ledger account.
- Có account transfer history.
- Có error/loading/empty states.
- Có lint/typecheck/build pass.
- Không sửa backend ngoài phạm vi.
- Không có secret.
- Có `web/README.md`.
- Có `contract-notes.md`.

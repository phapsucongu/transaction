# Frontend Architecture

## 1. Kiến trúc tổng quan

Frontend là một ứng dụng Next.js độc lập trong thư mục:

```text
/frontend
```

Stack chính:

| Nhóm | Công cụ | Vai trò |
|---|---|---|
| Framework | Next.js App Router | Routing, layout, server/client boundary |
| Language | TypeScript | Type safety |
| UI | MUI | Component library |
| Server state | TanStack Query | Fetch, cache, mutation, invalidation |
| Form | React Hook Form | Form state |
| Validation | Zod | Schema validation |
| API client | Orval hoặc openapi-typescript | Type-safe client nếu có OpenAPI |
| Mock API | MSW | Mock cho test/dev khi backend chưa ổn định |
| Unit test | Vitest + Testing Library | Test utility/component |
| E2E | Playwright | Smoke test |
| Lint/format | ESLint + Prettier | Code quality |

## 2. Nguyên tắc kiến trúc

- Backend là source of truth.
- Frontend không chứa business logic tài chính.
- API client tập trung một nơi.
- Feature được chia theo domain.
- Component UI không gọi fetch trực tiếp nếu có hook/query tương ứng.
- Route guard và role guard tách khỏi page logic.
- Mọi mutation có invalidation rõ ràng.
- Không thêm state manager global như Redux nếu chưa cần.

## 3. Cấu trúc thư mục đề xuất

```text
web/
  app/
    layout.tsx
    page.tsx
    providers.tsx

    (auth)/
      login/
        page.tsx

    (protected)/
      layout.tsx
      dashboard/
        page.tsx
      accounts/
        page.tsx
        new/
          page.tsx
        [accountId]/
          page.tsx
      transfers/
        page.tsx
        new/
          page.tsx
        [transferId]/
          page.tsx

    403/
      page.tsx
    not-found.tsx

  src/
    app-shell/
      AppShell.tsx
      Navigation.tsx
      UserMenu.tsx
      Breadcrumbs.tsx

    config/
      env.ts
      routes.ts

    lib/
      api/
        client.ts
        errors.ts
        request-id.ts
        generated/
      auth/
        auth.types.ts
        auth.api.ts
        auth.queries.ts
        auth.guards.tsx
        permissions.ts
      query/
        query-client.ts
        query-keys.ts
      money/
        money.ts
      date/
        date.ts

    features/
      dashboard/
        DashboardPage.tsx
      accounts/
        accounts.api.ts
        accounts.queries.ts
        accounts.schemas.ts
        accounts.types.ts
        components/
          AccountTable.tsx
          AccountStatusChip.tsx
          AccountForm.tsx
          TopupDialog.tsx
          AccountDetailCard.tsx
          AccountLedgerTab.tsx
          AccountTransfersTab.tsx
      transfers/
        transfers.api.ts
        transfers.queries.ts
        transfers.schemas.ts
        transfers.types.ts
        components/
          TransferTable.tsx
          TransferStatusChip.tsx
          TransferForm.tsx
          TransferDetailCard.tsx
          TransferTimeline.tsx
      ledger/
        ledger.types.ts
        components/
          LedgerTable.tsx

    components/
      common/
        PageHeader.tsx
        DataState.tsx
        ConfirmDialog.tsx
        ErrorAlert.tsx
        EmptyState.tsx
        RoleGate.tsx

    mocks/
      handlers.ts
      browser.ts
      server.ts

    test/
      setup.ts
      render.tsx

  public/

  package.json
  next.config.ts
  tsconfig.json
  vitest.config.ts
  playwright.config.ts
  .env.example
```

## 4. Next.js App Router conventions

### 4.1 Server Components vs Client Components

- Page/layout mặc định có thể là Server Component.
- Các phần dùng MUI interactive, TanStack Query, React Hook Form phải là Client Component.
- `app/providers.tsx` là Client Component chứa:
  - MUI ThemeProvider.
  - CssBaseline.
  - TanStack Query provider.
  - Snackbar/toast provider nếu dùng.
  - Auth/session provider nếu cần.

### 4.2 Protected layout

Route private đặt trong group:

```text
app/(protected)/layout.tsx
```

Layout này chịu trách nhiệm:

- Kiểm tra session.
- Render AppShell.
- Chặn route nếu chưa login.
- Role guard chi tiết có thể ở page hoặc component `RoleGate`.

Cách check session phụ thuộc auth model backend:

- Nếu cookie httpOnly/session: ưu tiên server-side check qua route handler hoặc backend `/me`.
- Nếu bearer token: tập trung token handling trong `src/lib/api/client.ts`.

Không rải logic auth ở từng component.

## 5. MUI architecture

### 5.1 Theme

Tạo theme đơn giản:

```text
src/theme/theme.ts
```

Định hướng:

- Dùng palette mặc định hoặc chỉnh nhẹ primary.
- Dùng spacing MUI.
- Dùng Card/Table/Dialog/FormControl phổ biến.
- Không cần custom design system lớn.

### 5.2 App Router integration

Nếu dùng MUI với Next.js App Router, cấu hình cache/provider theo hướng dẫn chính thức của MUI cho App Router. Agent phải kiểm tra version MUI thực tế sau khi cài.

File gợi ý:

```text
app/providers.tsx
src/theme/theme.ts
```

### 5.3 Component convention

- Feature component nằm trong `src/features/<feature>/components`.
- Component dùng chung nằm trong `src/components/common`.
- Status chip tách riêng để dùng lại.
- Table component nhận data/pagination/filter qua props, không tự quyết định API endpoint nếu có thể.

## 6. TanStack Query architecture

### 6.1 Query client

File:

```text
src/lib/query/query-client.ts
```

Config gợi ý:

- `staleTime` vừa phải cho list/detail.
- Retry mặc định thấp, ví dụ 1 lần cho GET.
- Không retry bừa cho mutation.
- Error handling thống nhất.

### 6.2 Query keys

File:

```text
src/lib/query/query-keys.ts
```

Gợi ý:

```ts
export const queryKeys = {
  auth: {
    me: ['auth', 'me'] as const,
  },
  accounts: {
    all: ['accounts'] as const,
    list: (params: unknown) => ['accounts', 'list', params] as const,
    detail: (id: string) => ['accounts', 'detail', id] as const,
    ledger: (id: string, params: unknown) => ['accounts', id, 'ledger', params] as const,
    transfers: (id: string, params: unknown) => ['accounts', id, 'transfers', params] as const,
  },
  transfers: {
    all: ['transfers'] as const,
    list: (params: unknown) => ['transfers', 'list', params] as const,
    detail: (id: string) => ['transfers', 'detail', id] as const,
  },
};
```

### 6.3 Invalidation rules

Sau create account:

```text
invalidate accounts list
```

Sau topup:

```text
invalidate account detail
invalidate accounts list
invalidate account ledger
```

Sau lock/unlock/close:

```text
invalidate account detail
invalidate accounts list
```

Sau create transfer:

```text
invalidate transfers list
invalidate transfer detail nếu có id
invalidate source account detail
invalidate destination account detail
invalidate source/destination ledger nếu đang cache
```

## 7. API client

### 7.1 Ưu tiên OpenAPI

Nếu backend có Swagger/OpenAPI, ưu tiên:

- Orval: sinh client + types + React Query hooks nếu phù hợp.
- Hoặc `openapi-typescript` + `openapi-fetch` + `openapi-react-query`.

Agent phải chọn một hướng và ghi vào `contract-notes.md`.

### 7.2 Nếu chưa có OpenAPI

Tạo typed API client thủ công trong:

```text
src/lib/api/client.ts
src/features/accounts/accounts.api.ts
src/features/transfers/transfers.api.ts
src/lib/auth/auth.api.ts
```

Không để fetch rải rác trong component.

### 7.3 Base URL

File:

```text
src/config/env.ts
```

Env:

```text
NEXT_PUBLIC_API_BASE_URL=http://localhost:3000
```

Nếu dùng Next route handlers làm proxy, có thể để frontend gọi `/api/backend/*`, nhưng không tạo proxy phức tạp nếu chưa cần.

### 7.4 Request headers

Mọi request nên có:

```http
Accept: application/json
Content-Type: application/json
```

Mutation quan trọng nên có:

```http
X-Request-Id: <uuid>
```

Create transfer nếu backend yêu cầu:

```http
Idempotency-Key: <uuid>
```

### 7.5 Error normalization

File:

```text
src/lib/api/errors.ts
```

Chuẩn hóa lỗi về dạng:

```ts
type ApiError = {
  status: number;
  code?: string;
  message: string;
  details?: unknown;
  requestId?: string;
};
```

UI không phụ thuộc trực tiếp vào shape lỗi thô của backend.

## 8. Auth architecture

### 8.1 Auth model cần xác minh

Agent phải xác minh backend dùng:

- Cookie httpOnly session.
- Access token bearer.
- Access/refresh token.
- JWT payload chứa role hay role lấy từ `/me`.

### 8.2 Session state

Hook đề xuất:

```text
useMe()
useLoginMutation()
useLogoutMutation()
```

File:

```text
src/lib/auth/auth.queries.ts
```

### 8.3 Permission helper

File:

```text
src/lib/auth/permissions.ts
```

Ví dụ:

```ts
export function canCreateTransfer(user: AuthUser | null): boolean;
export function canTopupAccount(user: AuthUser | null): boolean;
export function canChangeAccountStatus(user: AuthUser | null): boolean;
```

Không hardcode role ở nhiều nơi.

## 9. Form architecture

Dùng:

- React Hook Form.
- Zod.
- `@hookform/resolvers/zod`.

Schema đặt trong:

```text
src/features/accounts/accounts.schemas.ts
src/features/transfers/transfers.schemas.ts
src/lib/auth/auth.schemas.ts
```

Nguyên tắc:

- Schema chỉ validate input frontend.
- Backend vẫn validate cuối cùng.
- Error từ backend map vào form nếu có field cụ thể.
- Submit button disable khi pending.

## 10. Money handling

File:

```text
src/lib/money/money.ts
```

Hàm cần có:

```ts
formatMinorMoney(amountMinor: number | string, currency: string): string
parseMinorAmountInput(input: string): number
```

MVP có thể yêu cầu user nhập minor unit trực tiếp để tránh sai số.

Không dùng float để cộng/trừ tiền trong frontend.

## 11. Page design

## 11.1 Dashboard

- Quick action cards.
- Optional stats cards.
- Recent transfers nếu API dễ có.

## 11.2 Accounts list

- MUI Table hoặc MUI X Data Grid Community.
- Pagination server-side.
- Status filter.
- Create button theo quyền.

## 11.3 Account detail

- Summary card.
- Action buttons.
- Tabs ledger/transfers.
- Topup dialog.

## 11.4 Transfers list

- Filter bar.
- Table.
- Status chips.
- Link detail.

## 11.5 Transfer detail

- Summary card.
- Timeline.
- Failure reason.
- Refresh button.

## 12. Testing architecture

### 12.1 Unit/component

Dùng Vitest + Testing Library.

Test tối thiểu:

- Money formatting/parsing.
- Permission helpers.
- Login form validation.
- Transfer form validation.
- Status chip rendering.
- ErrorAlert mapping.

### 12.2 Mock API

Dùng MSW cho:

- Auth me/login/logout.
- Account list/detail.
- Transfer list/detail/create.
- Ledger list.

### 12.3 E2E

Dùng Playwright smoke test:

```text
Login success
Open accounts list
Open account detail
Create transfer
Open transfer detail
Logout
```

Nếu backend chưa sẵn, có thể dùng MSW/dev mock cho UI smoke.

## 13. Package scripts đề xuất

Trong `/frontend/package.json`:

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "typecheck": "tsc --noEmit",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:e2e": "playwright test",
    "format": "prettier --write .",
    "format:check": "prettier --check ."
  }
}
```

Nếu Next.js version mới không còn `next lint`, agent phải dùng cấu hình ESLint tương ứng với version thực tế.

## 14. Dependency policy

Dependency chính:

```text
@mui/material
@mui/icons-material
@emotion/react
@emotion/styled
@tanstack/react-query
react-hook-form
zod
@hookform/resolvers
```

Dependency cân nhắc:

```text
@mui/x-data-grid
@mui/x-date-pickers
dayjs
orval
openapi-typescript
openapi-fetch
openapi-react-query
msw
vitest
@testing-library/react
@testing-library/jest-dom
@playwright/test
```

Không thêm charting library, state manager lớn hoặc admin template trả phí nếu chưa cần.

## 15. Environment

File `.env.example` trong `/frontend`:

```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:3000
NEXT_PUBLIC_ENABLE_MSW=false
```

Không commit `.env.local`.

## 16. Build/deploy notes

Frontend có thể chạy độc lập:

```bash
cd web
pnpm install
pnpm dev
```

Production build:

```bash
cd web
pnpm build
pnpm start
```

Nếu deploy cùng Docker Compose, chỉ thêm service `web` khi được phép sửa compose. Theo policy hiện tại, agent không tự ý sửa compose nếu chưa có yêu cầu.

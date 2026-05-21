# Transaction Simulator Web UI

Frontend demo UI for the Transaction Simulator / Ledger Transfer System.

## Stack

- Next.js App Router
- TypeScript
- MUI
- TanStack Query
- React Hook Form
- Zod
- Vitest

## Environment

Create a local env file from the example if needed:

```bash
cp .env.example .env.local
```

```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:3000
```

The frontend default port is `1337`. Backend CORS must allow `http://localhost:1337` when testing against the local backend.

## Commands

```bash
pnpm install
pnpm dev
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

## Implemented Routes

- `/login`
- `/dashboard`
- `/accounts`
- `/accounts/new`
- `/accounts/[accountId]`
- `/transfers`
- `/transfers/new`
- `/transfers/[transferId]`
- `/403`

## Backend Contract Notes

The backend has no Swagger/OpenAPI document at the moment, so the API client is typed manually from backend controllers, DTOs, and services.

Auth uses bearer JWT from `POST /v1/auth/login`, then refreshes the current session with `GET /v1/auth/me` and clears it with `POST /v1/auth/logout`. The frontend stores the access token in sessionStorage and keeps a user snapshot in sync with the `/me` response. This is recorded in `../docs/agents/frontend/contract-notes.md`.

Roles confirmed from backend:

- `ADMIN`: account create/topup/lock/unlock and full list visibility.
- `USER`: owned account visibility and transfer creation from owned source account.

## Known Limitations

- No close-account UI because backend has no close endpoint.
- List filters are limited to pagination because backend list endpoints only accept `limit` and `offset`.

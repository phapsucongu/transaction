# Backend Contract Notes

Last updated: 2026-05-21

## Sources
- backend/API_DOCS.md
- backend/src/module/* controllers/services
- backend/src/common/*
- transaction_simulator_srs_problem_architecture.md

## Base URL
- http://localhost:3000

## CORS
- Backend .env sets CORS_ORIGIN=http://localhost:3001
- Frontend dev port was changed to http://localhost:1337; backend CORS_ORIGIN must be updated by the developer before browser API calls will work from the new port.

## Auth
- POST /v1/auth/register
  - Body: { email, full_name, password }
  - Response: { id, email, full_name, role, status, created_at }
- POST /v1/auth/login
  - Body: { email, password }
  - Response: { access_token, user: { id, email, full_name, role } }
- GET /v1/auth/me
  - Auth: Bearer token
  - Response: { id, email, full_name, role, status }
- POST /v1/auth/logout
  - Auth: Bearer token
  - Response: 204 No Content

## Token/session model
- Bearer JWT in Authorization header: "Bearer <token>".
- Token returned by /v1/auth/login as access_token.
- Frontend validates session with GET /v1/auth/me on app load and restores user state from the stored access token.
- Session is client-managed; access token is stored in sessionStorage and the user snapshot is stored alongside it.
- Logout clears client storage and also calls POST /v1/auth/logout for API symmetry.

## Role model
- Roles enum: ADMIN, USER.
- Backend authorization via JwtAuthGuard + RolesGuard.

## Accounts
- POST /v1/accounts (ADMIN only)
  - Body: { code, name, currency }
  - Response: account row (fields listed below)
- GET /v1/accounts?limit=&offset=
  - Response: { data: account[], meta: { limit, offset, total } }
  - ADMIN: all accounts; USER: owned accounts
- GET /v1/accounts/:id
  - Response: account row (not wrapped)
- GET /v1/accounts/:id/transfers?limit=&offset=
  - Response: { data: transfer[], meta: { limit, offset, total } }
- GET /v1/accounts/:id/ledger?limit=&offset=
  - Response: { data: ledger_entry[], meta: { limit, offset, total } }
- POST /v1/accounts/:id/topup (ADMIN only)
  - Body: { amount_minor }
  - Response: updated account row
- PUT /v1/accounts/:id/lock (ADMIN only)
  - Response: updated account row
- PUT /v1/accounts/:id/unlock (ADMIN only)
  - Response: updated account row

Account fields (from SELECT list in service):
- id, code, name, currency, available_balance_minor, status, version, created_at, updated_at

Account status values:
- ACTIVE, LOCKED, CLOSED (from DB constraints/SRS)

## Transfers
- GET /v1/transfers?limit=&offset=
  - Response: { data: transfer[], meta: { limit, offset, total } }
  - ADMIN: all transfers; USER: transfers where source/destination owned
- GET /v1/transfers/:id
  - Response: { data: transfer }
- POST /v1/transfers
  - Headers: idempotency-key (required by controller)
  - Body: { source_account_id, destination_account_id, amount_minor, currency }
  - Response: transfer row (SELECT * from transfers)

Transfer status values (DB constraints/SRS):
- PENDING, PROCESSING, SUCCESS, FAILED, REVERSED

Notes:
- Service sets status to PROCESSING then updates to SUCCESS within the same transaction.
- response_body is stored on transfer update; returned row includes full columns.

## Ledger
- GET /v1/accounts/:id/ledger?limit=&offset=
  - Response: { data: ledger_entry[], meta: { limit, offset, total } }
- Ledger rows are returned via SELECT * from ledger_entries.

Ledger entry fields (from DB schema in SRS):
- id, transfer_id, account_id, entry_type, side, amount_minor, currency, created_at, updated_at (some fields inferred from schema)

## Pagination shape
- List endpoints return { data, meta: { limit, offset, total } }

## Error response shape
- No custom exception filter found.
- Assumed NestJS default: { statusCode, message, error }.

## Required headers
- idempotency-key for POST /v1/transfers.
- X-Request-Id not required by backend code (SRS mentions it; verify if added later).

## Unknowns / TODO
- Confirm whether X-Request-Id should be sent and echoed.
- Confirm exact ledger_entry columns returned by DB (SELECT *).

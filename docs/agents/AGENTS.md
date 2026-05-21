# AGENTS.md

## Project context

Dự án backend là **Transaction Simulator / Ledger Transfer System**. Frontend cần triển khai bằng:

- Next.js App Router.
- TypeScript.
- MUI.
- TanStack Query.
- React Hook Form.
- Zod.
- API client bám sát backend contract, ưu tiên sinh từ OpenAPI nếu backend có Swagger/OpenAPI.

Frontend là lớp UI mỏng phục vụ demo, thao tác và kiểm thử backend. Không biến frontend thành nơi chứa business logic tài chính.

## Required reading before editing

Trước khi sửa code, agent phải đọc theo thứ tự:

1. `docs/agents/frontend/README.md`
2. `docs/agents/frontend/frontend-srs.md`
3. `docs/agents/frontend/frontend-architecture.md`
4. `docs/agents/frontend/agent-policy.md`
5. `docs/agents/frontend/agent-plan.md`

Nếu dùng Claude Code, `CLAUDE.md` chỉ import file này; vẫn phải đọc các file docs ở trên.

## Work boundary

Mặc định agent chỉ được sửa:

```text
/frontend/**
/docs/agents/frontend/**
AGENTS.md
CLAUDE.md
```

Agent được đọc toàn bộ repo để hiểu contract backend, nhưng **không được sửa backend** nếu chưa có yêu cầu rõ ràng từ người dùng.

Không tự ý sửa:

```text
/src/**
/server/**
/api/**
/worker/**
/migrations/**
/docker-compose*.yml
/.github/**
package files ở root repo
.env*
```

Nếu frontend cần thay đổi root config trong monorepo, agent phải dừng và báo cáo lý do trước.

## First task in every session

Trước khi code, agent phải tạo hoặc cập nhật ghi chú ngắn:

```text
docs/agents/frontend/contract-notes.md
```

Nội dung cần ghi:

- Backend auth endpoint đang có.
- Token/session được lưu ở đâu.
- Role model thực tế.
- API base URL.
- Pagination shape.
- Error response shape.
- Endpoint account/transfer/ledger thực tế.
- Những điểm chưa rõ.

Nếu repo chưa có backend contract rõ, không được tự bịa endpoint.

## Coding rules

- Dùng TypeScript strict.
- Ưu tiên component nhỏ, dễ test.
- Không để API call trực tiếp trong MUI component cấp thấp.
- Không dùng `any` trừ khi có chú thích lý do.
- Không hardcode secret.
- Không log token, cookie, password.
- Không đưa business rule tài chính vào frontend ngoài validate input cơ bản.
- Không dùng float cho tiền; hiển thị tiền từ minor unit integer.
- Mọi mutation quan trọng phải có loading, success, error state.
- `POST /transfers` phải có `Idempotency-Key` và `X-Request-Id` nếu backend yêu cầu.
- Route guard và role guard phải bám role thật của backend.

## UI style

Giao diện chỉ cần sạch và dễ dùng:

- Layout dashboard đơn giản.
- Sidebar hoặc top navigation.
- MUI Card/Table/Form/Dialog/Snackbar.
- Trạng thái hiển thị bằng Chip.
- Bảng có pagination/filter tối thiểu.
- Không cần animation phức tạp.
- Không cần template admin trả phí.

## Verification before finishing a task

Trước khi kết thúc mỗi phase/ticket, agent phải chạy các lệnh phù hợp trong `/frontend`:

```bash
pnpm lint
pnpm typecheck
pnpm test
```

Nếu project chưa có test ở phase đầu, tối thiểu phải chạy:

```bash
pnpm lint
pnpm typecheck
pnpm build
```

Nếu lệnh chưa tồn tại, agent được thêm script trong `/frontend/package.json`, nhưng không được sửa root package nếu không được phép.

## Stop conditions

Agent phải dừng và hỏi người dùng khi gặp một trong các trường hợp:

- Cần sửa backend.
- Cần sửa migration hoặc database schema.
- Cần chạy lệnh phá hủy dữ liệu.
- Backend contract mâu thuẫn với SRS.
- Auth/role model chưa rõ nhưng ảnh hưởng route guard.
- Cần thêm dependency lớn hoặc thay đổi framework.
- Test fail do lỗi backend hoặc môi trường ngoài phạm vi `/frontend`.

## Output expected from agent

Sau mỗi phase, agent phải báo cáo:

- Đã sửa file nào.
- Đã thêm route/component/hook nào.
- Đã đối soát backend contract nào.
- Lệnh verify đã chạy và kết quả.
- Rủi ro hoặc TODO còn lại.

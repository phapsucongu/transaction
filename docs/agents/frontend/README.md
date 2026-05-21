# Frontend Agent Docs

Bộ tài liệu này dùng để giao việc cho coding agent triển khai frontend cho dự án **Transaction Simulator / Ledger Transfer System**.

## Mục tiêu

Xây dựng frontend thực dụng, đủ dùng, ưu tiên hỗ trợ demo và thao tác với backend đã có:

- Xác thực người dùng.
- Phân quyền theo role.
- Quản lý account giả lập.
- Nạp tiền giả lập.
- Tạo transfer.
- Xem danh sách transfer, chi tiết transfer, timeline.
- Xem ledger và lịch sử transfer theo account.

Giao diện không cần quá nghệ thuật. Ưu tiên:

- Dễ dùng.
- Dễ debug.
- Bám đúng contract backend.
- Ít rủi ro ảnh hưởng backend.
- Có cấu trúc rõ để agent làm từng bước.

## File trong bộ tài liệu

| File | Mục đích |
|---|---|
| `AGENTS.md` | Entry point cho coding agent, quy tắc đọc tài liệu và hành vi chung |
| `CLAUDE.md` | File bridge cho Claude Code, import lại `AGENTS.md` |
| `frontend-srs.md` | SRS riêng cho frontend |
| `frontend-architecture.md` | Kiến trúc Next.js, MUI, TanStack Query và tool đề xuất |
| `agent-policy.md` | Policy an toàn: vùng được sửa, lệnh được phép/cấm, retry, dependency, git |
| `agent-plan.md` | Plan triển khai chi tiết theo phase/ticket |

## Vị trí đặt file khuyến nghị

Khuyến nghị đặt như sau:

```text
repo-root/
  AGENTS.md
  CLAUDE.md
  docs/
    agents/
      frontend/
        README.md
        frontend-srs.md
        frontend-architecture.md
        agent-policy.md
        agent-plan.md
```

Frontend nên nằm trong:

```text
repo-root/frontend/
```

Nếu repo dùng tên khác, ví dụ `frontend/` hoặc `apps/frontend/`, hãy sửa đồng bộ trong:

- `AGENTS.md`
- `agent-policy.md`
- `agent-plan.md`
- `frontend-architecture.md`

## Cách dùng với agent

Prompt khởi đầu gợi ý:

```text
Bạn là coding agent triển khai frontend cho dự án Transaction Simulator.

Trước khi sửa code, hãy đọc:
1. AGENTS.md
2. docs/agents/frontend/frontend-srs.md
3. docs/agents/frontend/frontend-architecture.md
4. docs/agents/frontend/agent-policy.md
5. docs/agents/frontend/agent-plan.md

Tuân thủ tuyệt đối agent-policy.md. Chỉ làm trong /frontend và docs/agents/frontend trừ khi tôi cho phép khác.
Bắt đầu từ Phase 0 và báo cáo những contract backend còn thiếu trước khi code màn hình thật.
```

## Nguyên tắc quan trọng

Agent **không được đoán contract backend**. Trước khi code API client hoặc form thật, agent phải đối soát:

- Auth endpoint.
- Session/token model.
- Role model.
- Error response shape.
- Pagination response shape.
- Endpoint account.
- Endpoint transfer.
- Endpoint ledger.
- Header bắt buộc như `Idempotency-Key`, `X-Request-Id`.

Nếu backend chưa có OpenAPI/Swagger hoặc contract chưa rõ, agent phải tạo một file ghi nhận assumption/TODO, dùng mock tạm cho UI, và dừng trước khi merge phần gọi API thật.

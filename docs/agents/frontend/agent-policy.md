# Agent Policy

## 1. Mục tiêu policy

Policy này giới hạn hành vi của coding agent để triển khai frontend an toàn, không làm hỏng backend transaction/ledger đã có.

Agent phải ưu tiên:

- Không phá dữ liệu.
- Không sửa backend ngoài phạm vi.
- Không chạy lệnh nguy hiểm.
- Không đoán contract quan trọng.
- Verify sau từng bước nhỏ.

## 2. Phạm vi được phép sửa

Mặc định chỉ được sửa:

```text
/frontend/**
/docs/agents/frontend/**
AGENTS.md
CLAUDE.md
```

Được tạo mới nếu chưa có:

```text
/frontend
/docs/agents/frontend/contract-notes.md
```

Được đọc nhưng không sửa:

```text
src/**
server/**
api/**
worker/**
migrations/**
database/**
docker/**
docker-compose*.yml
package.json ở root
pnpm-workspace.yaml
.github/**
.env*
```

## 3. Quy tắc đọc backend

Agent được đọc backend để xác định:

- Endpoint.
- DTO/request/response.
- Auth guard.
- Role enum.
- Swagger/OpenAPI.
- Error format.
- Pagination format.

Agent không được sửa backend để “cho frontend chạy” nếu chưa có yêu cầu rõ.

Nếu contract thiếu, agent phải ghi vào:

```text
docs/agents/frontend/contract-notes.md
```

và dùng mock hoặc TODO ở frontend thay vì tự sửa backend.

## 4. Lệnh được phép

Chỉ chạy trong `/frontend` trừ khi được cho phép khác.

Cho phép:

```bash
pwd
ls
find
cat
grep
rg
sed -n
node -v
pnpm -v
npm -v
corepack enable
pnpm install
pnpm add <package>
pnpm add -D <package>
pnpm dev
pnpm build
pnpm lint
pnpm typecheck
pnpm test
pnpm test:watch
pnpm test:e2e
pnpm format:check
```

Cho phép đọc git state:

```bash
git status
git diff
git diff --stat
git log --oneline -n 5
```

## 5. Lệnh bị cấm tuyệt đối

Không được chạy:

```bash
rm -rf /
rm -rf *
rm -rf ./*
sudo *
su *
chmod -R 777 *
chown -R *
dd *
mkfs *
mount *
umount *
kill -9 *
pkill *
docker system prune
docker volume rm
docker volume prune
docker compose down -v
docker compose rm -v
dropdb
createdb
psql -c "DROP *"
psql -c "TRUNCATE *"
npm audit fix --force
pnpm update --latest
git reset --hard
git clean -fd
git clean -fdx
git push --force
git rebase
git checkout -- .
```

Không chạy script lạ tải từ internet kiểu:

```bash
curl ... | sh
wget ... | bash
```

## 6. Lệnh cần xin phép trước

Phải dừng và hỏi người dùng trước khi chạy:

```bash
docker compose up
docker compose down
docker compose restart
pnpm install ở root repo
pnpm add ở root repo
npm install ở root repo
npx create-next-app nếu repo đã có frontend
migration command
seed command có ghi DB
test integration chạm DB thật
```

## 7. Dependency policy

### Được thêm nếu thật sự cần

Trong `/frontend`:

```text
@mui/material
@mui/icons-material
@emotion/react
@emotion/styled
@tanstack/react-query
react-hook-form
zod
@hookform/resolvers
dayjs
@mui/x-data-grid
@mui/x-date-pickers
orval
openapi-typescript
openapi-fetch
openapi-react-query
msw
vitest
@testing-library/react
@testing-library/jest-dom
@playwright/test
prettier
eslint
```

### Không được tự ý thêm

```text
redux
mobx
zustand
apollo
graphql
next-auth
tailwindcss nếu không có yêu cầu
admin template trả phí
chart library lớn
component library khác thay MUI
```

Nếu muốn thêm dependency ngoài danh sách, phải báo:

- Tên package.
- Lý do.
- Alternative không cần package.
- Tác động bundle/maintenance.

## 8. Retry policy cho agent

Khi một lệnh fail:

1. Đọc lỗi.
2. Sửa nguyên nhân rõ ràng.
3. Retry tối đa 2 lần cho cùng một lỗi.
4. Nếu vẫn fail, dừng và báo cáo.

Không được sửa bừa nhiều file để “thử”.

Không được loop:

```text
edit -> test fail -> edit ngẫu nhiên -> test fail -> edit ngẫu nhiên
```

Mỗi retry phải có giả thuyết rõ.

## 9. Policy khi test fail

Nếu test/typecheck/lint fail do file agent vừa sửa:

- Agent phải sửa trước khi kết thúc ticket.

Nếu fail do code cũ ngoài `/frontend`:

- Không sửa ngoài scope.
- Ghi rõ lỗi và file liên quan.
- Đề xuất cách xử lý.

Nếu fail do backend không chạy:

- Không tự start/stop Docker nếu chưa được phép.
- Có thể dùng MSW/mock cho frontend test.

## 10. Policy về auth và security

Không được:

- Hardcode token.
- Commit `.env.local`.
- Log password/token/cookie.
- Lưu password vào state ngoài form.
- Bỏ qua `401/403`.
- Fake role ở production flow.
- Dùng localStorage token nếu backend đã hỗ trợ httpOnly cookie.

Nếu backend dùng bearer token và chưa có cookie, agent phải gom toàn bộ token handling vào một module duy nhất và ghi rõ rủi ro trong `contract-notes.md`.

## 11. Policy về dữ liệu tiền

Không được:

- Dùng float để cộng/trừ amount.
- Tự quyết định transfer success/fail.
- Tự sửa balance ở client.
- Optimistic update balance sau transfer/topup nếu backend chưa trả dữ liệu chắc chắn.

Được:

- Format minor unit để hiển thị.
- Validate amount > 0.
- Disable submit khi form invalid.
- Invalidate/refetch sau mutation.

## 12. Policy về API contract

Agent không được đoán:

- Endpoint path.
- Request body.
- Response body.
- Auth header/cookie.
- Pagination shape.
- Error shape.
- Role enum.

Quy trình bắt buộc:

1. Tìm OpenAPI/Swagger.
2. Nếu có, dùng làm nguồn chuẩn.
3. Nếu không có, đọc controller/DTO backend.
4. Ghi kết quả vào `contract-notes.md`.
5. Chỉ sau đó mới code API client thật.

Nếu contract mâu thuẫn với SRS, backend thật được ưu tiên, nhưng phải báo lại.

## 13. Policy về Git

Được:

```bash
git status
git diff
git diff --stat
```

Không được:

```bash
git add
git commit
git push
git reset
git checkout
git merge
git rebase
```

trừ khi người dùng yêu cầu rõ.

## 14. Policy về format/lint

Agent được format file trong `/frontend`.

Không format toàn repo nếu ngoài scope.

Không thay đổi rule lint lớn để né lỗi.

Nếu lint rule gây khó chịu nhưng hợp lý, sửa code theo rule.

## 15. Policy về môi trường

Không sửa:

```text
.env
.env.local
.env.production
```

Được tạo:

```text
/frontend/.env.example
```

Không đưa secret thật vào file example.

## 16. Policy về Docker/deploy

Không tự ý sửa hoặc chạy Docker Compose nếu chưa được phép.

Nếu cần service backend chạy để test, agent phải báo:

- Service cần chạy.
- Lệnh đề xuất.
- Rủi ro dữ liệu.

## 17. Definition of Done cho mỗi ticket

Một ticket chỉ hoàn thành khi:

- Code nằm đúng scope.
- Không có secret.
- Không có API call rải rác trong component.
- Loading/error/empty state cơ bản có đủ.
- Role/auth behavior phù hợp phase hiện tại.
- Chạy verify tương ứng và báo kết quả.
- TODO còn lại được ghi rõ.

## 18. Điều kiện phải dừng ngay

Agent phải dừng ngay nếu:

- Lệnh cần `sudo`.
- Cần xóa volume/database.
- Cần sửa migration.
- Cần sửa backend business logic.
- Cần disable test/lint để pass.
- Không xác định được auth contract.
- Không xác định được role contract.
- Có nguy cơ mất dữ liệu.

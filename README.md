# Cách dùng bộ file này với Antigravity

1. Giải nén, copy toàn bộ nội dung vào thư mục gốc project (workspace) bạn mở trong Antigravity — giữ nguyên cấu trúc thư mục `.agents/` (Antigravity tự đọc thư mục này).
2. Vào Supabase Dashboard → SQL Editor → chạy nội dung `supabase/schema.sql` để tạo bảng + RLS.
3. Tạo file `.env` ở root với `VITE_SUPABASE_URL` và `VITE_SUPABASE_ANON_KEY` (không commit file này lên git).
4. Mở Antigravity, prompt đầu tiên gợi ý:

   > Đọc SPEC.md và toàn bộ .agents/rules, .agents/skills. Bắt đầu module 1 theo .agents/rules/coding-standards.md: setup dự án Vite + Tailwind + shadcn + kết nối Supabase + đăng nhập cơ bản. Làm xong thì dừng lại báo cáo, đừng làm tiếp module khác.

5. Sau mỗi module, dùng workflow tương ứng khi cần, ví dụ:
   > Chạy theo .agents/workflows/add-employee.md

## Danh sách file trong bộ kit
- `SPEC.md` — mục tiêu & phạm vi dự án (đọc trước tiên).
- `AGENTS.md` — persona + nguyên tắc cốt lõi cho AI agent.
- `supabase/schema.sql` — toàn bộ schema DB + RLS.
- `.agents/rules/` — quy tắc bắt buộc (tech stack, database, UI/UX, coding standards).
- `.agents/skills/` — hướng dẫn nghiệp vụ chi tiết (bảng chấm công, quản lý nhân viên, tạo kỳ mới, phân quyền).
- `.agents/workflows/` — quy trình lặp lại dạng slash-command.

## Còn thiếu / cần bạn quyết định thêm (đã ghi chú trong các skill)
- Danh sách mã nghỉ đầy đủ ngoài PN/PT/KP (nếu file gốc có thêm mã khác).
- Member có được tự nhập công cho chính mình hay không (mặc định hiện tại: chỉ Admin sửa được ô chấm công).
- Luồng module Tăng ca / bảng tổng — bạn nói sẽ mô tả riêng với Antigravity sau.

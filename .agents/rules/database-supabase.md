# Rule: Database (Supabase)

Schema đầy đủ nằm ở `supabase/schema.sql` — luôn sửa file đó song song khi đổi cấu trúc bảng, không để DB thật và file schema lệch nhau.

## Nguyên tắc thiết kế
- **Không xoá cứng (hard delete) nhân viên.** Dùng cột `status` (`active` / `inactive`) — vì dữ liệu chấm công các tháng cũ phải giữ nguyên dù nhân viên đã nghỉ việc.
- **Mỗi tháng chấm công là 1 "kỳ" (`timesheet_periods`)** — không ghi đè, không xoá kỳ cũ. Đổi tháng/năm = chọn kỳ khác, không phải sửa dữ liệu tháng cũ.
- **Không tính lại thứ/ngày trong tuần và lưu vào DB.** Thứ (T2...CN) và số ngày trong tháng tính ở frontend từ `month`/`year` bằng `date-fns` — tránh dữ liệu trùng lặp/sai lệch.
- Mọi bảng có `created_at`, bảng hay sửa có thêm `updated_at`.
- Phân quyền thực thi bằng **Row Level Security (RLS)** của Supabase, không chỉ chặn ở giao diện.

## Vai trò & RLS (tóm tắt — chi tiết xem `.agents/skills/roles-permissions.md`)
- `profiles.role = 'admin'`: full CRUD tất cả bảng.
- `profiles.role = 'member'`: `SELECT` tất cả bảng chấm công/nhân viên. Không `INSERT/UPDATE/DELETE` ở giai đoạn MVP (sẽ mở rộng sau nếu cần cho member tự nhập công).

## Khi thêm nhân viên mới
- Nếu đang có kỳ chấm công ở trạng thái mở (kỳ của tháng hiện tại), phải tự động sinh các dòng `timesheet_entries` rỗng cho nhân viên đó (2 dòng loại `work` và `overtime`, đủ số ngày trong tháng của kỳ đó) — xử lý ở tầng application (hàm gọi sau khi insert nhân viên thành công), **không** dùng Postgres trigger/function phức tạp trừ khi được yêu cầu, để dễ debug với người không chuyên.

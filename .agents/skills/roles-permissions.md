# Skill: Phân quyền (Admin / Member)

## Tạo tài khoản
- Admin tạo tài khoản cho từng thành viên phòng thiết kế (Supabase Auth — invite qua email hoặc tạo trực tiếp từ Supabase Dashboard/Admin API ở giai đoạn đầu, chưa cần UI mời user phức tạp).
- Sau khi user đăng nhập lần đầu, có dòng tương ứng trong bảng `profiles` (tạo tự động qua trigger đơn giản hoặc tạo tay lúc đầu — chọn cách nào dễ nhất khi implement, không cần hỏi lại).
- Mỗi `profiles` có `role`: `admin` hoặc `member`. Có thể (tuỳ chọn) liên kết `profiles.employee_id` → `employees.id` nếu muốn sau này cho member tự nhập công cho chính mình.

## Quyền hạn (MVP)
| Hành động | Admin | Member |
|---|---|---|
| Xem bảng chấm công mọi kỳ | ✅ | ✅ |
| Xem danh sách nhân viên | ✅ | ✅ |
| Thêm/sửa/xoá(ẩn) nhân viên | ✅ | ❌ |
| Tạo biểu chấm công tháng mới | ✅ | ❌ |
| Sửa ô chấm công | ✅ | ❌ (mặc định — có thể mở sau) |
| Quản lý tài khoản user | ✅ | ❌ |

## RLS (Row Level Security) — áp dụng thật ở DB, không chỉ ẩn UI
- Bật RLS cho toàn bộ bảng nghiệp vụ (`employees`, `timesheet_periods`, `timesheet_entries`).
- Policy `SELECT`: cho phép mọi user đã đăng nhập (`authenticated`).
- Policy `INSERT/UPDATE/DELETE`: chỉ cho phép khi `profiles.role = 'admin'` của user hiện tại (dùng hàm helper `is_admin()` — xem `supabase/schema.sql`).
- Không tin tưởng việc ẩn nút ở UI là đủ bảo mật — member vẫn có thể gọi API trực tiếp nếu không có RLS.

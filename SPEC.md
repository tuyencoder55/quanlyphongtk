# SPEC — Hệ thống Quản lý Phòng Thiết kế (Nhân sự + Chấm công + Tăng ca)

> File này là "nguồn sự thật" cho toàn bộ dự án. Đọc file này trước khi code bất kỳ module nào.
> Khi có thay đổi phạm vi, cập nhật lại file này trước, rồi mới sửa code.

## 1. Mục tiêu
Xây một web app nội bộ cho **Bộ phận Thiết kế** để:
1. Quản lý danh sách nhân viên (thêm / sửa / xoá / ngưng hoạt động).
2. Chấm công theo tháng, đúng bố cục bảng Excel gốc (xem ảnh mẫu đính kèm dự án).
3. Theo dõi tăng ca (chuẩn bị dữ liệu cho module Tăng ca / bảng tổng sẽ làm ở giai đoạn sau).

## 2. Người dùng & phân quyền
- **Admin**: toàn quyền — thêm/sửa/xoá nhân viên, tạo biểu chấm công tháng mới, sửa mọi ô chấm công, quản lý tài khoản & cấp quyền cho người dùng.
- **Member** (từng thành viên trong phòng): đăng nhập bằng tài khoản riêng (Supabase Auth). Mặc định là chỉ xem; Admin có thể bật cấp quyền `can_edit` (cho phép sửa/chấm công) và `can_delete` (cho phép xoá/ẩn).
- Không giới hạn số lượng user, admin là người quản lý tài khoản cho member.

## 3. Phạm vi MVP (làm trước)
- [ ] CRUD nhân viên phòng thiết kế: hỗ trợ song ngữ Việt - Trung (Mã số, Họ tên tiếng Việt, Tên chữ Hán).
- [ ] Khi thêm nhân viên mới → tự động xuất hiện trong bảng chấm công của kỳ (tháng) đang mở.
- [ ] Bảng chấm công đúng bố cục ảnh gốc: song ngữ Việt - Trung, mỗi nhân viên 2 dòng (Công / Tăng ca), cột ngày 1→28-31, header hiển thị Thứ + tô màu Chủ Nhật, cột tổng "Tổng Ngày Thường" và "Tổng ngày CN".
- [ ] Ô chấm công nhập được: số giờ (0–24, bước 0.5), mã nghỉ: `PN` (phép năm), `PT` (phép thường), `KP` (không phép), và hỗ trợ về sớm / nghỉ nửa buổi (ví dụ: làm 4h + nghỉ 4h PN/PT).
- [ ] Quy tắc tính cột tổng: Tổng Ngày Thường = Giờ làm thực tế + Giờ phép năm (PN) ngày thường; Giờ phép thường (PT/KP) không tính vào tổng lương.
- [ ] Chuyển đổi qua lại giữa các tháng/năm đã có; nút "Tạo biểu chấm công tháng mới" sinh kỳ mới + lưu trữ vĩnh viễn các kỳ cũ (không bị ghi đè).
- [ ] Đăng nhập, phân quyền Admin / Member (kèm cờ cấp quyền can_edit / can_delete).

## 4. Ngoài phạm vi MVP (làm sau — đợi mô tả chi tiết từ chủ dự án)
- Bảng Tăng ca riêng + đồng bộ dữ liệu dòng "Tăng ca" từ bảng chấm công qua bảng tổng.
- Xuất Excel / PDF giống file gốc.
- Báo cáo / thống kê.
- Không tự thêm các luồng xử lý trên nếu chưa được yêu cầu rõ — hỏi lại trước khi code.

## 5. Nguyên tắc làm việc
- Làm từng module một, có xác nhận trước khi qua module tiếp theo (xem `.agents/rules/coding-standards.md`).
- Ưu tiên đơn giản, dễ hiểu — chủ dự án là designer, code không chuyên. Tránh over-engineering.
- Mọi quyết định kỹ thuật quan trọng (đổi thư viện, đổi cấu trúc bảng...) phải hỏi trước khi làm.

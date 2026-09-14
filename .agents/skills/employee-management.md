# Skill: Quản lý nhân viên

## CRUD
- **Thêm**: form gồm `Mã số` (unique, giống cột "MÃ SỐ" trong file gốc), `Họ tên` (có thể gồm tên tiếng Việt + phiên âm/tên khác nếu chủ dự án cần, xem ảnh gốc có 2 dòng tên), `status` mặc định `active`.
- **Sửa**: sửa các trường trên, không cho sửa `Mã số` thành trùng nhân viên khác (validate unique).
- **Xoá**: **không xoá cứng** — chuyển `status` sang `inactive` (xem rule database). Nhân viên `inactive` vẫn hiển thị trong các kỳ chấm công cũ (lịch sử), nhưng **không** xuất hiện trong danh sách để chọn ở kỳ mới tạo sau đó.
- **Danh sách**: hiển thị cả active/inactive, lọc theo trạng thái, chỉ Admin thấy nút thêm/sửa/xoá.

## Hành vi khi thêm nhân viên mới (quan trọng — yêu cầu cốt lõi của chủ dự án)
Khi Admin thêm 1 nhân viên mới thành công:
1. Kiểm tra có kỳ chấm công (`timesheet_periods`) nào đang là kỳ **hiện tại** (tháng/năm hiện tại) đã được tạo chưa.
2. Nếu **có** → tự động tạo thêm các dòng `timesheet_entries` rỗng cho nhân viên này trong kỳ đó (đủ 2 `row_type` × số ngày trong tháng), để nhân viên **xuất hiện ngay lập tức** trong bảng chấm công đang xem — đúng yêu cầu "thêm nhân viên xong hiện trực tiếp vào bảng chấm công".
3. Nếu **chưa có** kỳ hiện tại → không cần làm gì thêm, nhân viên sẽ tự có mặt khi Admin bấm "Tạo biểu chấm công tháng mới" (xem skill `month-rollover.md`).

## Câu hỏi cần hỏi lại chủ dự án khi gặp (đừng tự quyết)
- Có cần thêm nhân viên vào **các kỳ tương lai đã lỡ tạo trước** (ví dụ đã tạo sẵn kỳ tháng sau) hay chỉ kỳ hiện tại?
- Trường dữ liệu nhân viên có cần thêm: chức vụ, ngày vào làm, ảnh đại diện... hay chỉ cần đúng những cột có trong file Excel gốc?

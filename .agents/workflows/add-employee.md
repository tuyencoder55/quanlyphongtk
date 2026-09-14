# Workflow: /add-employee

Dùng khi cần code hoặc test lại tính năng thêm nhân viên + đồng bộ vào bảng chấm công đang mở.

## Các bước
1. Đọc `.agents/skills/employee-management.md`.
2. Implement form thêm nhân viên (`Mã số`, `Họ tên`) → insert vào `employees`.
3. Sau khi insert thành công:
   - Query xem có `timesheet_periods` nào khớp tháng/năm hiện tại không.
   - Nếu có → bulk insert `timesheet_entries` rỗng cho nhân viên mới (2 `row_type` × số ngày trong tháng của kỳ đó).
4. Cập nhật UI bảng chấm công (nếu đang mở đúng kỳ hiện tại) để nhân viên mới hiện ngay, không cần reload trang thủ công.
5. Test: thêm 1 nhân viên trong lúc đang xem bảng chấm công tháng hiện tại → xác nhận nhân viên xuất hiện ngay với các ô trống.
6. Báo cáo kết quả, dừng chờ xác nhận.

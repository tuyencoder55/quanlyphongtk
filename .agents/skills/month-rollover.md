# Skill: Tạo biểu chấm công tháng mới (Month Rollover)

Đây là nút chỉ **Admin** thấy, nằm cạnh bộ chọn Tháng/Năm.

## Điều kiện hiện nút
- Hiện nút "Tạo biểu chấm công tháng mới" khi Admin đang chọn 1 tháng/năm **chưa có** `timesheet_periods` tương ứng.
- Nếu kỳ đã tồn tại → ẩn nút, hiển thị bảng chấm công bình thường (dữ liệu đã lưu trước đó, không tạo lại, không ghi đè).

## Khi bấm nút
1. Tạo 1 dòng mới trong `timesheet_periods` với `month`, `year`, `created_by` = user hiện tại.
2. Lấy danh sách toàn bộ nhân viên có `status = 'active'` tại thời điểm bấm nút.
3. Tính số ngày trong tháng đó (`date-fns`).
4. Bulk insert `timesheet_entries` rỗng: với mỗi nhân viên × mỗi ngày × 2 `row_type` (`work`, `overtime`) — `value_hours = null`, `leave_code = null`.
5. Toast báo "Đã tạo biểu chấm công tháng X/Y", tự chuyển UI sang xem kỳ vừa tạo.

## Lưu ý quan trọng
- Thao tác này chỉ tạo **dữ liệu rỗng**, không copy số liệu từ tháng trước (mỗi tháng chấm công lại từ đầu).
- Không cho tạo trùng kỳ (unique constraint `(month, year)` ở DB, xem `supabase/schema.sql`) — nếu bấm nhầm/bấm 2 lần, chặn ở cả frontend lẫn DB.
- Các kỳ cũ **không bao giờ bị sửa/xoá** bởi thao tác này — đây chính là phần "lưu trữ lại theo tháng" mà chủ dự án yêu cầu.

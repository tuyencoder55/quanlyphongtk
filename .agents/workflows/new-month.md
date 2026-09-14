# Workflow: /new-month

Dùng khi cần code hoặc test lại tính năng "Tạo biểu chấm công tháng mới".

## Các bước
1. Đọc `.agents/skills/month-rollover.md` và `supabase/schema.sql` (bảng `timesheet_periods`, `timesheet_entries`).
2. Kiểm tra function/handler hiện tại (nếu đã có) tạo kỳ mới đúng theo skill chưa: có check trùng kỳ, có lấy đúng nhân viên `active`, có tính đúng số ngày trong tháng không.
3. Nếu chưa có → implement:
   - Hàm `createNewPeriod(month, year)` ở `src/features/timesheet/`.
   - Insert `timesheet_periods`, sau đó bulk insert `timesheet_entries` (dùng 1 query insert nhiều dòng, không loop gọi API từng dòng).
4. Viết UI: nút chỉ hiện với Admin và chỉ khi kỳ đang chọn chưa tồn tại.
5. Test thử: tạo kỳ tháng hiện tại → kiểm tra đủ số dòng = (số nhân viên active) × (số ngày trong tháng) × 2.
6. Báo cáo kết quả, dừng chờ xác nhận trước khi sang việc khác.

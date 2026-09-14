# Skill: Bảng chấm công (Timesheet Grid)

## Sinh lưới ngày cho 1 kỳ (period)
1. Lấy `month` + `year` của kỳ đang xem.
2. Dùng `date-fns` (`getDaysInMonth`, `getDay`...) tính:
   - Số ngày trong tháng (28/29/30/31).
   - Thứ của từng ngày (T2→CN) để render header và tô màu cột Chủ Nhật.
3. **Không lưu thứ/ngày trong DB** — tính lại mỗi lần render từ `month`/`year` (xem rule `database-supabase.md`).

## Cấu trúc dữ liệu 1 ô chấm công
Mỗi ô = 1 dòng trong `timesheet_entries`, xác định bởi `(period_id, employee_id, row_type, day)`:
- `row_type`: `'work'` (hàng Công) hoặc `'overtime'` (hàng Tăng ca).
- Giá trị lưu ở **một trong hai** cột (không dùng cả hai cùng lúc):
  - `value_hours` (numeric, 0–24, bước 0.5) — dùng cho cả `work` và `overtime`.
  - `leave_code` (text: `PN` | `PT` | `KP`) — **chỉ áp dụng cho `row_type = 'work'`**, hàng `overtime` không có mã nghỉ.

## Tính cột tổng
- **Tổng Ngày Thường** (của 1 nhân viên trong kỳ) = tổng `value_hours` của hàng `work` vào các ngày **không phải Chủ Nhật** (không cộng các ô có `leave_code`, trừ khi chủ dự án yêu cầu PN/PT được tính vào tổng công — hỏi lại nếu chưa rõ, đừng tự suy đoán).
- **Tổng ngày CN** = tổng `value_hours` của hàng `work` vào các ngày **là Chủ Nhật**.
- Tính ở frontend (derive từ dữ liệu đã load), không cần lưu cột tổng trong DB — tránh lệch dữ liệu khi sửa ô.

## Nhập liệu 1 ô
- Validate: số phải trong khoảng 0–24, bước 0.5; mã nghỉ phải thuộc danh sách hợp lệ (`PN`, `PT`, `KP`), mở rộng danh sách này khi chủ dự án bổ sung mã mới — để danh sách mã nghỉ là 1 hằng số (constant) dễ sửa ở 1 chỗ, không rải rác trong code.
- Lưu (update) ngay khi rời khỏi ô (blur) hoặc bấm Enter — không cần nút "Lưu" riêng cho từng ô, nhưng cần toast báo lưu thành công/thất bại.

## Ghi chú cho module Tăng ca (làm sau, chưa phải MVP)
Hàng `overtime` trong bảng chấm công **sẽ là nguồn dữ liệu** cho module Tăng ca/bảng tổng sau này — vì vậy giữ nguyên cấu trúc `row_type = 'overtime'` tách biệt ngay từ đầu, dù module tổng hợp chưa code, để không phải đổi schema về sau.

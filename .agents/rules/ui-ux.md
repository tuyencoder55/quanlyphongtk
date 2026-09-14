# Rule: UI/UX — Bảng chấm công

Bảng chấm công phải bám sát bố cục ảnh Excel gốc mà chủ dự án cung cấp. Không tự sáng tạo layout khác khi chưa hỏi.

## Cấu trúc bảng
- Cột cố định bên trái (sticky khi scroll ngang): `STT`, `Mã số`, `Họ tên`.
- Sau đó là các cột ngày `01` → `28/29/30/31` (tuỳ tháng), mỗi cột ngày có 2 dòng nhỏ trong header: số ngày + tên Thứ (T2, T3... T7, CN).
- Cột Chủ Nhật (`CN`) tô nền xanh dương nhạt, dễ phân biệt với ngày thường.
- Mỗi nhân viên chiếm **2 hàng**:
  1. Hàng **"Công"** (đi làm, giờ công thường — mặc định 8).
  2. Hàng **"Tăng ca"** (giờ làm thêm ngoài giờ công thường).
- 2 cột tổng bên phải: **"Tổng Ngày Thường"** (nền hồng) và **"Tổng ngày CN"** (nền xanh) — tự động cộng từ dữ liệu 2 hàng ở trên.

## Giá trị trong 1 ô chấm công
- Số giờ: `0` → `24`, bước `0.5`.
- Hoặc mã nghỉ (chỉ áp dụng cho hàng "Công", không áp dụng hàng "Tăng ca"): `PN` (phép năm, nền đỏ), `PT` (phép thường, nền vàng), `KP` (không phép, màu do quy ước sau — hỏi chủ dự án nếu cần thêm mã khác như file gốc).
- Ô trống = chưa chấm công cho ngày đó.

## Tương tác
- Click / tap vào ô → mở input nhỏ (hoặc dropdown) để nhập số giờ hoặc chọn mã nghỉ, không dùng modal to gây chậm thao tác — người dùng chấm công nhiều ô liên tục.
- Cho phép nhập nhanh kiểu "gõ rồi Tab/Enter sang ô kế tiếp" nếu khả thi (không bắt buộc ở MVP).
- Có bộ chọn Tháng/Năm ở đầu trang để đổi kỳ đang xem; kỳ chưa tồn tại → hiện nút "Tạo biểu chấm công tháng mới" (chỉ Admin thấy nút này).

## Trách nhiệm & style chung
- Theo màu/khoảng cách của shadcn/ui + Tailwind, không tự vẽ CSS tuỳ tiện ngoài design tokens.
- Ưu tiên đọc được trên desktop trước (bảng rộng nhiều cột) — mobile cho scroll ngang, không cần thu gọn bảng ở MVP.

# Workflow: /build-module

Dùng chung mỗi khi bắt đầu 1 module mới trong danh sách ở `.agents/rules/coding-standards.md`.

## Các bước
1. Đọc lại `SPEC.md` phần liên quan đến module này.
2. Đọc rule + skill liên quan (ví dụ module bảng chấm công → đọc `ui-ux.md` + `attendance-table.md`).
3. Đề xuất ngắn gọn cấu trúc file/component sẽ tạo — trình bày trước khi code nếu module lớn (nhiều hơn ~3 file mới).
4. Code từng phần, ưu tiên chạy được (dù chưa đẹp) rồi mới tinh chỉnh UI.
5. Tự kiểm tra: chạy thử luồng chính (happy path) + 1 trường hợp lỗi cơ bản (ví dụ nhập số ngoài 0–24).
6. Tóm tắt: đã làm gì, cách người dùng tự test, có gì cần quyết định thêm không.
7. Dừng lại, chờ xác nhận trước khi bắt đầu module kế tiếp.

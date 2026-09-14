# Rule: Coding Standards & Quy trình làm việc

## Quy trình
- Làm **module theo module**, thứ tự đề xuất:
  1. Setup dự án (Vite + Tailwind + shadcn + Supabase client + Auth cơ bản).
  2. Module Nhân viên (CRUD).
  3. Module Kỳ chấm công (tạo kỳ mới, chọn tháng/năm).
  4. Module Bảng chấm công (hiển thị + nhập liệu).
  5. Phân quyền Admin/Member đầy đủ (RLS + ẩn/hiện UI).
- Sau mỗi module: tóm tắt ngắn gọn đã làm gì, cách test thử, rồi **dừng lại chờ xác nhận** trước khi làm module kế tiếp.
- Không gộp nhiều module vào 1 lần trả lời/1 lần code lớn.

## Cấu trúc thư mục đề xuất (đơn giản, phẳng)
```
src/
  components/       # UI dùng chung (Button, Table cell, Modal nhỏ...)
  features/
    employees/       # CRUD nhân viên
    timesheet/        # Bảng chấm công + logic kỳ
    auth/              # Đăng nhập, phân quyền
  lib/
    supabase.js        # Khởi tạo Supabase client
    dateUtils.js        # Hàm tính thứ/ngày trong tháng (date-fns)
  pages/                # Các trang theo route
```

## Quy tắc code
- Đặt tên biến/hàm tiếng Anh, comment giải thích logic nghiệp vụ bằng tiếng Việt khi cần.
- Mỗi file 1 trách nhiệm rõ ràng, tránh file trên 300 dòng — tách nhỏ khi vượt.
- Không hard-code API key Supabase trong code — dùng file `.env` (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`).
- Luôn xử lý trạng thái loading/error khi gọi Supabase, không để UI treo im lặng.
- Không tạo tính năng/bảng dữ liệu ngoài phạm vi `SPEC.md` mà không hỏi trước.

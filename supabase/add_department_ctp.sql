-- ============================================================
-- SQL Update: Bổ sung Phân loại Bộ phận (Thiết Kế & CTP)
-- Chạy đoạn này trong Supabase Dashboard -> SQL Editor
-- ============================================================

-- 1. Bổ sung cột department cho bảng employees (mặc định là 'TK')
alter table employees add column if not exists department text not null default 'TK';

-- 2. Cập nhật tất cả nhân viên hiện có về 'TK' nếu chưa có giá trị
update employees set department = 'TK' where department is null or department = '';

-- 3. Tạo index tìm kiếm nhanh theo bộ phận
create index if not exists idx_employees_department on employees(department);

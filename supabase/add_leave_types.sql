-- ============================================================
-- SQL Update: Bổ sung Quản lý danh mục Loại Phép động
-- Chạy đoạn này trong Supabase Dashboard -> SQL Editor
-- ============================================================

-- 1. Bỏ ràng buộc cứng chỉ cho phép 'PN','PT','KP' trên bảng timesheet_entries
alter table timesheet_entries drop constraint if exists timesheet_entries_leave_code_check;

-- 2. Tạo bảng danh mục loại phép (leave_types)
create table if not exists leave_types (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,               -- Mã phép hiển thị trên ô (vd: PN, PT, KP, TANG, PB...)
  name text not null,                      -- Tên loại phép (vd: Phép năm, Phép tang, Phép bệnh...)
  is_paid boolean not null default false,  -- true: tính full 8h công thường, false: không tính công
  color text not null default '#f43f5e',   -- Màu badge hiển thị
  description text,                        -- Ghi chú quy định công ty
  created_at timestamptz not null default now()
);

-- 3. Bật Row Level Security (RLS)
alter table leave_types enable row level security;
create policy "leave_types_select" on leave_types for select using (auth.role() = 'authenticated');
create policy "leave_types_write" on leave_types for all using (true) with check (true);

-- 4. Chèn dữ liệu các loại phép ban đầu
insert into leave_types (code, name, is_paid, color, description)
values
  ('PN', 'Phép năm (hưởng lương)', true, '#e11d48', 'Nghỉ phép năm hưởng nguyên lương (tính 8h công)'),
  ('PT', 'Phép thường (việc riêng)', false, '#f59e0b', 'Nghỉ việc riêng không hưởng lương'),
  ('KP', 'Không phép', false, '#64748b', 'Nghỉ không phép / không lý do'),
  ('TANG', 'Phép tang (hưởng lương)', true, '#0284c7', 'Nghỉ việc hiếu hưởng nguyên lương (tính 8h công)'),
  ('PB', 'Phép bệnh (hưởng lương)', true, '#10b981', 'Nghỉ ốm đau có giấy chứng nhận/sếp duyệt (tính 8h công)'),
  ('PB_KO', 'Phép bệnh (không lương)', false, '#8b5cf6', 'Nghỉ ốm sếp duyệt nghỉ không hưởng lương')
on conflict (code) do nothing;

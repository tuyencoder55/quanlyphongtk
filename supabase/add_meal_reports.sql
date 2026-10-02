-- ============================================================
-- Migration: Tạo bảng meal_entries cho Biểu Báo Cơm Hàng Ngày
-- ============================================================

create table if not exists meal_entries (
  id uuid primary key default gen_random_uuid(),
  month int not null check (month between 1 and 12),
  year int not null check (year >= 2000),
  day int not null check (day between 1 and 31),
  total_people int not null default 0,  -- 实际上班人员 / TỔNG SỐ NGƯỜI
  absent_count int not null default 0,  -- 请假 / VẮNG
  lunch_count int not null default 0,   -- 中午 / TRƯA
  dinner_count int not null default 0,  -- 下午 / CHIỀU
  department text not null default 'TK', -- Bộ phận: TK (Thiết Kế), CTP...
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (month, year, day, department)
);

create index if not exists idx_meal_entries_month_year on meal_entries(month, year, department);

-- Bật Row Level Security (RLS)
alter table meal_entries enable row level security;

-- Policy: Tất cả user đã đăng nhập được xem
create policy "Allow select meal_entries" on meal_entries
  for select using (auth.role() = 'authenticated');

-- Policy: Admin hoặc user có quyền can_edit được thêm/sửa/xoá
create policy "Allow write meal_entries" on meal_entries
  for all using (
    exists (
      select 1 from profiles
      where profiles.id = auth.uid()
      and (profiles.role = 'admin' or profiles.can_edit = true)
    )
  );

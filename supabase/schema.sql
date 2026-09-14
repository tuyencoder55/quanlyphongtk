-- ============================================================
-- Schema: Quản lý Phòng Thiết kế — Nhân sự + Chấm công
-- ============================================================

-- 1. BẢNG PROFILES (Mở rộng từ auth.users, lưu vai trò & quyền hạn)
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique,                       -- Tên đăng nhập (vd: admin, tuyen)
  full_name text,
  role text not null default 'member' check (role in ('admin','member')),
  can_edit boolean not null default false,    -- Quyền sửa chấm công (do admin cấp)
  can_delete boolean not null default false,  -- Quyền xoá/ẩn dữ liệu (do admin cấp)
  employee_id uuid,                           -- Liên kết tới nhân viên (nếu cần)
  created_at timestamptz not null default now()
);

-- Tự động tạo profile khi có user mới đăng ký / được mời
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, username, full_name, role, can_edit, can_delete)
  values (
    new.id, 
    coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)), 
    'member', 
    false, 
    false
  );
  return new;
end;
$$ language plpgsql security definer;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 2. BẢNG EMPLOYEES (Nhân viên phòng thiết kế)
create table if not exists employees (
  id uuid primary key default gen_random_uuid(),
  employee_code text not null unique,   -- Mã số (vd: GH412)
  full_name text not null,               -- Họ tên tiếng Việt (vd: TRẦN HẢO HOA)
  chinese_name text,                     -- Tên chữ Hán (vd: 陈好花)
  status text not null default 'active' check (status in ('active','inactive')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 3. BẢNG TIMESHEET_PERIODS (Kỳ chấm công theo tháng/năm)
create table if not exists timesheet_periods (
  id uuid primary key default gen_random_uuid(),
  month int not null check (month between 1 and 12),
  year int not null check (year >= 2000),
  created_by uuid references profiles(id),
  created_at timestamptz not null default now(),
  unique (month, year)
);

-- 4. BẢNG TIMESHEET_ENTRIES (Từng ô chấm công)
create table if not exists timesheet_entries (
  id uuid primary key default gen_random_uuid(),
  period_id uuid not null references timesheet_periods(id) on delete cascade,
  employee_id uuid not null references employees(id) on delete cascade,
  row_type text not null check (row_type in ('work','overtime')),
  day int not null check (day between 1 and 31),
  value_hours numeric(4,1) default 0 check (value_hours is null or (value_hours >= 0 and value_hours <= 24)),
  leave_code text check (leave_code is null or leave_code in ('PN','PT','KP')),
  leave_hours numeric(4,1) default 0 check (leave_hours is null or (leave_hours >= 0 and leave_hours <= 24)),
  updated_at timestamptz not null default now(),
  unique (period_id, employee_id, row_type, day),
  constraint leave_only_on_work check (row_type = 'work' or leave_code is null)
);

create index if not exists idx_entries_period on timesheet_entries(period_id);
create index if not exists idx_entries_employee on timesheet_entries(employee_id);

-- 5. BẢNG OVERTIME_ENTRIES (Giấy đề nghị tăng ca theo tháng)
create table if not exists overtime_entries (
  id uuid primary key default gen_random_uuid(),
  period_id uuid not null references timesheet_periods(id) on delete cascade,
  employee_id uuid not null references employees(id) on delete cascade,
  day int not null check (day between 1 and 31),
  date date not null,                                -- Ngày tăng ca (YYYY-MM-DD)
  start_time text not null default '16:30',          -- Giờ vào ca (vd: '16:30', '07:30')
  end_time text not null,                            -- Giờ ra ca (vd: '18:30', '21:30')
  hours numeric(4,1) not null check (hours > 0),    -- Số giờ tính lương (làm tròn 30p)
  reason text default 'Xử lý file / 处理档案',        -- Lý do tăng ca
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (period_id, employee_id, day)
);

create index if not exists idx_overtime_period on overtime_entries(period_id);
create index if not exists idx_overtime_employee on overtime_entries(employee_id);

-- ============================================================
-- Row Level Security (RLS)
-- ============================================================
alter table profiles enable row level security;
alter table employees enable row level security;
alter table timesheet_periods enable row level security;
alter table timesheet_entries enable row level security;
alter table overtime_entries enable row level security;

-- Helper functions kiểm tra quyền
create or replace function is_admin()
returns boolean language sql security definer stable as $$
  select exists (
    select 1 from profiles where id = auth.uid() and role = 'admin'
  );
$$;

create or replace function can_user_edit()
returns boolean language sql security definer stable as $$
  select exists (
    select 1 from profiles where id = auth.uid() and (role = 'admin' or can_edit = true)
  );
$$;

create or replace function can_user_delete()
returns boolean language sql security definer stable as $$
  select exists (
    select 1 from profiles where id = auth.uid() and (role = 'admin' or can_delete = true)
  );
$$;

-- Policies cho PROFILES
create policy "profiles_select" on profiles for select using (auth.role() = 'authenticated');
create policy "profiles_update_admin" on profiles for update using (is_admin());

-- Policies cho EMPLOYEES
create policy "employees_select" on employees for select using (auth.role() = 'authenticated');
create policy "employees_insert" on employees for insert with check (can_user_edit());
create policy "employees_update" on employees for update using (can_user_edit());
create policy "employees_delete" on employees for delete using (can_user_delete());

-- Policies cho TIMESHEET_PERIODS
create policy "periods_select" on timesheet_periods for select using (auth.role() = 'authenticated');
create policy "periods_write_admin" on timesheet_periods for all using (is_admin()) with check (is_admin());

-- Policies cho TIMESHEET_ENTRIES
create policy "entries_select" on timesheet_entries for select using (auth.role() = 'authenticated');
create policy "entries_write" on timesheet_entries for all using (can_user_edit()) with check (can_user_edit());

-- Policies cho OVERTIME_ENTRIES
create policy "overtime_select" on overtime_entries for select using (auth.role() = 'authenticated');
create policy "overtime_write" on overtime_entries for all using (can_user_edit()) with check (can_user_edit());

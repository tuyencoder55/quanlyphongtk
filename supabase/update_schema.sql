-- Bổ sung cột username vào bảng profiles và gán cho tài khoản admin
alter table profiles add column if not exists username text unique;

-- Cập nhật username cho tài khoản admin hiện tại trong database
update profiles set username = 'admin' where role = 'admin';

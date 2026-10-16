-- ============================================================
-- SQL: Lấy chỉ số dung lượng và thống kê bộ nhớ Supabase PostgreSQL
-- ============================================================
-- Cách dùng: Copy toàn bộ nội dung file này, dán vào:
-- Supabase Dashboard -> SQL Editor -> New Query -> Run.
-- ============================================================

CREATE OR REPLACE FUNCTION get_storage_stats()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  db_size bigint;
  db_size_pretty text;
  free_limit_bytes bigint := 524288000; -- 500 MB (Giới hạn gói Free của Supabase)
  used_mb numeric;
  percent numeric;
  table_details json;
BEGIN
  -- 1. Lấy dung lượng thực tế của PostgreSQL Database (bao gồm cả data, index, toast)
  SELECT pg_database_size(current_database()) INTO db_size;
  SELECT pg_size_pretty(db_size) INTO db_size_pretty;
  
  -- Quy đổi ra MB và phần trăm sử dụng
  used_mb := round((db_size::numeric / (1024 * 1024)), 2);
  percent := round((db_size::numeric / free_limit_bytes * 100), 2);
  
  -- 2. Thống kê chi tiết từng bảng trong schema public (tự động nhận diện mọi bảng)
  SELECT coalesce(json_agg(
    json_build_object(
      'table_name', relname,
      'row_count', n_live_tup,
      'size_pretty', pg_size_pretty(pg_total_relation_size(relid)),
      'size_bytes', pg_total_relation_size(relid)
    ) ORDER BY pg_total_relation_size(relid) DESC
  ), '[]'::json)
  FROM pg_stat_user_tables
  WHERE schemaname = 'public'
  INTO table_details;

  RETURN json_build_object(
    'is_real_db_size', true,
    'size_bytes', db_size,
    'size_pretty', db_size_pretty,
    'size_mb', used_mb,
    'max_mb', 500,
    'percent_used', percent,
    'table_sizes', table_details,
    'updated_at', now()
  );
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object(
    'is_real_db_size', false,
    'error', SQLERRM
  );
END;
$$;

-- Cấp quyền gọi hàm cho người dùng đã đăng nhập hoặc khách truy cập
GRANT EXECUTE ON FUNCTION get_storage_stats() TO authenticated, anon, service_role;

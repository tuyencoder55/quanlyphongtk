import { supabase, supabaseAdmin } from '@/lib/supabase'

const client = supabaseAdmin || supabase

export const SUPABASE_SQL_SCRIPT = `-- Copy và dán vào Supabase SQL Editor rồi bấm RUN:
CREATE OR REPLACE FUNCTION get_storage_stats()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  db_size bigint;
  db_size_pretty text;
  free_limit_bytes bigint := 524288000; -- 500 MB (gói Free)
  used_mb numeric;
  percent numeric;
  table_details json;
BEGIN
  SELECT pg_database_size(current_database()) INTO db_size;
  SELECT pg_size_pretty(db_size) INTO db_size_pretty;
  
  used_mb := round((db_size::numeric / (1024 * 1024)), 2);
  percent := round((db_size::numeric / free_limit_bytes * 100), 2);
  
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
END;
$$;

GRANT EXECUTE ON FUNCTION get_storage_stats() TO authenticated, anon, service_role;`

/**
 * Lấy chỉ số dung lượng thực tế từ Supabase PostgreSQL
 */
export async function getSupabaseStorageStats() {
  // 1. Thử gọi hàm RPC get_storage_stats từ Supabase
  try {
    const { data, error } = await client.rpc('get_storage_stats')
    if (!error && data && data.size_mb !== undefined) {
      return {
        success: true,
        isRealRpc: true,
        sizeBytes: data.size_bytes,
        sizeMb: Number(data.size_mb),
        sizePretty: data.size_pretty || `${data.size_mb} MB`,
        maxMb: Number(data.max_mb || 500),
        percentUsed: Number(data.percent_used || ((data.size_mb / 500) * 100).toFixed(2)),
        tableSizes: Array.isArray(data.table_sizes) ? data.table_sizes : [],
        updatedAt: data.updated_at || new Date().toISOString(),
      }
    }
  } catch (rpcErr) {
    console.debug('Hàm get_storage_stats RPC chưa được tạo trong Supabase:', rpcErr)
  }

  // 2. Fallback: Nếu chưa chạy hàm SQL trong Supabase, đếm số dòng từ các bảng thực tế
  try {
    const [emp, time, prof, period, leave] = await Promise.allSettled([
      client.from('employees').select('id', { count: 'exact', head: true }),
      client.from('timesheet_entries').select('id', { count: 'exact', head: true }),
      client.from('profiles').select('id', { count: 'exact', head: true }),
      client.from('timesheet_periods').select('id', { count: 'exact', head: true }),
      client.from('leave_types').select('id', { count: 'exact', head: true }),
    ])

    const empCount = emp.status === 'fulfilled' ? emp.value.count || 0 : 0
    const timeCount = time.status === 'fulfilled' ? time.value.count || 0 : 0
    const profCount = prof.status === 'fulfilled' ? prof.value.count || 0 : 0
    const periodCount = period.status === 'fulfilled' ? period.value.count || 0 : 0
    const leaveCount = leave.status === 'fulfilled' ? leave.value.count || 0 : 0

    const totalRows = empCount + timeCount + profCount + periodCount + leaveCount
    
    // Ước tính kích thước: PostgreSQL Supabase mặc định hệ thống ~16 MB
    // Các bản ghi hiện có kèm index
    const estimatedMb = Number((16.2 + (totalRows * 0.0012)).toFixed(1))
    const percentUsed = Number(((estimatedMb / 500) * 100).toFixed(2))

    const tableSizes = [
      { table_name: 'timesheet_entries', row_count: timeCount, note: 'Bảng chấm công & tăng ca' },
      { table_name: 'profiles', row_count: profCount, note: 'Tài khoản người dùng' },
      { table_name: 'employees', row_count: empCount, note: 'Danh sách nhân viên' },
      { table_name: 'timesheet_periods', row_count: periodCount, note: 'Kỳ chấm công (tháng)' },
      { table_name: 'leave_types', row_count: leaveCount, note: 'Loại nghỉ phép' },
    ]

    return {
      success: true,
      isRealRpc: false,
      sizeMb: estimatedMb,
      sizePretty: `${estimatedMb} MB`,
      maxMb: 500,
      percentUsed,
      tableSizes,
      totalRows,
      updatedAt: new Date().toISOString(),
    }
  } catch (err) {
    return {
      success: false,
      isRealRpc: false,
      sizeMb: 16.5,
      sizePretty: '16.5 MB',
      maxMb: 500,
      percentUsed: 3.3,
      tableSizes: [],
      error: err.message,
      updatedAt: new Date().toISOString(),
    }
  }
}

import { supabase } from '@/lib/supabase'
import { getDaysForMonth } from '@/lib/dateUtils'

/**
 * Tìm kỳ chấm công theo tháng và năm
 */
export async function getTimesheetPeriod(month, year) {
  const { data, error } = await supabase
    .from('timesheet_periods')
    .select('*')
    .eq('month', month)
    .eq('year', year)
    .maybeSingle()

  if (error) throw error
  return data
}

/**
 * Lấy danh sách tất cả các kỳ đã được tạo (để hiển thị danh sách chuyển đổi nhanh)
 */
export async function getAllPeriods() {
  const { data, error } = await supabase
    .from('timesheet_periods')
    .select('*')
    .order('year', { ascending: false })
    .order('month', { ascending: false })

  if (error) throw error
  return data || []
}

/**
 * Tạo kỳ chấm công mới cho Tháng/Năm + Tự động bulk insert dòng rỗng cho toàn bộ nhân viên active
 */
export async function createTimesheetPeriod(month, year, createdBy) {
  // 1. Tạo kỳ mới trong timesheet_periods
  const { data: newPeriod, error: periodError } = await supabase
    .from('timesheet_periods')
    .insert([
      {
        month,
        year,
        created_by: createdBy || null,
      },
    ])
    .select()
    .single()

  if (periodError) {
    if (periodError.code === '23505') {
      throw new Error(`Kỳ chấm công tháng ${month}/${year} đã tồn tại!`)
    }
    throw periodError
  }

  // 2. Lấy danh sách toàn bộ nhân viên active tại thời điểm bấm nút
  const { data: activeEmployees, error: empError } = await supabase
    .from('employees')
    .select('id, employee_code, full_name')
    .eq('status', 'active')
    .order('employee_code', { ascending: true })

  if (empError) throw empError

  // 3. Tính số ngày trong tháng
  const monthDays = getDaysForMonth(year, month)

  // 4. Bulk insert entries rỗng nếu có nhân viên
  if (activeEmployees && activeEmployees.length > 0) {
    const entriesToInsert = []

    for (const emp of activeEmployees) {
      for (const d of monthDays) {
        // Dòng đi làm (work - 上班)
        entriesToInsert.push({
          period_id: newPeriod.id,
          employee_id: emp.id,
          row_type: 'work',
          day: d.day,
          value_hours: d.isSunday ? 0 : 8,
          leave_code: null,
          leave_hours: 0,
        })
        // Dòng tăng ca (overtime - 加班)
        entriesToInsert.push({
          period_id: newPeriod.id,
          employee_id: emp.id,
          row_type: 'overtime',
          day: d.day,
          value_hours: 0,
          leave_code: null,
          leave_hours: 0,
        })
      }
    }

    // Insert theo khối để tối ưu tốc độ mạng
    const CHUNK_SIZE = 500
    for (let i = 0; i < entriesToInsert.length; i += CHUNK_SIZE) {
      const chunk = entriesToInsert.slice(i, i + CHUNK_SIZE)
      const { error: insertChunkError } = await supabase
        .from('timesheet_entries')
        .insert(chunk)

      if (insertChunkError) {
        console.error('Lỗi khi insert khối timesheet_entries:', insertChunkError)
        throw insertChunkError
      }
    }
  }

  return newPeriod
}

/**
 * Tải toàn bộ dữ liệu chấm công của 1 kỳ (kèm thông tin nhân viên, có thể lọc theo bộ phận)
 */
export async function getPeriodData(periodId, department = null) {
  // Lấy toàn bộ entries của kỳ
  const { data: entries, error: entriesError } = await supabase
    .from('timesheet_entries')
    .select('*')
    .eq('period_id', periodId)

  if (entriesError) throw entriesError

  // Lấy danh sách nhân viên (cả active và inactive nếu đã từng có dữ liệu trong kỳ này)
  const { data: allEmployees, error: empError } = await supabase
    .from('employees')
    .select('*')
    .order('employee_code', { ascending: true })

  if (empError) throw empError

  // Đảm bảo mọi nhân viên luôn có department (fallback 'TK')
  const mappedEmployees = (allEmployees || []).map((emp) => ({
    ...emp,
    department: emp.department || 'TK',
  }))

  // Tập hợp danh sách employee_id có trong entries
  const employeeIdsInPeriod = new Set(entries.map((e) => e.employee_id))
  
  // Những nhân viên active HOẶC đã có dữ liệu trong kỳ này sẽ được hiển thị
  let relevantEmployees = mappedEmployees.filter(
    (emp) => emp.status === 'active' || employeeIdsInPeriod.has(emp.id)
  )

  // Lọc theo bộ phận nếu được chỉ định
  if (department) {
    relevantEmployees = relevantEmployees.filter(
      (emp) => emp.department === department
    )
  }

  return {
    entries: entries || [],
    employees: relevantEmployees || [],
    allEmployees: mappedEmployees,
  }
}

/**
 * Cập nhật giá trị cho 1 ô chấm công cụ thể
 */
export async function updateTimesheetCell({ entryId, periodId, employeeId, rowType, day, valueHours, leaveCode, leaveHours }) {
  const payload = {
    value_hours: valueHours === '' || valueHours === null ? 0 : Number(valueHours),
    leave_code: leaveCode || null,
    leave_hours: leaveHours === '' || leaveHours === null ? 0 : Number(leaveHours),
    updated_at: new Date().toISOString(),
  }

  // Nếu đã có entryId thì update theo id
  if (entryId) {
    const { data, error } = await supabase
      .from('timesheet_entries')
      .update(payload)
      .eq('id', entryId)
      .select()
      .single()

    if (error) throw error
    return data
  }

  // Nếu chưa có id (trường hợp hiếm) -> upsert theo unique key (period_id, employee_id, row_type, day)
  const { data, error } = await supabase
    .from('timesheet_entries')
    .upsert({
      period_id: periodId,
      employee_id: employeeId,
      row_type: rowType,
      day,
      ...payload,
    })
    .select()
    .single()

  if (error) throw error
  return data
}

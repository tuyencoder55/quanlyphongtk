import { supabase } from '@/lib/supabase'
import { getDaysForMonth } from '@/lib/dateUtils'

/**
 * Lấy danh sách toàn bộ nhân viên
 */
export async function getEmployees() {
  const { data, error } = await supabase
    .from('employees')
    .select('*')
    .order('created_at', { ascending: true })

  if (error) throw error
  return (data || []).map((emp) => ({
    ...emp,
    department: emp.department || 'TK',
  }))
}

/**
 * Thêm nhân viên mới + tự động sinh ô chấm công nếu có kỳ tháng hiện tại đang mở
 */
export async function createEmployee({ employee_code, full_name, chinese_name, department = 'TK' }) {
  const code = employee_code.trim().toUpperCase()
  const name = full_name.trim()
  const zhName = chinese_name?.trim() || null
  const dept = department || 'TK'

  // 1. Thêm vào bảng employees
  const payload = {
    employee_code: code,
    full_name: name,
    chinese_name: zhName,
    department: dept,
    status: 'active',
  }

  let { data: newEmployee, error: insertError } = await supabase
    .from('employees')
    .insert([payload])
    .select()
    .single()

  // Fallback nếu DB chưa chạy câu lệnh thêm cột department
  if (insertError && (insertError.message?.includes('department') || insertError.code === 'PGRST204')) {
    delete payload.department
    const retry = await supabase.from('employees').insert([payload]).select().single()
    if (retry.error) throw retry.error
    newEmployee = { ...retry.data, department: dept }
    insertError = null
  }

  if (insertError) {
    if (insertError.code === '23505') {
      throw new Error(`Mã nhân viên "${code}" đã tồn tại! Vui lòng chọn mã khác.`)
    }
    throw insertError
  }

  // 2. Kiểm tra xem có kỳ chấm công của tháng/năm hiện tại không
  try {
    const now = new Date()
    const currentMonth = now.getMonth() + 1
    const currentYear = now.getFullYear()

    const { data: currentPeriod } = await supabase
      .from('timesheet_periods')
      .select('id, month, year')
      .eq('month', currentMonth)
      .eq('year', currentYear)
      .maybeSingle()

    // 3. Nếu kỳ hiện tại đã mở -> tự động sinh các dòng chấm công rỗng cho nhân viên này
    if (currentPeriod) {
      const monthDays = getDaysForMonth(currentYear, currentMonth)
      const entriesToInsert = []

      monthDays.forEach((d) => {
        // Dòng giờ công thường (work)
        entriesToInsert.push({
          period_id: currentPeriod.id,
          employee_id: newEmployee.id,
          row_type: 'work',
          day: d.day,
          value_hours: d.isSunday ? 0 : 8,
          leave_code: null,
          leave_hours: 0,
        })
        // Dòng tăng ca (overtime)
        entriesToInsert.push({
          period_id: currentPeriod.id,
          employee_id: newEmployee.id,
          row_type: 'overtime',
          day: d.day,
          value_hours: 0,
          leave_code: null,
          leave_hours: 0,
        })
      })

      const { error: entriesError } = await supabase
        .from('timesheet_entries')
        .insert(entriesToInsert)

      if (entriesError) {
        console.warn('Lỗi khi sinh dòng chấm công tự động cho nhân viên mới:', entriesError)
      }
    }
  } catch (err) {
    console.warn('Không thể kiểm tra hoặc sinh kỳ chấm công:', err)
  }

  return newEmployee
}

/**
 * Cập nhật thông tin nhân viên
 */
export async function updateEmployee(id, { employee_code, full_name, chinese_name, department, status }) {
  const updates = {
    employee_code: employee_code.trim().toUpperCase(),
    full_name: full_name.trim(),
    chinese_name: chinese_name?.trim() || null,
    updated_at: new Date().toISOString(),
  }

  if (department) {
    updates.department = department
  }

  if (status) {
    updates.status = status
  }

  let { data, error } = await supabase
    .from('employees')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  // Fallback nếu DB chưa có cột department
  if (error && (error.message?.includes('department') || error.code === 'PGRST204')) {
    delete updates.department
    const retry = await supabase.from('employees').update(updates).eq('id', id).select().single()
    if (retry.error) throw retry.error
    data = { ...retry.data, department: department || 'TK' }
    error = null
  }

  if (error) {
    if (error.code === '23505') {
      throw new Error(`Mã nhân viên "${updates.employee_code}" đã trùng với người khác!`)
    }
    throw error
  }

  return data
}

/**
 * Xoá mềm nhân viên (chuyển status thành inactive, bảo toàn lịch sử chấm công)
 */
export async function deleteEmployee(id) {
  const { data, error } = await supabase
    .from('employees')
    .update({ 
      status: 'inactive', 
      updated_at: new Date().toISOString() 
    })
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

/**
 * Kích hoạt lại nhân viên (chuyển status về active)
 */
export async function restoreEmployee(id) {
  const { data, error } = await supabase
    .from('employees')
    .update({ 
      status: 'active', 
      updated_at: new Date().toISOString() 
    })
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

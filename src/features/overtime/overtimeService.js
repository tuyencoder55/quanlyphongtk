import { supabase, supabaseAdmin } from '@/lib/supabase'

// Key lưu trữ localStorage cho chi tiết giờ vào / giờ ra của các ca tăng ca
const STORAGE_KEY = 'quanlyphongtk_overtime_details_v1'
const OVERTIME_DETAIL_KEY = STORAGE_KEY

// Lý do tăng ca mặc định theo từng bộ phận
export const DEFAULT_OVERTIME_REASONS = {
  TK: 'Xử lý file / 处理档案',
  CTP: 'Xuất rửa bảng, sắp xếp bảng CTP/出版、洗版、整理CTP版。'
}

export function getDefaultOvertimeReason(department) {
  return department === 'CTP' ? DEFAULT_OVERTIME_REASONS.CTP : DEFAULT_OVERTIME_REASONS.TK
}

function getSavedDetails() {
  try {
    const raw = localStorage.getItem(OVERTIME_DETAIL_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

function saveDetailToStorage(key, detail) {
  try {
    const all = getSavedDetails()
    all[key] = detail
    localStorage.setItem(OVERTIME_DETAIL_KEY, JSON.stringify(all))
  } catch (err) {
    console.warn('Lỗi lưu overtime detail vào storage:', err)
  }
}

function removeDetailFromStorage(key) {
  try {
    const all = getSavedDetails()
    delete all[key]
    localStorage.setItem(OVERTIME_DETAIL_KEY, JSON.stringify(all))
  } catch (err) {
    console.warn('Lỗi xoá overtime detail:', err)
  }
}

/**
 * Tính số giờ tăng ca làm tròn theo quy tắc 30 phút (lùi)
 * Ví dụ: 
 * - 16:30 -> 17:00: 30p = 0.5h
 * - 16:30 -> 17:15: 45p -> làm tròn thành 30p = 0.5h
 * - 16:30 -> 17:30: 60p = 1.0h
 * - 16:30 -> 18:40: 130p -> làm tròn 120p = 2.0h
 * - Ca Chủ Nhật qua trưa (ví dụ 7:30 -> 16:30 = 9 tiếng trừ 1h trưa = 8h)
 */
export function calculateOvertimeHours(startTimeStr, endTimeStr, isSunday = false) {
  if (!startTimeStr || !endTimeStr) return 0

  const [startH, startM] = String(startTimeStr).replace('h', ':').split(':').map(Number)
  const [endH, endM] = String(endTimeStr).replace('h', ':').split(':').map(Number)

  const startTotalMinutes = (isNaN(startH) ? 0 : startH) * 60 + (isNaN(startM) ? 0 : startM)
  let endTotalMinutes = (isNaN(endH) ? 0 : endH) * 60 + (isNaN(endM) ? 0 : endM)

  // Nếu giờ về qua nửa đêm
  if (endTotalMinutes < startTotalMinutes) {
    endTotalMinutes += 24 * 60
  }

  let diffMinutes = endTotalMinutes - startTotalMinutes
  if (diffMinutes <= 0) return 0

  // Nếu là Chủ Nhật và ca làm kéo dài qua giờ ăn trưa (từ trước 11:30 đến sau 12:30)
  if (isSunday && startTotalMinutes <= 11 * 60 + 30 && endTotalMinutes >= 12 * 60 + 30) {
    diffMinutes = Math.max(0, diffMinutes - 60) // Trừ 1 tiếng nghỉ trưa
  }

  // Quy tắc làm tròn lùi về mốc 30 phút (floor)
  const rounded30MinBlocks = Math.floor(diffMinutes / 30)
  const hours = rounded30MinBlocks * 0.5

  return Math.min(24, Math.max(0, hours))
}

/**
 * Tạo chuỗi thời gian kết thúc mặc định dựa trên giờ bắt đầu và số giờ
 * Ví dụ: 16:30 + 2h = '18:30'
 */
export function calculateEndTimeFromHours(startTimeStr, hours, isSunday = false) {
  if (!startTimeStr || !hours) return ''
  const [startH, startM] = String(startTimeStr).replace('h', ':').split(':').map(Number)
  let totalMinutes = (isNaN(startH) ? 0 : startH) * 60 + (isNaN(startM) ? 0 : startM) + hours * 60

  // Nếu là ca ngày Chủ nhật có trừ giờ trưa (trên 5 tiếng và qua trưa)
  if (isSunday && hours >= 4) {
    totalMinutes += 60 // Bù lại 1h nghỉ trưa
  }

  const endH = Math.floor(totalMinutes / 60) % 24
  const endM = totalMinutes % 60
  return `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`
}

/**
 * Định dạng chuỗi hiển thị cột Thời gian:
 * Ví dụ: 01/08/2026 16h30 — 17h30
 */
export function formatOvertimeTimeString(day, month, year, startTime, endTime) {
  const dd = String(day).padStart(2, '0')
  const mm = String(month).padStart(2, '0')
  const yyyy = year

  const startFormatted = startTime ? startTime.replace(':', 'h') : '16h30'
  const endFormatted = endTime ? endTime.replace(':', 'h') : ''

  return `${dd}/${mm}/${yyyy} ${startFormatted} — ${endFormatted}`
}

/**
 * Lấy danh sách ca tăng ca trong tháng của một nhân viên
 * Nguồn dữ liệu: bảng `timesheet_entries`:
 * - Ngày thường: lấy các dòng `row_type = 'overtime'`
 * - Ngày Chủ Nhật: lấy các dòng `row_type = 'work'` (hàng 上班 theo đúng biểu mẫu gốc)
 */
export async function getEmployeeOvertimeEntries(periodId, employeeId, periodMonth, periodYear, days = [], department = 'TK') {
  const { data: entries, error } = await supabase
    .from('timesheet_entries')
    .select('*')
    .eq('period_id', periodId)
    .eq('employee_id', employeeId)
    .gt('value_hours', 0)
    .order('day', { ascending: true })

  if (error) throw error

  const sundayDays = (days || []).filter((d) => d.isSunday).map((d) => d.day)

  // Lọc các ca tăng ca:
  // 1. Ngày thường: lấy dòng row_type = 'overtime'
  // 2. Ngày Chủ Nhật: ưu tiên dòng row_type = 'work' (nếu có cả overtime cũ thì chỉ lấy 1)
  const entryByDay = new Map()

  for (const entry of (entries || [])) {
    const isSunday = sundayDays.length > 0 
      ? sundayDays.includes(entry.day)
      : (new Date(periodYear, periodMonth - 1, entry.day).getDay() === 0)

    if (isSunday) {
      if (entry.row_type === 'work' || !entryByDay.has(entry.day)) {
        entryByDay.set(entry.day, entry)
      }
    } else {
      if (entry.row_type === 'overtime') {
        entryByDay.set(entry.day, entry)
      }
    }
  }

  const overtimeList = Array.from(entryByDay.values()).sort((a, b) => a.day - b.day)
  const savedDetails = getSavedDetails()
  const defaultReason = getDefaultOvertimeReason(department)

  // Ghép chi tiết giờ vào, giờ ra cho từng ngày có tăng ca
  return overtimeList.map((entry) => {
    const isSunday = sundayDays.length > 0 
      ? sundayDays.includes(entry.day)
      : (new Date(periodYear, periodMonth - 1, entry.day).getDay() === 0)

    const storageKey = `${periodId}_${employeeId}_${entry.day}`
    const detail = savedDetails[storageKey]

    // Giờ bắt đầu mặc định: 07:30 nếu là Chủ nhật, 16:30 nếu ngày thường
    const defaultStartTime = isSunday ? '07:30' : '16:30'
    const startTime = detail?.startTime || defaultStartTime
    
    // Giờ kết thúc LUÔN ĐƯỢC CHUẨN HÓA LÀM TRÒN theo số giờ tăng ca (ví dụ 16h30 -> 19h42 tính 3h phải ghi là 16h30 — 19h30)
    const roundedEndTime = calculateEndTimeFromHours(startTime, Number(entry.value_hours), isSunday)
    const endTime = roundedEndTime || detail?.endTime || ''
    
    // Nếu chưa có lý do hoặc dữ liệu cũ của CTP đang mang lý do của TK thì tự chuyển sang CTP
    let reason = detail?.reason
    if (!reason || (department === 'CTP' && reason === DEFAULT_OVERTIME_REASONS.TK)) {
      reason = defaultReason
    }

    return {
      entryId: entry.id,
      periodId,
      employeeId,
      day: entry.day,
      hours: Number(entry.value_hours),
      startTime,
      endTime,
      reason,
      isSunday,
      dateString: `${String(entry.day).padStart(2, '0')}/${String(periodMonth).padStart(2, '0')}/${periodYear}`,
      timeRangeFormatted: formatOvertimeTimeString(entry.day, periodMonth, periodYear, startTime, endTime),
    }
  })
}

/**
 * Lưu hoặc cập nhật một ca tăng ca
 * - Ngày thường: lưu vào dòng `overtime` (加班)
 * - Ngày Chủ Nhật: lưu vào dòng `work` (上班) theo đúng chuẩn biểu mẫu gốc,
 *   đồng thời reset dòng `overtime` về 0 để không bị trùng lặp ở dưới.
 */
export async function saveOvertimeEntry({
  periodId,
  employeeId,
  day,
  hours,
  startTime,
  endTime,
  reason,
  department = 'TK',
  isSunday
}) {
  const dayNum = Number(day)
  const hoursNum = Number(hours)
  const defaultReason = getDefaultOvertimeReason(department)
  const finalReason = reason?.trim() || defaultReason

  // Xác định ngày có phải Chủ Nhật hay không nếu chưa truyền vào
  let isSun = isSunday
  if (typeof isSun !== 'boolean') {
    const { data: periodData } = await supabase
      .from('timesheet_periods')
      .select('month, year')
      .eq('id', periodId)
      .single()
    if (periodData) {
      isSun = new Date(periodData.year, periodData.month - 1, dayNum).getDay() === 0
    } else {
      isSun = false
    }
  }

  // Ngày CN lưu vào dòng work (上班), ngày thường lưu vào dòng overtime (加班)
  const targetRowType = isSun ? 'work' : 'overtime'

  // 1. Kiểm tra xem ô ngày này trong timesheet_entries đã có chưa
  const { data: existing } = await supabaseAdmin
    .from('timesheet_entries')
    .select('id')
    .eq('period_id', periodId)
    .eq('employee_id', employeeId)
    .eq('row_type', targetRowType)
    .eq('day', dayNum)
    .single()

  if (existing) {
    // Cập nhật số giờ
    const { error: updateErr } = await supabaseAdmin
      .from('timesheet_entries')
      .update({
        value_hours: hoursNum,
        updated_at: new Date().toISOString()
      })
      .eq('id', existing.id)

    if (updateErr) throw updateErr
  } else {
    // Thêm mới
    const { error: insertErr } = await supabaseAdmin
      .from('timesheet_entries')
      .insert({
        period_id: periodId,
        employee_id: employeeId,
        row_type: targetRowType,
        day: dayNum,
        value_hours: hoursNum
      })

    if (insertErr) throw insertErr
  }

  // 2. Nếu là Chủ Nhật, đảm bảo ô dòng overtime (加班) được reset về 0 (tránh lưu đè/lẫn ở dưới)
  if (isSun) {
    await supabaseAdmin
      .from('timesheet_entries')
      .update({
        value_hours: 0,
        updated_at: new Date().toISOString()
      })
      .eq('period_id', periodId)
      .eq('employee_id', employeeId)
      .eq('row_type', 'overtime')
      .eq('day', dayNum)
  }

  // 3. Lưu chi tiết giờ vào / giờ ra / lý do vào localStorage
  const storageKey = `${periodId}_${employeeId}_${dayNum}`
  saveDetailToStorage(storageKey, {
    startTime,
    endTime,
    reason: finalReason
  })

  return { success: true }
}

/**
 * Xoá một ca tăng ca
 * - Nếu là Chủ Nhật: reset dòng `work` về 0 (và cả dòng `overtime` nếu có)
 * - Nếu là ngày thường: reset dòng `overtime` về 0
 */
export async function deleteOvertimeEntry(periodId, employeeId, day, isSunday) {
  const dayNum = Number(day)

  let isSun = isSunday
  if (typeof isSun !== 'boolean') {
    const { data: periodData } = await supabase
      .from('timesheet_periods')
      .select('month, year')
      .eq('id', periodId)
      .single()
    if (periodData) {
      isSun = new Date(periodData.year, periodData.month - 1, dayNum).getDay() === 0
    }
  }

  // Nếu là Chủ Nhật, reset cả dòng work
  if (isSun) {
    await supabaseAdmin
      .from('timesheet_entries')
      .update({
        value_hours: 0,
        updated_at: new Date().toISOString()
      })
      .eq('period_id', periodId)
      .eq('employee_id', employeeId)
      .eq('row_type', 'work')
      .eq('day', dayNum)
  }

  // Luôn reset dòng overtime về 0
  const { data, error } = await supabaseAdmin
    .from('timesheet_entries')
    .update({
      value_hours: 0,
      updated_at: new Date().toISOString()
    })
    .eq('period_id', periodId)
    .eq('employee_id', employeeId)
    .eq('row_type', 'overtime')
    .eq('day', dayNum)

  if (error) throw error

  const storageKey = `${periodId}_${employeeId}_${dayNum}`
  removeDetailFromStorage(storageKey)

  return { success: true, data }
}

/**
 * Chấm nhanh Xuống ca hôm nay (1 chạm)
 * Lấy giờ máy tính hiện tại, làm tròn theo quy tắc 30p lùi, lưu ngay
 */
export async function quickClockOutToday(periodId, employeeId, isSunday = false, department = 'TK') {
  const now = new Date()
  const currentDay = now.getDate()
  const currentHour = now.getHours()
  const currentMinute = now.getMinutes()

  const defaultStartTime = isSunday ? '07:30' : '16:30'
  const endTime = `${String(currentHour).padStart(2, '0')}:${String(currentMinute).padStart(2, '0')}`

  // Tính số giờ làm tròn lùi về mốc 30 phút
  const hours = calculateOvertimeHours(defaultStartTime, endTime, isSunday)

  if (hours <= 0) {
    throw new Error(`Hiện tại mới ${endTime}, chưa đủ 30 phút tăng ca tính từ mốc ${defaultStartTime}!`)
  }

  // Giờ kết thúc được làm tròn theo số giờ được tính (ví dụ 16h30 -> 19h42 tính 3h thì ghi là 19:30)
  const roundedEndTime = calculateEndTimeFromHours(defaultStartTime, hours, isSunday)
  const defaultReason = getDefaultOvertimeReason(department)

  await saveOvertimeEntry({
    periodId,
    employeeId,
    day: currentDay,
    hours,
    startTime: defaultStartTime,
    endTime: roundedEndTime,
    reason: defaultReason,
    department,
    isSunday
  })

  return {
    day: currentDay,
    hours,
    startTime: defaultStartTime,
    endTime: roundedEndTime
  }
}

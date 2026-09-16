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

  const [startH, startM] = startTimeStr.split(':').map(Number)
  const [endH, endM] = endTimeStr.split(':').map(Number)

  const startTotalMinutes = startH * 60 + startM
  let endTotalMinutes = endH * 60 + endM

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
  const [startH, startM] = startTimeStr.split(':').map(Number)
  let totalMinutes = startH * 60 + startM + hours * 60

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
 * Nguồn dữ liệu: bảng `timesheet_entries` (lọc row_type = 'overtime' và value_hours > 0)
 */
export async function getEmployeeOvertimeEntries(periodId, employeeId, periodMonth, periodYear, days, department = 'TK') {
  const { data: entries, error } = await supabase
    .from('timesheet_entries')
    .select('*')
    .eq('period_id', periodId)
    .eq('employee_id', employeeId)
    .eq('row_type', 'overtime')
    .gt('value_hours', 0)
    .order('day', { ascending: true })

  if (error) throw error

  const savedDetails = getSavedDetails()
  const defaultReason = getDefaultOvertimeReason(department)

  // Ghép chi tiết giờ vào, giờ ra cho từng ngày có tăng ca
  return (entries || []).map((entry) => {
    const dayInfo = days.find((d) => d.day === entry.day)
    const isSunday = dayInfo?.isSunday || false
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
 * Tự động đồng bộ sang bảng timesheet_entries với row_type = 'overtime'
 */
export async function saveOvertimeEntry({
  periodId,
  employeeId,
  day,
  hours,
  startTime,
  endTime,
  reason,
  department = 'TK'
}) {
  const dayNum = Number(day)
  const hoursNum = Number(hours)
  const defaultReason = getDefaultOvertimeReason(department)
  const finalReason = reason?.trim() || defaultReason

  // 1. Kiểm tra xem ô ngày này trong timesheet_entries đã có chưa
  const { data: existing } = await supabaseAdmin
    .from('timesheet_entries')
    .select('id')
    .eq('period_id', periodId)
    .eq('employee_id', employeeId)
    .eq('row_type', 'overtime')
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
        row_type: 'overtime',
        day: dayNum,
        value_hours: hoursNum
      })

    if (insertErr) throw insertErr
  }

  // 2. Lưu chi tiết giờ vào / giờ ra / lý do vào localStorage
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
 * Cập nhật số giờ về 0 trong timesheet_entries và xoá chi tiết trong localStorage
 */
export async function deleteOvertimeEntry(periodId, employeeId, day) {
  const dayNum = Number(day)

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
    department
  })

  return {
    day: currentDay,
    hours,
    startTime: defaultStartTime,
    endTime: roundedEndTime
  }
}

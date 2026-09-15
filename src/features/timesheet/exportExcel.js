import * as XLSX from 'xlsx'

/**
 * Xuất dữ liệu bảng chấm công sang file Excel (.xlsx) đúng định dạng và thiết lập khổ A4 Landscape
 */
export function exportTimesheetToExcel({ 
  period, 
  days, 
  employees, 
  entries, 
  leaveTypes = [],
  department = { code: 'TK', nameVi: 'THIẾT KẾ', nameZh: '设计部', label: 'Phòng Thiết Kế' }
}) {
  // 1. Tạo Map truy vấn ô: `${empId}_${rowType}_${day}` -> entry
  const entryMap = new Map()
  entries.forEach((e) => {
    entryMap.set(`${e.employee_id}_${e.row_type}_${e.day}`, e)
  })

  // Map tra cứu loại phép
  const leaveTypeMap = new Map()
  leaveTypes.forEach((lt) => {
    leaveTypeMap.set(lt.code, lt)
  })

  // 2. Chuẩn bị ma trận dữ liệu (aoa - array of arrays)
  const aoa = []

  // Dòng 1: Tiêu đề lớn
  const deptTitleVi = department?.nameVi || 'THIẾT KẾ'
  const deptTitleZh = department?.nameZh || '设计部'
  aoa.push([
    `BỘ PHẬN: ${deptTitleVi} (${deptTitleZh})`,
    ...Array(3).fill(''),
    `BIỂU CHẤM CÔNG THÁNG ${String(period.month).padStart(2, '0')}/${period.year}`,
  ])
  aoa.push([]) // Dòng trống cách điệu

  // Dòng 3: Header Tầng 1 (Số Ngày & Cột Tổng)
  const headerRow1 = [
    'STT\n序号',
    'MÃ SỐ\n编号',
    'HỌ VÀ TÊN\n越南姓名',
    'LOẠI\n班次',
    ...days.map((d) => d.dayFormatted),
    'Tổng Ngày Thường',
    'Tổng ngày CN',
  ]
  aoa.push(headerRow1)

  // Dòng 4: Header Tầng 2 (Thứ Tiếng Trung: 星期...)
  const headerRow2 = [
    '',
    '',
    '',
    '',
    ...days.map((d) => d.zh),
    '',
    '',
  ]
  aoa.push(headerRow2)

  // Dòng 5: Header Tầng 3 (Thứ Tiếng Việt: T2...CN + Phụ đề tiếng Trung cho cột tổng)
  const headerRow3 = [
    '',
    '',
    '',
    '',
    ...days.map((d) => d.vi),
    '平时合计',
    '周日合计',
  ]
  aoa.push(headerRow3)

  // Danh sách các vùng merge (gộp ô)
  const merges = [
    // Tiêu đề
    { s: { r: 0, c: 0 }, e: { r: 0, c: 3 } },
    { s: { r: 0, c: 4 }, e: { r: 0, c: days.length + 5 } },
    // Gộp ô cột cố định (3 dòng header)
    { s: { r: 2, c: 0 }, e: { r: 4, c: 0 } }, // STT
    { s: { r: 2, c: 1 }, e: { r: 4, c: 1 } }, // MÃ SỐ
    { s: { r: 2, c: 2 }, e: { r: 4, c: 2 } }, // HỌ TÊN
    { s: { r: 2, c: 3 }, e: { r: 4, c: 3 } }, // LOẠI
    // Gộp 2 dòng header cho cột tổng
    { s: { r: 2, c: days.length + 4 }, e: { r: 3, c: days.length + 4 } }, // Tổng Ngày Thường
    { s: { r: 2, c: days.length + 5 }, e: { r: 3, c: days.length + 5 } }, // Tổng ngày CN
  ]

  let currentRowIdx = 5

  // Dòng dữ liệu từng nhân viên
  employees.forEach((emp, empIdx) => {
    let workWeekday = 0
    let workSunday = 0
    let otWeekday = 0
    let otSunday = 0

    // Dữ liệu dòng Công (上班)
    const workRowCells = days.map((d) => {
      const entry = entryMap.get(`${emp.id}_work_${d.day}`)
      const hours = Number(entry?.value_hours || 0)
      const leaveCode = entry?.leave_code
      const leaveHours = Number(entry?.leave_hours || 0)

      // Quy tắc tính công: tra cứu theo loại phép động
      const targetLeaveType = leaveCode ? leaveTypeMap.get(leaveCode) : null
      const isPaid = targetLeaveType ? targetLeaveType.is_paid : (leaveCode === 'PN')
      const paidLeaveHours = isPaid ? leaveHours : 0
      const totalDayWork = hours + paidLeaveHours

      if (d.isSunday) {
        workSunday += hours
      } else {
        workWeekday += totalDayWork
      }

      if (leaveCode) {
        return hours > 0 ? `${hours}/${leaveCode}${leaveHours}` : leaveCode
      }
      return hours > 0 ? hours : ''
    })

    // Dữ liệu dòng Tăng ca (加班)
    const otRowCells = days.map((d) => {
      const entry = entryMap.get(`${emp.id}_overtime_${d.day}`)
      const hours = Number(entry?.value_hours || 0)

      if (d.isSunday) {
        otSunday += hours
      } else {
        otWeekday += hours
      }

      return hours > 0 ? hours : ''
    })

    // 1. Thêm Hàng 1 (Công)
    aoa.push([
      empIdx + 1,
      emp.employee_code,
      emp.full_name,
      '上班',
      ...workRowCells,
      workWeekday > 0 ? workWeekday : 0,
      workSunday > 0 ? workSunday : 0,
    ])

    // 2. Thêm Hàng 2 (Tăng ca)
    aoa.push([
      '',
      '',
      emp.chinese_name || '',
      '加班',
      ...otRowCells,
      otWeekday > 0 ? otWeekday : 0,
      otSunday > 0 ? otSunday : 0,
    ])

    // Merge STT và Mã số qua 2 hàng của nhân viên
    merges.push({ s: { r: currentRowIdx, c: 0 }, e: { r: currentRowIdx + 1, c: 0 } })
    merges.push({ s: { r: currentRowIdx, c: 1 }, e: { r: currentRowIdx + 1, c: 1 } })

    currentRowIdx += 2
  })

  // 3. Tạo Workbook và Worksheet
  const ws = XLSX.utils.aoa_to_sheet(aoa)

  // Gán cấu hình merge ô
  ws['!merges'] = merges

  // Độ rộng các cột (tối ưu cho khổ giấy ngang A4)
  const cols = [
    { wch: 5 },  // STT
    { wch: 10 }, // MÃ SỐ
    { wch: 22 }, // HỌ VÀ TÊN
    { wch: 7 },  // LOẠI CÔNG
    ...days.map(() => ({ wch: 4 })), // Mỗi ngày 4 ký tự
    { wch: 12 }, // Tổng Ngày Thường
    { wch: 10 }, // Tổng ngày CN
  ]
  ws['!cols'] = cols

  // Thiết lập trang in đúng chuẩn A4 Landscape (In ấn không bị tràn)
  ws['!pageSetup'] = {
    orientation: 'landscape',
    paperSize: 9,      // 9 = A4 trong chuẩn Excel
    fitToPage: true,
    fitToWidth: 1,     // Ép vừa vặn 1 trang ngang
    fitToHeight: 0,    // Chiều dọc cuộn tự nhiên theo số nhân viên
  }

  // Căn lề in hẹp (0.3 inch)
  ws['!margins'] = {
    left: 0.25,
    right: 0.25,
    top: 0.4,
    bottom: 0.4,
    header: 0.2,
    footer: 0.2,
  }

  const wb = XLSX.utils.book_new()
  const deptCode = department?.code || 'TK'
  const sheetName = `${deptCode}_Tháng ${period.month}-${period.year}`
  XLSX.utils.book_append_sheet(wb, ws, sheetName)

  // Xuất file
  const fileName = `Bang_Cham_Cong_${deptCode}_Thang_${String(period.month).padStart(2, '0')}_${period.year}.xlsx`
  XLSX.writeFile(wb, fileName)
}

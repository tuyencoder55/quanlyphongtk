import { supabase, supabaseAdmin } from '@/lib/supabase'
import { getDaysForMonth } from '@/lib/dateUtils'
import ExcelJS from 'exceljs'

const LOCAL_STORAGE_PREFIX = 'quanlyphongtk_meal_report_'

function getStorageKey(year, month, department) {
  return `${LOCAL_STORAGE_PREFIX}${year}_${month}_${department || 'TK'}`
}

/**
 * Đọc dữ liệu từ localStorage
 */
function getLocalMealReport(year, month, department) {
  try {
    const raw = localStorage.getItem(getStorageKey(year, month, department))
    return raw ? JSON.parse(raw) : {}
  } catch (err) {
    console.warn('Lỗi đọc meal report từ localStorage:', err)
    return {}
  }
}

/**
 * Lưu dữ liệu vào localStorage
 */
function saveLocalMealReport(year, month, department, dataMap) {
  try {
    localStorage.setItem(getStorageKey(year, month, department), JSON.stringify(dataMap))
  } catch (err) {
    console.warn('Lỗi ghi meal report vào localStorage:', err)
  }
}

/**
 * Lấy dữ liệu biểu báo cơm của một tháng/năm cụ thể
 * Trả về danh sách đủ số ngày trong tháng (từ ngày 01 đến 28/29/30/31)
 */
export async function getMealReport(month, year, department = 'TK') {
  const daysInMonth = getDaysForMonth(year, month)
  const localMap = getLocalMealReport(year, month, department)
  const dbMap = {}

  try {
    const client = supabaseAdmin || supabase
    const { data, error } = await client
      .from('meal_entries')
      .select('*')
      .eq('month', month)
      .eq('year', year)
      .eq('department', department)

    if (!error && Array.isArray(data)) {
      data.forEach((item) => {
        dbMap[item.day] = item
      })
    }
  } catch (err) {
    console.warn('Bảng meal_entries chưa có trên Supabase, dùng dữ liệu lưu trữ trình duyệt:', err)
  }

  // Kết hợp dữ liệu ngày + DB + LocalStorage
  return daysInMonth.map((d) => {
    const saved = dbMap[d.day] || localMap[d.day] || {}
    const mm = String(month).padStart(2, '0')
    const dd = String(d.day).padStart(2, '0')
    const dateFormattedZh = `${year}年${mm}月${dd}日`

    return {
      day: d.day,
      dayFormatted: d.dayFormatted,
      dateFormattedZh,
      vi: d.vi,
      zh: d.zh,
      isSunday: d.isSunday,
      total_people: saved.total_people !== undefined ? saved.total_people : (d.isSunday ? 0 : 0),
      absent_count: saved.absent_count !== undefined ? saved.absent_count : 0,
      lunch_count: saved.lunch_count !== undefined ? saved.lunch_count : 0,
      dinner_count: saved.dinner_count !== undefined ? saved.dinner_count : 0,
      notes: saved.notes || ''
    }
  })
}

/**
 * Lưu toàn bộ bảng báo cơm của tháng
 */
export async function saveMealReport(month, year, entries, department = 'TK') {
  // 1. Lưu ngay vào localStorage
  const dataMap = {}
  entries.forEach((item) => {
    dataMap[item.day] = {
      total_people: Number(item.total_people) || 0,
      absent_count: Number(item.absent_count) || 0,
      lunch_count: Number(item.lunch_count) || 0,
      dinner_count: Number(item.dinner_count) || 0,
      notes: item.notes || ''
    }
  })
  saveLocalMealReport(year, month, department, dataMap)

  // 2. Thử lưu vào Supabase meal_entries nếu bảng đã được tạo
  try {
    const client = supabaseAdmin || supabase
    const rows = entries.map((item) => ({
      month,
      year,
      day: item.day,
      department,
      total_people: Number(item.total_people) || 0,
      absent_count: Number(item.absent_count) || 0,
      lunch_count: Number(item.lunch_count) || 0,
      dinner_count: Number(item.dinner_count) || 0,
      notes: item.notes || '',
      updated_at: new Date().toISOString()
    }))

    const { error } = await client
      .from('meal_entries')
      .upsert(rows, { onConflict: 'month, year, day, department' })

    if (error) {
      console.warn('Lỗi ghi Supabase (có thể bảng chưa được chạy migration):', error.message)
    }
  } catch (err) {
    console.warn('Không thể kết nối bảng meal_entries trên Supabase:', err)
  }

  return { success: true }
}

/**
 * Xuất file Excel chuẩn y như mẫu gốc
 */
export async function exportMealReportExcel(month, year, entries, department = 'TK') {
  const workbook = new ExcelJS.Workbook()
  const worksheet = workbook.addWorksheet(`BaoCom_${month}_${year}`)

  // Đặt độ rộng các cột (A -> F)
  worksheet.columns = [
    { key: 'date', width: 22 },
    { key: 'dow', width: 10 },
    { key: 'total', width: 18 },
    { key: 'absent', width: 12 },
    { key: 'lunch', width: 14 },
    { key: 'dinner', width: 14 }
  ]

  // Tiêu đề công ty
  worksheet.mergeCells('A1:F1')
  const r1 = worksheet.getCell('A1')
  r1.value = '立盛包装责任有限公司'
  r1.alignment = { horizontal: 'center', vertical: 'middle' }
  r1.font = { name: 'Times New Roman', size: 13, bold: true }

  worksheet.mergeCells('A2:F2')
  const r2 = worksheet.getCell('A2')
  r2.value = 'CÔNG TY TNHH BAO BÌ LẬP THỊNH'
  r2.alignment = { horizontal: 'center', vertical: 'middle' }
  r2.font = { name: 'Times New Roman', size: 14, bold: true }

  // Tiêu đề biểu mẫu
  worksheet.mergeCells('A3:F3')
  const r3 = worksheet.getCell('A3')
  r3.value = 'BIỂU BÁO CƠM HÀNG NGÀY'
  r3.alignment = { horizontal: 'center', vertical: 'middle' }
  r3.font = { name: 'Times New Roman', size: 15, bold: true }

  worksheet.mergeCells('A4:F4')
  const r4 = worksheet.getCell('A4')
  r4.value = '每天报饭报表'
  r4.alignment = { horizontal: 'center', vertical: 'middle' }
  r4.font = { name: 'Times New Roman', size: 14, bold: true }

  worksheet.mergeCells('A5:F5')
  const r5 = worksheet.getCell('A5')
  r5.value = `BỘ PHẬN : ${department === 'CTP' ? 'CTP' : 'THIẾT KẾ'}`
  r5.alignment = { horizontal: 'center', vertical: 'middle' }
  r5.font = { name: 'Times New Roman', size: 11, bold: true }

  // Header 2 dòng cho bảng
  const headerRow1 = worksheet.addRow([
    'NGÀY THÁNG NĂM',
    '星期',
    '实际上班人员',
    '请假',
    '中午',
    '下午'
  ])
  headerRow1.height = 20
  headerRow1.font = { name: 'Times New Roman', size: 10, bold: true }
  headerRow1.alignment = { horizontal: 'center', vertical: 'middle' }

  const headerRow2 = worksheet.addRow([
    '年日月',
    'THỨ',
    'TỔNG SỐ NGƯỜI',
    'VẮNG',
    'TRƯA',
    'CHIỀU'
  ])
  headerRow2.height = 20
  headerRow2.font = { name: 'Times New Roman', size: 10, bold: true }
  headerRow2.alignment = { horizontal: 'center', vertical: 'middle' }

  // Border style
  const thinBorder = {
    top: { style: 'thin' },
    left: { style: 'thin' },
    bottom: { style: 'thin' },
    right: { style: 'thin' }
  }

  // Dữ liệu từng ngày
  let sumTotal = 0
  let sumAbsent = 0
  let sumLunch = 0
  let sumDinner = 0

  entries.forEach((item) => {
    const total = Number(item.total_people) || 0
    const absent = Number(item.absent_count) || 0
    const lunch = Number(item.lunch_count) || 0
    const dinner = Number(item.dinner_count) || 0

    sumTotal += total
    sumAbsent += absent
    sumLunch += lunch
    sumDinner += dinner

    const row = worksheet.addRow([
      item.dateFormattedZh,
      item.vi,
      total,
      absent,
      lunch,
      dinner
    ])
    row.height = 19
    row.font = { name: 'Times New Roman', size: 11, bold: item.isSunday }
    row.alignment = { horizontal: 'center', vertical: 'middle' }

    row.eachCell((cell) => {
      cell.border = thinBorder
    })
  })

  // Đóng khung cho 2 dòng header
  headerRow1.eachCell((cell) => { cell.border = thinBorder })
  headerRow2.eachCell((cell) => { cell.border = thinBorder })

  // Dòng Tổng cộng
  const totalRow = worksheet.addRow([
    '合计TỔNG :',
    '',
    sumTotal,
    sumAbsent,
    sumLunch,
    sumDinner
  ])
  totalRow.height = 22
  totalRow.font = { name: 'Times New Roman', size: 11, bold: true }
  totalRow.alignment = { horizontal: 'center', vertical: 'middle' }
  worksheet.mergeCells(`A${totalRow.number}:B${totalRow.number}`)

  totalRow.eachCell((cell) => {
    cell.border = thinBorder
  })

  // Dòng cách
  worksheet.addRow([])

  // Chữ ký
  const signTitleRow = worksheet.addRow([
    '部门经理',
    '',
    '',
    '',
    '制表',
    ''
  ])
  signTitleRow.font = { name: 'Times New Roman', size: 11, bold: true }
  signTitleRow.alignment = { horizontal: 'center', vertical: 'middle' }
  worksheet.mergeCells(`A${signTitleRow.number}:C${signTitleRow.number}`)
  worksheet.mergeCells(`E${signTitleRow.number}:F${signTitleRow.number}`)

  const signRoleRow = worksheet.addRow([
    'GIÁM ĐỐC BỘ PHẬN',
    '',
    '',
    '',
    'NGƯỜI LẬP BIỂU',
    ''
  ])
  signRoleRow.font = { name: 'Times New Roman', size: 11, bold: true }
  signRoleRow.alignment = { horizontal: 'center', vertical: 'middle' }
  worksheet.mergeCells(`A${signRoleRow.number}:C${signRoleRow.number}`)
  worksheet.mergeCells(`E${signRoleRow.number}:F${signRoleRow.number}`)

  // Tải file về máy
  const buffer = await workbook.xlsx.writeBuffer()
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
  const url = window.URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `Bieu_Bao_Com_${department}_Thang_${String(month).padStart(2, '0')}_${year}.xlsx`
  a.click()
  window.URL.revokeObjectURL(url)
}

import * as XLSX from 'xlsx'

/**
 * Xuất file Excel Giấy Đề Nghị Tăng Ca chuẩn khổ A4 Dọc (Portrait) theo mẫu biểu tăng ca.png
 */
export function exportOvertimeToExcel({ period, employee, entries = [], reason = 'Xử lý file / 处理档案' }) {
  const aoa = []

  // 1. Quốc hiệu & Tiêu ngữ
  aoa.push(['', '', 'CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM'])
  aoa.push(['', '', '越南社会主义共和国'])
  aoa.push(['', '', 'Độc lập - Tự do - Hạnh phúc'])
  aoa.push(['', '', '独立-自由-幸福'])
  aoa.push(['', '', '*********'])
  aoa.push(['', '', '', '', '', `......, Ngày/日 ... Tháng/月 ${String(period?.month).padStart(2, '0')} Năm/年 ${period?.year}`])
  aoa.push([])

  // 2. Tiêu đề biểu mẫu
  aoa.push(['', '', 'GIẤY ĐỀ NGHỊ TĂNG CA'])
  aoa.push(['', '', '加班申请单'])
  aoa.push([])

  // 3. Kính gửi & Thông tin chung
  aoa.push(['Kính gửi/敬致:'])
  aoa.push(['- Ban Giám đốc Công ty TNHH BAO BÌ LẬP THỊNH 立盛包装责任有限公司董事会'])
  aoa.push(['- Phòng Hành chính Nhân sự 人事部'])
  aoa.push(['- Phòng bộ phận/部门 : Thiết kế 设计部'])
  aoa.push([`Kỳ tăng ca/日期 : Tháng/月 ${String(period?.month).padStart(2, '0')} Năm/年 ${period?.year}`])
  aoa.push([`Lý do tăng ca/加班理由: ${reason}`])
  aoa.push(['Đề nghị Công ty chấp thuận cho chúng tôi được tăng ca: 建议公司允许我们加班'])
  aoa.push([])

  // 4. Header Bảng chi tiết
  const tableHeaderIndex = aoa.length
  aoa.push([
    'STT\n序号',
    'MSNV\n工号',
    'Họ và tên\n姓名',
    'Thời gian 时间\n(Từ .....giờ ..... đến ...... giờ .....)',
    'TỔNG GIỜ\n总工时',
    'Nhân viên ký nhận\n签名',
    'Người xác nhận\n确认',
  ])

  // 5. Thân bảng: Danh sách các ca
  let totalHours = 0
  entries.forEach((entry, idx) => {
    totalHours += Number(entry.hours || 0)
    aoa.push([
      idx + 1,
      employee?.employee_code || '',
      employee?.full_name || '',
      entry.timeRangeFormatted || '',
      entry.hours || 0,
      '', // Ký nhận
      '', // Người xác nhận
    ])
  })

  // Thêm các dòng trống bổ sung nếu số ca < 30 để file in căng đều chuẩn 30 dòng (A4 Dọc)
  const minRows = 30
  const emptyRows = Math.max(0, minRows - entries.length)
  for (let i = 0; i < emptyRows; i++) {
    aoa.push([
      entries.length + i + 1,
      employee?.employee_code || '',
      employee?.full_name || '',
      '',
      '',
      '',
      '',
    ])
  }

  aoa.push([])
  aoa.push([])

  // 6. Chân trang ký tên
  aoa.push([
    'TP. Hành chính Nhân sự',
    '',
    '',
    '',
    'Người đề nghị',
    '',
    '',
  ])
  aoa.push([
    '(Xác nhận, ký, ghi rõ họ tên)',
    '',
    '',
    '',
    '(Ký, ghi rõ họ tên)',
    '',
    '',
  ])
  aoa.push([
    '人事确认',
    '',
    '',
    '',
    '申请人',
    '',
    '',
  ])
  aoa.push([])
  aoa.push([])
  aoa.push([])
  aoa.push([
    '',
    '',
    '',
    '',
    employee?.full_name || '',
    '',
    '',
  ])

  // Tạo Worksheet & Workbook
  const ws = XLSX.utils.aoa_to_sheet(aoa)

  // Độ rộng cột
  ws['!cols'] = [
    { wch: 8 },  // STT
    { wch: 12 }, // MSNV
    { wch: 25 }, // Họ tên
    { wch: 32 }, // Thời gian
    { wch: 12 }, // Tổng giờ
    { wch: 16 }, // Nhân viên ký
    { wch: 16 }, // Người xác nhận
  ]

  // Gộp ô (merges)
  const merges = [
    // Quốc hiệu
    { s: { r: 0, c: 2 }, e: { r: 0, c: 4 } },
    { s: { r: 1, c: 2 }, e: { r: 1, c: 4 } },
    { s: { r: 2, c: 2 }, e: { r: 2, c: 4 } },
    { s: { r: 3, c: 2 }, e: { r: 3, c: 4 } },
    { s: { r: 4, c: 2 }, e: { r: 4, c: 4 } },
    // Tiêu đề
    { s: { r: 7, c: 2 }, e: { r: 7, c: 4 } },
    { s: { r: 8, c: 2 }, e: { r: 8, c: 4 } },
  ]
  ws['!merges'] = merges

  // Cấu hình in ấn Khổ A4 Dọc (Portrait)
  ws['!pageSetup'] = {
    paperSize: 9, // A4
    orientation: 'portrait',
    fitToPage: true,
    fitToWidth: 1,
    fitToHeight: 1,
  }

  const wb = XLSX.utils.book_new()
  const sheetName = `TangCa_${employee?.employee_code || 'NV'}`
  XLSX.utils.book_append_sheet(wb, ws, sheetName.substring(0, 31))

  const fileName = `GiayDeNghiTangCa_${employee?.employee_code}_T${period?.month}_${period?.year}.xlsx`
  XLSX.writeFile(wb, fileName)
}

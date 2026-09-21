import ExcelJS from 'exceljs'
import { LAP_THINH_LOGO_BASE64 } from '@/assets/logo/lapthinhBase64'

/**
 * Xuất file Excel Giấy Đề Nghị Tăng Ca chuẩn khổ A4 Dọc (Portrait)
 * Theo mẫu chuẩn mới nhất: QMS.GL-4005-1加班申请单 ĐƠN XIN TĂNG CA
 * Tích hợp sẵn Logo Bao Bì Lập Thịnh và 3 chữ ký duyệt
 */
export async function exportOvertimeToExcel({ period, employee, entries = [], reason }) {
  const defaultReason = employee?.department === 'CTP'
    ? 'Xuất rửa bảng, sắp xếp bảng CTP/出版、洗版、整理CTP版。'
    : 'Xử lý file / 处理档案'

  const finalReason = (employee?.department === 'CTP' && (!reason || reason === 'Xử lý file / 处理档案'))
    ? defaultReason
    : (reason || defaultReason)

  const deptTitle = (employee?.department === 'CTP') ? 'CTP CTP部' : 'Thiết kế 设计部'

  const wb = new ExcelJS.Workbook()
  wb.creator = 'Phòng Thiết Kế - Bao Bì Lập Thịnh'
  wb.lastModifiedBy = 'Hệ Thống Quản Lý'
  wb.created = new Date()
  wb.modified = new Date()

  const ws = wb.addWorksheet('加班申请单', {
    pageSetup: {
      paperSize: 9, // A4
      orientation: 'portrait',
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 1,
      margins: {
        left: 0.3,
        right: 0.3,
        top: 0.4,
        bottom: 0.4,
        header: 0.2,
        footer: 0.2,
      },
    },
    views: [{ showGridLines: true }]
  })

  // Đặt độ rộng 7 cột chuẩn theo file gốc
  ws.columns = [
    { key: 'stt', width: 8 },      // Col A: STT
    { key: 'msnv', width: 12 },    // Col B: MSNV
    { key: 'name', width: 27 },    // Col C: Họ và tên
    { key: 'date', width: 15 },    // Col D: Ngày tăng ca
    { key: 'time', width: 28 },    // Col E: Thời gian
    { key: 'hours', width: 14 },   // Col F: Tổng giờ
    { key: 'sign', width: 21 },    // Col G: Nhân viên ký tên
  ]

  // Đặt chiều cao các dòng tiêu đề
  ws.getRow(1).height = 32
  ws.getRow(2).height = 32
  ws.getRow(3).height = 15
  ws.getRow(4).height = 18
  ws.getRow(5).height = 46
  ws.getRow(6).height = 20
  ws.getRow(7).height = 22
  ws.getRow(8).height = 22
  ws.getRow(9).height = 22
  ws.getRow(10).height = 26
  ws.getRow(11).height = 30
  ws.getRow(12).height = 46

  // 1. Chèn Logo Lập Thịnh (ở góc trên bên trái ô A1:A2)
  try {
    const imageId = wb.addImage({
      base64: LAP_THINH_LOGO_BASE64,
      extension: 'png',
    })
    ws.addImage(imageId, {
      tl: { col: 0.08, row: 0.12 },
      ext: { width: 56, height: 56 },
    })
  } catch (imgErr) {
    console.warn('Không thể chèn ảnh logo vào Excel:', imgErr)
  }

  // Row 1: Tên Công ty (A1:C1) & Quốc hiệu (D1:G1)
  ws.mergeCells('A1:C1')
  const a1 = ws.getCell('A1')
  a1.value = '                 CÔNG TY TNHH BAO BÌ LẬP THỊNH\n                           立盛包装责任有限公司'
  a1.font = { name: 'Times New Roman', size: 10, bold: true }
  a1.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true }

  ws.mergeCells('D1:G1')
  const d1 = ws.getCell('D1')
  d1.value = 'CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM\n越南社会主义共和国'
  d1.font = { name: 'Times New Roman', size: 11, bold: true }
  d1.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true }

  // Row 2: Tiêu ngữ (D2:G2)
  ws.mergeCells('D2:G2')
  const d2 = ws.getCell('D2')
  d2.value = 'Độc lập - Tự do - Hạnh phúc\n独立-自由-幸福'
  d2.font = { name: 'Times New Roman', size: 11, bold: true }
  d2.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true }

  // Row 3: Sao phân cách (D3:G3)
  ws.mergeCells('D3:G3')
  const d3 = ws.getCell('D3')
  d3.value = '*********'
  d3.font = { name: 'Times New Roman', size: 10 }
  d3.alignment = { vertical: 'middle', horizontal: 'center' }

  // Row 4: Ngày tháng năm
  ws.mergeCells('A4:G4')
  const a4 = ws.getCell('A4')
  const monthStr = String(period?.month || '').padStart(2, '0')
  const yearStr = period?.year || '........'
  a4.value = `Ngày 日........tháng月 ${monthStr} ........ năm 年 ${yearStr} ............`
  a4.font = { name: 'Times New Roman', size: 10, italic: true }
  a4.alignment = { vertical: 'middle', horizontal: 'right' }

  // Row 5: Tiêu đề biểu mẫu
  ws.mergeCells('A5:G5')
  const a5 = ws.getCell('A5')
  a5.value = 'GIẤY ĐỀ NGHỊ TĂNG CA \n加班申请单'
  a5.font = { name: 'Times New Roman', size: 16, bold: true }
  a5.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true }

  // Helper cho các dòng thông tin A6 -> A10
  const setMergedInfoRow = (rowNum, text, isBold = false) => {
    ws.mergeCells(`A${rowNum}:G${rowNum}`)
    const cell = ws.getCell(`A${rowNum}`)
    cell.value = text
    cell.font = { name: 'Times New Roman', size: 11, bold: isBold }
    cell.alignment = { vertical: 'middle', horizontal: 'left' }
  }

  setMergedInfoRow(6, 'Kính gửi 敬致: ', true)
  setMergedInfoRow(7, '- Ban Giám đốc Công ty TNHH BAO BÌ LẬP THỊNH 立盛包装责任有限公司董事会')
  setMergedInfoRow(8, '- Phòng Hành chính Nhân sự 人事部')
  setMergedInfoRow(9, `- Phòng bộ phận 部门 : ${deptTitle}`)
  setMergedInfoRow(10, `Lý do tăng ca 加班理由: ${finalReason}`)

  // Row 11: Đề nghị chấp thuận
  ws.mergeCells('A11:G11')
  const a11 = ws.getCell('A11')
  a11.value = 'Đề nghị Công ty chấp thuận cho chúng tôi được tăng ca:\n建议公司允许我们加班'
  a11.font = { name: 'Times New Roman', size: 10, italic: true }
  a11.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true }

  // Row 12: Headers của Bảng
  const headers = [
    'STT\n序号',
    'MSNV\n工号',
    'Họ và tên\n姓名',
    'Ngày tăng ca \n日期',
    'Thời gian (时间)\n(Từ ......giờ ......đến...... giờ ......)',
    'Tổng giờ\n总时间',
    'Nhân viên ký tên\n申请人签名',
  ]

  const borderAll = {
    top: { style: 'thin' },
    left: { style: 'thin' },
    bottom: { style: 'thin' },
    right: { style: 'thin' },
  }

  headers.forEach((h, idx) => {
    const cell = ws.getCell(12, idx + 1)
    cell.value = h
    cell.font = { name: 'Times New Roman', size: 10, bold: true }
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true }
    cell.border = borderAll
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFF5F5F5' },
    }
  })

  // Thân bảng: Danh sách các ca
  const startRow = 13
  const minRows = 19
  const totalRowsCount = Math.max(minRows, entries.length)

  for (let i = 0; i < totalRowsCount; i++) {
    const currentRow = startRow + i
    const entry = entries[i]
    ws.getRow(currentRow).height = 24

    const dd = entry?.day ? String(entry.day).padStart(2, '0') : ''
    const mm = period?.month ? String(period.month).padStart(2, '0') : ''
    const yyyy = period?.year || ''
    const dateFormatted = entry ? `${dd}/${mm}/${yyyy}` : ''

    const timeFormatted = entry
      ? (entry.startTime && entry.endTime ? `${entry.startTime} - ${entry.endTime}` : (entry.timeRangeFormatted || ''))
      : ''

    const rowValues = [
      i + 1,                                       // Col A: STT
      entry ? (employee?.employee_code || '') : '', // Col B: MSNV
      entry ? (employee?.full_name || '') : '',     // Col C: Họ và tên
      dateFormatted,                                // Col D: Ngày tăng ca
      timeFormatted,                                // Col E: Thời gian
      entry ? Number(entry.hours || 0) : '',       // Col F: Tổng giờ
      '',                                          // Col G: Ký tên
    ]

    rowValues.forEach((val, colIdx) => {
      const cell = ws.getCell(currentRow, colIdx + 1)
      cell.value = val
      cell.border = borderAll
      cell.font = { name: 'Times New Roman', size: 11 }

      if (colIdx === 0 || colIdx === 1 || colIdx === 3 || colIdx === 4) {
        cell.alignment = { vertical: 'middle', horizontal: 'center' }
      } else if (colIdx === 2) {
        cell.alignment = { vertical: 'middle', horizontal: 'left' }
      } else if (colIdx === 5) {
        cell.alignment = { vertical: 'middle', horizontal: 'center' }
        cell.font = { name: 'Times New Roman', size: 11, bold: !!entry }
      } else {
        cell.alignment = { vertical: 'middle', horizontal: 'center' }
      }
    })
  }

  // Chân trang: 3 Chữ ký phê duyệt
  const signRow = startRow + totalRowsCount
  ws.getRow(signRow).height = 55

  ws.mergeCells(`A${signRow}:C${signRow}`)
  const cellSign1 = ws.getCell(`A${signRow}`)
  cellSign1.value = 'TP. Hành chính Nhân sự\n(Xác nhận, ký, ghi rõ họ tên)\n人事确认'
  cellSign1.font = { name: 'Times New Roman', size: 10, bold: true }
  cellSign1.alignment = { vertical: 'top', horizontal: 'center', wrapText: true }

  ws.mergeCells(`D${signRow}:E${signRow}`)
  const cellSign2 = ws.getCell(`D${signRow}`)
  cellSign2.value = '   Giám đốc bộ phận\n        (Xác nhận, ký, ghi rõ họ tên)\n             部门经理确认'
  cellSign2.font = { name: 'Times New Roman', size: 10, bold: true }
  cellSign2.alignment = { vertical: 'top', horizontal: 'center', wrapText: true }

  ws.mergeCells(`F${signRow}:G${signRow}`)
  const cellSign3 = ws.getCell(`F${signRow}`)
  cellSign3.value = '       Trưởng bộ phận\n        (Xác nhận, ký, ghi rõ họ tên)\n             部门管理确认'
  cellSign3.font = { name: 'Times New Roman', size: 10, bold: true }
  cellSign3.alignment = { vertical: 'top', horizontal: 'center', wrapText: true }

  // Mã số biểu mẫu: QMS.GL-4005-1 (ở góc dưới bên phải)
  const codeRow = signRow + 5
  const codeCell = ws.getCell(`G${codeRow}`)
  codeCell.value = '表单编号 Mã số biểu：QMS.GL-4005-1'
  codeCell.font = { name: 'Times New Roman', size: 9.5, italic: true }
  codeCell.alignment = { vertical: 'middle', horizontal: 'right' }

  // Tạo buffer và kích hoạt tải về trên trình duyệt
  const buffer = await wb.xlsx.writeBuffer()
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `GiayDeNghiTangCa_${employee?.employee_code}_T${period?.month}_${period?.year}.xlsx`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

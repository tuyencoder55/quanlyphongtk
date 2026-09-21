import React from 'react'
import { Pencil, Trash2 } from 'lucide-react'
import lapthinhLogo from '@/assets/logo/lapthinh.png'

export default function OvertimeSheet({
  period,
  employee,
  entries = [],
  reason,
  isBulkPrint = false,
  canEdit = false,
  onEditEntry,
  onDeleteEntry
}) {
  const defaultReason = employee?.department === 'CTP'
    ? 'Xuất rửa bảng, sắp xếp bảng CTP/出版、洗版、整理CTP版。'
    : 'Xử lý file / 处理档案'

  // Ưu tiên lý do của CTP nếu nhân viên thuộc CTP và chưa có lý do riêng biệt
  const displayReason = (employee?.department === 'CTP' && (!reason || reason === 'Xử lý file / 处理档案'))
    ? defaultReason
    : (reason || defaultReason)

  // Bảng chuẩn 19 dòng theo mẫu biểu Excel QMS.GL-4005-1 (vừa vặn chuẩn khổ A4 dọc)
  const minRows = 19
  const emptyRowsCount = Math.max(0, minRows - entries.length)

  // Định dạng ngày tăng ca
  const formatEntryDate = (entry) => {
    if (entry.dateString) return entry.dateString
    const dd = String(entry.day).padStart(2, '0')
    const mm = String(period?.month).padStart(2, '0')
    const yyyy = period?.year
    return `${dd}/${mm}/${yyyy}`
  }

  // Định dạng khung giờ (Từ ... đến ...)
  const formatTimeOnly = (entry) => {
    if (entry.startTime && entry.endTime) {
      return `${entry.startTime} — ${entry.endTime}`
    }
    return entry.timeRangeFormatted || ''
  }

  return (
    <div className={`overtime-sheet bg-white text-black p-4 sm:p-5 rounded-2xl shadow-lg border border-slate-200 print:shadow-none print:border-none print:p-0 print:m-0 print:rounded-none max-w-[820px] mx-auto text-sm font-sans ${isBulkPrint ? 'page-break-after-always' : ''}`}>
      {/* 1. ĐẦU TRANG: LOGO + CÔNG TY (TRÁI) & QUỐC HIỆU (PHẢI) */}
      <div className="grid grid-cols-2 items-center gap-2 mb-1">
        {/* Góc trái: Logo + Tên Công ty */}
        <div className="flex items-center gap-2">
          <img
            src={lapthinhLogo}
            alt="Logo Lập Thịnh"
            className="w-12 h-12 sm:w-14 sm:h-14 object-contain shrink-0"
          />
          <div className="leading-tight">
            <div className="font-bold text-[8.5pt] sm:text-[9.5pt] uppercase text-black tracking-tight">
              CÔNG TY TNHH BAO BÌ LẬP THỊNH
            </div>
            <div className="text-[7.5pt] sm:text-[8.5pt] font-medium text-slate-700">
              立盛包装责任有限公司
            </div>
          </div>
        </div>

        {/* Góc phải: Quốc hiệu & Tiêu ngữ */}
        <div className="text-center leading-tight">
          <div className="font-bold text-[9pt] sm:text-[10pt] uppercase tracking-wide">
            CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM
          </div>
          <div className="text-[7.5pt] sm:text-[8.5pt] text-slate-700 font-medium">
            越南社会主义共和国
          </div>
          <div className="font-bold text-[8.5pt] sm:text-[9.5pt] mt-0.5">
            Độc lập - Tự do - Hạnh phúc
          </div>
          <div className="text-[7.5pt] sm:text-[8pt] text-slate-700 font-medium">
            独立-自由-幸福
          </div>
          <div className="text-[9px] tracking-widest text-slate-400 font-serif leading-none">
            *********
          </div>
        </div>
      </div>

      {/* Dòng ngày tháng */}
      <div className="text-right text-[7.5pt] sm:text-[8pt] italic text-slate-600 mb-0.5">
        Ngày 日........tháng月 {String(period?.month || '').padStart(2, '0')}........ năm 年 {period?.year || '............'}............
      </div>

      {/* 2. TIÊU ĐỀ BIỂU MẪU */}
      <div className="text-center my-1">
        <h1 className="text-[12pt] sm:text-[13pt] font-extrabold uppercase tracking-wider text-black leading-tight">
          GIẤY ĐỀ NGHỊ TĂNG CA
        </h1>
        <div className="text-[9.5pt] sm:text-[10pt] font-bold text-slate-800 leading-tight">
          加班申请单
        </div>
      </div>

      {/* 3. PHẦN KÍNH GỬI & THÔNG TIN CHUNG */}
      <div className="space-y-0.5 text-[7.5pt] sm:text-[8pt] mb-1.5 leading-tight">
        <div className="font-bold underline">
          Kính gửi 敬致:
        </div>
        <div className="pl-3">
          - <span className="font-semibold">Ban Giám đốc Công ty TNHH BAO BÌ LẬP THỊNH</span> <span className="text-slate-600">立盛包装责任有限公司董事会</span>
        </div>
        <div className="pl-3">
          - <span className="font-semibold">Phòng Hành chính Nhân sự</span> <span className="text-slate-600">人事部</span>
        </div>
        <div className="pl-3">
          - <span className="font-semibold">Phòng bộ phận 部门 :</span> <span className="font-bold text-blue-900">{employee?.department === 'CTP' ? 'CTP CTP部' : 'Thiết kế 设计部'}</span>
        </div>
        <div className="pl-3">
          <span className="font-semibold">Lý do tăng ca 加班理由:</span> <span className="font-medium underline underline-offset-2">{displayReason}</span>
        </div>
        <div className="font-semibold text-center italic pt-0.5 text-[7.5pt]">
          Đề nghị Công ty chấp thuận cho chúng tôi được tăng ca:
          <span className="block text-[7pt] not-italic text-slate-600">建议公司允许我们加班</span>
        </div>
      </div>

      {/* 4. BẢNG CHI TIẾT CÁC CA TĂNG CA (CHUẨN 19 DÒNG) */}
      <div className="overflow-x-auto print:overflow-visible">
        <table className="w-full border-collapse border border-black text-[7pt] leading-none text-center">
          <thead>
            <tr className="bg-slate-50 print:bg-transparent font-bold">
              <th className="border border-black px-1 py-0.5 w-8">
                <div>STT</div>
                <div className="text-[6pt] font-normal text-slate-600">序号</div>
              </th>
              <th className="border border-black px-1 py-0.5 w-16">
                <div>MSNV</div>
                <div className="text-[6pt] font-normal text-slate-600">工号</div>
              </th>
              <th className="border border-black px-1.5 py-0.5 w-36 text-left">
                <div>Họ và tên</div>
                <div className="text-[6pt] font-normal text-slate-600">姓名</div>
              </th>
              <th className="border border-black px-1 py-0.5 w-24">
                <div>Ngày tăng ca</div>
                <div className="text-[6pt] font-normal text-slate-600">日期</div>
              </th>
              <th className="border border-black px-1.5 py-0.5">
                <div>Thời gian (时间)</div>
                <div className="text-[6pt] font-normal text-slate-600">(Từ ......giờ ......đến...... giờ ......)</div>
              </th>
              <th className="border border-black px-1 py-0.5 w-14">
                <div>Tổng giờ</div>
                <div className="text-[6pt] font-normal text-slate-600">总时间</div>
              </th>
              <th className="border border-black px-1 py-0.5 w-24">
                <div>Nhân viên ký tên</div>
                <div className="text-[6pt] font-normal text-slate-600">申请人签名</div>
              </th>
            </tr>
          </thead>
          <tbody>
            {entries.length === 0 ? (
              <tr>
                <td colSpan={7} className="border border-black py-8 text-center text-slate-500 italic">
                  Chưa có ca tăng ca nào được ghi nhận cho nhân viên {employee?.full_name} trong tháng {period?.month}/{period?.year}.
                </td>
              </tr>
            ) : (
              entries.map((entry, idx) => (
                <tr key={entry.entryId || idx} className="hover:bg-slate-50/80">
                  <td className="border border-black py-0 px-1 font-semibold h-[18px] print:h-[17px]">
                    {idx + 1}
                  </td>
                  <td className="border border-black py-0 px-1 font-mono font-bold">
                    {employee?.employee_code}
                  </td>
                  <td className="border border-black py-0 px-1.5 text-left font-bold tracking-tight truncate">
                    {employee?.full_name}
                  </td>
                  <td className="border border-black py-0 px-1 font-mono font-medium text-center">
                    {formatEntryDate(entry)}
                  </td>
                  <td className="border border-black py-0 px-1.5 font-mono font-medium text-center group">
                    <div className="flex items-center justify-center gap-1">
                      <span
                        className={canEdit ? "cursor-pointer hover:text-blue-700 hover:underline transition-colors" : ""}
                        title={canEdit ? `Bấm để chỉnh sửa ca ngày ${entry.day}` : undefined}
                        onClick={() => canEdit && onEditEntry?.(entry)}
                      >
                        {formatTimeOnly(entry)}
                      </span>
                      {canEdit && !isBulkPrint && (
                        <div className="print:hidden inline-flex items-center gap-0.5 opacity-70 group-hover:opacity-100 transition-opacity">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              onEditEntry?.(entry)
                            }}
                            title={`Chỉnh sửa ca ngày ${entry.day}`}
                            className="p-0.5 rounded hover:bg-blue-100 text-blue-600 hover:text-blue-800 transition-colors"
                          >
                            <Pencil className="w-2.5 h-2.5" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              onDeleteEntry?.(entry.day)
                            }}
                            title={`Xoá ca ngày ${entry.day}`}
                            className="p-0.5 rounded hover:bg-red-100 text-red-500 hover:text-red-700 transition-colors"
                          >
                            <Trash2 className="w-2.5 h-2.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="border border-black py-0 px-1 font-bold text-blue-900 print:text-black">
                    {entry.hours}
                  </td>
                  <td className="border border-black py-0 px-1">
                    <span className="print:hidden text-[8px] text-slate-400 italic">Ký tay</span>
                  </td>
                </tr>
              ))
            )}

            {/* Các dòng kẻ trống bổ sung để bảng luôn có đủ 19 dòng chuẩn mẫu */}
            {entries.length > 0 && Array.from({ length: emptyRowsCount }).map((_, i) => (
              <tr key={`empty_${i}`}>
                <td className="border border-black py-0 px-1 text-slate-400 font-normal h-[18px] print:h-[17px]">
                  {entries.length + i + 1}
                </td>
                <td className="border border-black py-0 px-1 font-mono text-slate-400">
                  {employee?.employee_code}
                </td>
                <td className="border border-black py-0 px-1.5 text-left text-slate-400 truncate">
                  {employee?.full_name}
                </td>
                <td className="border border-black py-0 px-1">&nbsp;</td>
                <td className="border border-black py-0 px-1.5">&nbsp;</td>
                <td className="border border-black py-0 px-1">&nbsp;</td>
                <td className="border border-black py-0 px-1">&nbsp;</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 5. PHẦN CHỮ KÝ CHÂN TRANG: 3 CỘT PHÊ DUYỆT */}
      <div className="grid grid-cols-3 text-center text-[7.5pt] sm:text-[8pt] font-bold mt-2 pt-1 text-black page-break-inside-avoid break-inside-avoid">
        {/* Cột 1: TP. Hành chính Nhân sự */}
        <div>
          <div className="uppercase">TP. Hành chính Nhân sự</div>
          <div className="text-[6.5pt] sm:text-[7pt] text-slate-600 font-normal italic">
            (Xác nhận, ký, ghi rõ họ tên)
          </div>
          <div className="text-[6.5pt] sm:text-[7pt] text-slate-500 font-normal">人事确认</div>
          <div className="h-9 print:h-10"></div>
          <div className="text-[7.5pt] font-normal text-slate-400 print:text-black">
            ...................................................
          </div>
        </div>

        {/* Cột 2: Giám đốc bộ phận */}
        <div>
          <div className="uppercase">Giám đốc bộ phận</div>
          <div className="text-[6.5pt] sm:text-[7pt] text-slate-600 font-normal italic">
            (Xác nhận, ký, ghi rõ họ tên)
          </div>
          <div className="text-[6.5pt] sm:text-[7pt] text-slate-500 font-normal">部门经理确认</div>
          <div className="h-9 print:h-10"></div>
          <div className="text-[7.5pt] font-normal text-slate-400 print:text-black">
            ...................................................
          </div>
        </div>

        {/* Cột 3: Trưởng bộ phận */}
        <div>
          <div className="uppercase">Trưởng bộ phận</div>
          <div className="text-[6.5pt] sm:text-[7pt] text-slate-600 font-normal italic">
            (Xác nhận, ký, ghi rõ họ tên)
          </div>
          <div className="text-[6.5pt] sm:text-[7pt] text-slate-500 font-normal">部门管理确认</div>
          <div className="h-9 print:h-10"></div>
          <div className="text-[7.5pt] font-normal text-slate-400 print:text-black">
            ...................................................
          </div>
        </div>
      </div>

      {/* 6. MÃ SỐ BIỂU MẪU GÓC DƯỚI CÙNG BÊN PHẢI */}
      <div className="text-right text-[7pt] sm:text-[7.5pt] text-slate-500 font-serif mt-2 pr-1">
        表单编号 Mã số biểu：QMS.GL-4005-1
      </div>
    </div>
  )
}

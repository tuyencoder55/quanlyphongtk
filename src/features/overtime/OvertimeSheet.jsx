import React from 'react'
import { Pencil, Trash2 } from 'lucide-react'

export default function OvertimeSheet({
  period,
  employee,
  entries = [],
  reason = 'Xử lý file / 处理档案',
  isBulkPrint = false,
  canEdit = false,
  onEditEntry,
  onDeleteEntry
}) {
  const totalHours = entries.reduce((sum, e) => sum + Number(e.hours || 0), 0)

  // Bảng chuẩn 30 dòng theo yêu cầu (đầy đủ cho cả tháng, vừa khít 1 trang A4 dọc)
  const minRows = 30
  const emptyRowsCount = Math.max(0, minRows - entries.length)

  return (
    <div className={`overtime-sheet bg-white text-black p-4 sm:p-5 rounded-2xl shadow-lg border border-slate-200 print:shadow-none print:border-none print:p-0 print:m-0 print:rounded-none max-w-[820px] mx-auto text-sm font-sans ${isBulkPrint ? 'page-break-after-always' : ''}`}>
      {/* 1. QUỐC HIỆU & TIÊU NGỮ */}
      <div className="text-center mb-0.5 leading-tight">
        <div className="font-bold text-[10.5pt] uppercase tracking-wide">
          CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM
        </div>
        <div className="text-[8.5pt] text-slate-700 font-medium">
          越南社会主义共和国
        </div>
        <div className="font-bold text-[9.5pt] mt-0.5">
          Độc lập - Tự do - Hạnh phúc
        </div>
        <div className="text-[8pt] text-slate-700 font-medium">
          独立 - 自由 - 幸福
        </div>
        <div className="text-[10px] tracking-widest text-slate-400 font-serif leading-none">
          *********
        </div>
        <div className="text-right text-[7.5pt] italic mt-0.5 text-slate-600">
          ..........., Ngày/日 ..... Tháng/月 {String(period?.month).padStart(2, '0')} Năm/年 {period?.year}
        </div>
      </div>

      {/* 2. TIÊU ĐỀ BIỂU MẪU */}
      <div className="text-center my-0.5">
        <h1 className="text-[12.5pt] font-extrabold uppercase tracking-wider text-black leading-tight">
          GIẤY ĐỀ NGHỊ TĂNG CA
        </h1>
        <div className="text-[10pt] font-bold text-slate-800 leading-tight">
          加班申请单
        </div>
      </div>

      {/* 3. PHẦN KÍNH GỬI & THÔNG TIN CHUNG */}
      <div className="space-y-0.5 text-[8pt] mb-1 leading-tight">
        <div className="font-bold underline">
          Kính gửi / 敬致:
        </div>
        <div className="pl-3">
          - <span className="font-semibold">Ban Giám đốc Công ty TNHH BAO BÌ LẬP THỊNH</span> <span className="text-slate-600">/ 立盛包装责任有限公司董事会</span>
        </div>
        <div className="pl-3">
          - <span className="font-semibold">Phòng Hành chính Nhân sự</span> <span className="text-slate-600">/ 人事部</span>
        </div>
        <div className="pl-3">
          - <span className="font-semibold">Phòng bộ phận / 部门:</span> <span className="font-bold text-blue-900">{employee?.department === 'CTP' ? 'CTP / CTP部' : 'Thiết kế / 设计部'}</span>
        </div>
        <div className="pl-3 flex flex-wrap gap-4">
          <div>
            <span className="font-semibold">Kỳ tăng ca / 日期:</span> Tháng/月 <span className="font-bold">{String(period?.month).padStart(2, '0')}</span> Năm/年 <span className="font-bold">{period?.year}</span>
          </div>
        </div>
        <div className="pl-3">
          <span className="font-semibold">Lý do tăng ca / 加班理由:</span> <span className="font-medium underline underline-offset-2">{reason}</span>
        </div>
        <div className="font-semibold text-center italic pt-0.5 text-[7.5pt]">
          Đề nghị Công ty chấp thuận cho chúng tôi được tăng ca / 建议公司允许我们加班:
        </div>
      </div>

      {/* 4. BẢNG CHI TIẾT CÁC CA TĂNG CA (30 DÒNG) */}
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
              <th className="border border-black px-1.5 py-0.5">
                <div>Thời gian / 时间</div>
                <div className="text-[6pt] font-normal text-slate-600">(Từ .....giờ ..... đến ...... giờ .....)</div>
              </th>
              <th className="border border-black px-1 py-0.5 w-14">
                <div>TỔNG GIỜ</div>
                <div className="text-[6pt] font-normal text-slate-600">总工时</div>
              </th>
              <th className="border border-black px-1 py-0.5 w-18">
                <div>Nhân viên ký nhận</div>
                <div className="text-[6pt] font-normal text-slate-600">签名</div>
              </th>
              <th className="border border-black px-1 py-0.5 w-18">
                <div>Người xác nhận</div>
                <div className="text-[6pt] font-normal text-slate-600">确认</div>
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
                  <td className="border border-black py-0 px-1.5 font-mono font-medium text-center group">
                    <div className="flex items-center justify-center gap-1">
                      <span
                        className={canEdit ? "cursor-pointer hover:text-blue-700 hover:underline transition-colors" : ""}
                        title={canEdit ? `Bấm để chỉnh sửa ca ngày ${entry.day}` : undefined}
                        onClick={() => canEdit && onEditEntry?.(entry)}
                      >
                        {entry.timeRangeFormatted}
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
                  <td className="border border-black py-0 px-1">
                  </td>
                </tr>
              ))
            )}

            {/* Các dòng kẻ trống bổ sung để bảng luôn có đủ 30 dòng chuẩn mẫu */}
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
                <td className="border border-black py-0 px-1.5">&nbsp;</td>
                <td className="border border-black py-0 px-1">&nbsp;</td>
                <td className="border border-black py-0 px-1">&nbsp;</td>
                <td className="border border-black py-0 px-1">&nbsp;</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 5. PHẦN CHỮ KÝ CHÂN TRANG */}
      <div className="grid grid-cols-2 text-center text-[8pt] font-bold mt-1.5 pt-0.5 text-black page-break-inside-avoid break-inside-avoid">
        <div>
          <div className="uppercase">TP. Hành chính Nhân sự</div>
          <div className="text-[7pt] text-slate-600 font-normal italic">
            (Xác nhận, ký, ghi rõ họ tên)
          </div>
          <div className="text-[7pt] text-slate-500 font-normal">人事确认</div>
          <div className="h-8 print:h-8"></div>
          <div className="text-[7.5pt] font-normal text-slate-400 print:text-black">
            ........................................................
          </div>
        </div>

        <div>
          <div className="uppercase">Người đề nghị</div>
          <div className="text-[7pt] text-slate-600 font-normal italic">
            (Ký, ghi rõ họ tên)
          </div>
          <div className="text-[7pt] text-slate-500 font-normal">申请人</div>
          <div className="h-8 print:h-8"></div>
          <div className="text-[7.5pt] font-bold text-slate-900">
            {employee?.full_name || '........................................................'}
          </div>
        </div>
      </div>
    </div>
  )
}

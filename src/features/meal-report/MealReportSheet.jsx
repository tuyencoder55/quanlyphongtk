import React from 'react'
import lapthinhLogo from '@/assets/logo/lapthinh.png'

export default function MealReportSheet({
  month,
  year,
  department = 'TK',
  entries = [],
  onChangeEntry,
  canEdit = false
}) {
  // Tính tổng cộng 4 cột
  const sumTotal = entries.reduce((acc, curr) => acc + (Number(curr.total_people) || 0), 0)
  const sumAbsent = entries.reduce((acc, curr) => acc + (Number(curr.absent_count) || 0), 0)
  const sumLunch = entries.reduce((acc, curr) => acc + (Number(curr.lunch_count) || 0), 0)
  const sumDinner = entries.reduce((acc, curr) => acc + (Number(curr.dinner_count) || 0), 0)

  const deptDisplayName = department === 'CTP' ? 'CTP' : 'THIẾT KẾ'

  return (
    <div className="meal-report-sheet bg-white text-black p-5 sm:p-7 rounded-2xl shadow-xl border border-slate-300 print:shadow-none print:border-none print:p-0 print:m-0 print:rounded-none max-w-[760px] mx-auto text-xs font-sans">
      {/* 1. ĐẦU BIỂU: LOGO + CÔNG TY (TRUNG - VIỆT) */}
      <div className="flex items-center gap-3 mb-2">
        <img
          src={lapthinhLogo}
          alt="Logo Lập Thịnh"
          className="w-14 h-14 object-contain shrink-0"
        />
        <div className="flex-1 text-center pr-14 leading-tight">
          <div className="font-serif font-bold text-base sm:text-lg text-black tracking-wide">
            立盛包装责任有限公司
          </div>
          <div className="font-sans font-bold text-sm sm:text-base text-black uppercase tracking-tight">
            CÔNG TY TNHH BAO BÌ LẬP THỊNH
          </div>
        </div>
      </div>

      {/* 2. TIÊU ĐỀ BIỂU MẪU */}
      <div className="text-center mb-3">
        <h1 className="font-bold text-base sm:text-lg text-black uppercase tracking-normal">
          BIỂU BÁO CƠM HÀNG NGÀY
        </h1>
        <div className="font-serif font-bold text-sm sm:text-base text-black">
          每天报饭报表
        </div>
        <div className="font-bold text-xs text-black mt-0.5 uppercase tracking-wide">
          BỘ PHẬN : THIẾT KẾ
        </div>
      </div>

      {/* 3. BẢNG DỮ LIỆU */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse border-2 border-black text-center text-xs">
          <thead>
            {/* Header Dòng 1 */}
            <tr className="bg-slate-100 print:bg-transparent font-bold">
              <th className="border border-black px-2 py-1 text-[11px] w-[26%]">
                NGÀY THÁNG NĂM
              </th>
              <th className="border border-black px-1.5 py-1 text-[11px] w-[12%]">
                星期
              </th>
              <th className="border border-black px-1.5 py-1 text-[11px] w-[18%]">
                实际上班人员
              </th>
              <th className="border border-black px-1.5 py-1 text-[11px] w-[14%]">
                请假
              </th>
              <th className="border border-black px-1.5 py-1 text-[11px] w-[15%]">
                中午
              </th>
              <th className="border border-black px-1.5 py-1 text-[11px] w-[15%]">
                下午
              </th>
            </tr>
            {/* Header Dòng 2 */}
            <tr className="bg-slate-100 print:bg-transparent font-bold">
              <th className="border border-black px-2 py-1 text-[11px]">
                年日月
              </th>
              <th className="border border-black px-1.5 py-1 text-[11px]">
                THỨ
              </th>
              <th className="border border-black px-1.5 py-1 text-[11px]">
                TỔNG SỐ NGƯỜI
              </th>
              <th className="border border-black px-1.5 py-1 text-[11px]">
                VẮNG
              </th>
              <th className="border border-black px-1.5 py-1 text-[11px]">
                TRƯA
              </th>
              <th className="border border-black px-1.5 py-1 text-[11px]">
                CHIỀU
              </th>
            </tr>
          </thead>
          <tbody>
            {entries.map((row) => {
              const isSun = row.isSunday
              return (
                <tr
                  key={row.day}
                  className={`hover:bg-blue-50/50 print:hover:bg-transparent transition-colors ${
                    isSun ? 'bg-amber-50/50 print:bg-transparent' : ''
                  }`}
                >
                  {/* Cột 1: NGÀY THÁNG NĂM (年日月) */}
                  <td className="border border-black px-1.5 py-1 font-mono font-semibold text-[11px] text-center select-none">
                    {row.dateFormattedZh}
                  </td>

                  {/* Cột 2: THỨ (星期) */}
                  <td className={`border border-black px-1 py-1 font-bold text-center ${
                    isSun ? 'text-amber-700 print:text-black font-extrabold' : 'text-slate-800 print:text-black'
                  }`}>
                    {row.vi}
                  </td>

                  {/* Cột 3: TỔNG SỐ NGƯỜI (实际上班人员) */}
                  <td className="border border-black p-0 text-center font-mono font-semibold text-xs">
                    {canEdit ? (
                      <>
                        <span className="hidden print:inline-block py-1">
                          {row.total_people || 0}
                        </span>
                        <input
                          type="number"
                          min="0"
                          max="999"
                          value={row.total_people === 0 ? '0' : (row.total_people || '')}
                          onChange={(e) => onChangeEntry(row.day, 'total_people', e.target.value)}
                          className="w-full h-full text-center py-1 font-mono font-semibold text-xs bg-transparent border-none outline-none focus:bg-blue-100/60 print:hidden"
                        />
                      </>
                    ) : (
                      <span className="py-1 block">
                        {row.total_people}
                      </span>
                    )}
                  </td>

                  {/* Cột 4: VẮNG (请假) */}
                  <td className="border border-black p-0 text-center font-mono font-semibold text-xs">
                    {canEdit ? (
                      <>
                        <span className="hidden print:inline-block py-1">
                          {row.absent_count || 0}
                        </span>
                        <input
                          type="number"
                          min="0"
                          max="999"
                          value={row.absent_count === 0 ? '0' : (row.absent_count || '')}
                          onChange={(e) => onChangeEntry(row.day, 'absent_count', e.target.value)}
                          className="w-full h-full text-center py-1 font-mono font-semibold text-xs bg-transparent border-none outline-none focus:bg-blue-100/60 print:hidden"
                        />
                      </>
                    ) : (
                      <span className="py-1 block">
                        {row.absent_count}
                      </span>
                    )}
                  </td>

                  {/* Cột 5: TRƯA (中午) */}
                  <td className="border border-black p-0 text-center font-mono font-semibold text-xs">
                    {canEdit ? (
                      <>
                        <span className="hidden print:inline-block py-1">
                          {row.lunch_count || 0}
                        </span>
                        <input
                          type="number"
                          min="0"
                          max="999"
                          value={row.lunch_count === 0 ? '0' : (row.lunch_count || '')}
                          onChange={(e) => onChangeEntry(row.day, 'lunch_count', e.target.value)}
                          className="w-full h-full text-center py-1 font-mono font-semibold text-xs bg-transparent border-none outline-none focus:bg-blue-100/60 print:hidden"
                        />
                      </>
                    ) : (
                      <span className="py-1 block">
                        {row.lunch_count}
                      </span>
                    )}
                  </td>

                  {/* Cột 6: CHIỀU (下午) */}
                  <td className="border border-black p-0 text-center font-mono font-semibold text-xs">
                    {canEdit ? (
                      <>
                        <span className="hidden print:inline-block py-1">
                          {row.dinner_count || 0}
                        </span>
                        <input
                          type="number"
                          min="0"
                          max="999"
                          value={row.dinner_count === 0 ? '0' : (row.dinner_count || '')}
                          onChange={(e) => onChangeEntry(row.day, 'dinner_count', e.target.value)}
                          className="w-full h-full text-center py-1 font-mono font-semibold text-xs bg-transparent border-none outline-none focus:bg-blue-100/60 print:hidden"
                        />
                      </>
                    ) : (
                      <span className="py-1 block">
                        {row.dinner_count}
                      </span>
                    )}
                  </td>
                </tr>
              )
            })}

            {/* HÀNG TỔNG CỘNG: 合计TỔNG : */}
            <tr className="bg-slate-100 print:bg-transparent font-bold border-t-2 border-black">
              <td colSpan={2} className="border border-black px-2 py-1.5 text-center font-bold text-xs">
                合计TỔNG :
              </td>
              <td className="border border-black px-1.5 py-1.5 font-mono text-center font-bold text-xs">
                {sumTotal}
              </td>
              <td className="border border-black px-1.5 py-1.5 font-mono text-center font-bold text-xs">
                {sumAbsent}
              </td>
              <td className="border border-black px-1.5 py-1.5 font-mono text-center font-bold text-xs">
                {sumLunch}
              </td>
              <td className="border border-black px-1.5 py-1.5 font-mono text-center font-bold text-xs">
                {sumDinner}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* 4. CHỮ KÝ PHÍA DƯỚI (CHUẨN FORM GỐC) */}
      <div className="grid grid-cols-2 mt-6 pt-2 text-center text-xs font-bold print:mt-8">
        <div>
          <div className="font-serif">部门经理</div>
          <div className="uppercase">GIÁM ĐỐC BỘ PHẬN</div>
          <div className="h-16 print:h-20" />
        </div>
        <div>
          <div className="font-serif">制表</div>
          <div className="uppercase">NGƯỜI LẬP BIỂU</div>
          <div className="h-16 print:h-20" />
        </div>
      </div>
    </div>
  )
}

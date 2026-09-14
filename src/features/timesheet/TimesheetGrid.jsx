import React, { useMemo } from 'react'
import TimesheetCell from './TimesheetCell'

export default function TimesheetGrid({ 
  period, 
  days, 
  employees, 
  entries, 
  leaveTypes = [],
  canEdit, 
  onSaveCell,
  onOpenLeaveConfig
}) {
  // Tạo map nhanh để truy vấn ô: `${employee_id}_${row_type}_${day}` -> entry
  const entryMap = useMemo(() => {
    const map = new Map()
    entries.forEach((e) => {
      const key = `${e.employee_id}_${e.row_type}_${e.day}`
      map.set(key, e)
    })
    return map
  }, [entries])

  // Tạo map nhanh để tra cứu thuộc tính loại phép (is_paid, color, ...)
  const leaveTypeMap = useMemo(() => {
    const map = new Map()
    leaveTypes.forEach((lt) => {
      map.set(lt.code, lt)
    })
    return map
  }, [leaveTypes])

  // Tính toán tổng cột cho từng nhân viên
  const employeeTotals = useMemo(() => {
    const totals = new Map()

    employees.forEach((emp) => {
      let workWeekday = 0
      let workSunday = 0
      let otWeekday = 0
      let otSunday = 0

      days.forEach((d) => {
        // Dòng đi làm (work)
        const workEntry = entryMap.get(`${emp.id}_work_${d.day}`)
        const workHours = Number(workEntry?.value_hours || 0)
        const leaveCode = workEntry?.leave_code
        const leaveHours = Number(workEntry?.leave_hours || 0)

        // Quy tắc tính công: tra cứu theo danh mục loại phép động
        // Nếu loại phép có is_paid === true thì tính giờ phép vào tổng ngày thường
        const targetLeaveType = leaveCode ? leaveTypeMap.get(leaveCode) : null
        const isPaid = targetLeaveType ? targetLeaveType.is_paid : (leaveCode === 'PN')
        const paidLeaveHours = isPaid ? leaveHours : 0
        const totalDayWork = workHours + paidLeaveHours

        if (d.isSunday) {
          workSunday += workHours
        } else {
          workWeekday += totalDayWork
        }

        // Dòng tăng ca (overtime)
        const otEntry = entryMap.get(`${emp.id}_overtime_${d.day}`)
        const otHours = Number(otEntry?.value_hours || 0)

        if (d.isSunday) {
          otSunday += otHours
        } else {
          otWeekday += otHours
        }
      })

      totals.set(emp.id, {
        workWeekday,
        workSunday,
        otWeekday,
        otSunday,
      })
    })

    return totals
  }, [employees, days, entryMap, leaveTypeMap])

  return (
    <div className="print-area w-full bg-card border border-border/80 rounded-2xl shadow-xl overflow-hidden flex flex-col">
      {/* HEADER DÀNH RIÊNG CHO BẢN IN A4 (Ẩn trên Web, Hiện khi In) */}
      <div className="hidden print:block mb-1 text-black">
        <div className="flex items-end justify-between border-b pb-1 border-black">
          <div className="text-[9pt] font-bold uppercase tracking-tight">
            BỘ PHẬN: <span className="underline">THIẾT KẾ</span>
          </div>
          <div className="text-[12pt] font-extrabold uppercase tracking-wider text-center flex-1">
            BẢNG CHẤM CÔNG THÁNG {String(period.month).padStart(2, '0')}/{period.year}
          </div>
          <div className="text-[8pt] text-right font-semibold">
            (Kỳ: {days.length} ngày)
          </div>
        </div>
      </div>

      {/* Tiêu đề góc trên biểu mẫu (Chỉ hiển thị trên màn hình Web, Ẩn khi In) */}
      <div className="print:hidden p-4 border-b border-border/70 bg-secondary/30 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="font-bold text-sm text-foreground">
            BỘ PHẬN: <span className="text-primary font-extrabold tracking-wide">THIẾT KẾ</span>
          </span>
          <span className="text-xs text-muted-foreground">|</span>
          <span className="text-xs text-muted-foreground font-medium">
            Kỳ tháng {String(period.month).padStart(2, '0')}/{period.year} ({days.length} ngày)
          </span>
        </div>

        {/* Chú thích màu mã nghỉ động */}
        <div className="flex flex-wrap items-center gap-3 text-xs">
          {leaveTypes.map((lt) => (
            <div key={lt.code} className="flex items-center gap-1.5">
              <span 
                className="w-auto min-w-[22px] px-1 h-4 rounded text-white flex items-center justify-center text-[9px] font-bold shadow-sm"
                style={{ backgroundColor: lt.color || '#e11d48' }}
              >
                {lt.code}
              </span>
              <span className="text-muted-foreground text-[11px]">
                {lt.name} {lt.is_paid ? '(tính 8h công)' : '(không công)'}
              </span>
            </div>
          ))}
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-sky-500/20 border border-sky-500/40" />
            <span className="text-muted-foreground text-[11px]">Chủ Nhật (CN)</span>
          </div>
        </div>
      </div>

      {/* Lưới Bảng Chấm Công Có Cuộn Ngang */}
      <div className="overflow-x-auto overflow-y-auto max-h-[75vh] print:max-h-none print:overflow-visible">
        <table className="w-full border-collapse text-xs select-none">
          {/* HEADER BẢNG */}
          <thead className="sticky top-0 z-30 bg-secondary/95 backdrop-blur-md shadow-sm">
            {/* Header Dòng 1: Số Ngày */}
            <tr className="border-b border-border/80 text-muted-foreground text-[11px]">
              {/* Cột Cố Định Bên Trái */}
              <th rowSpan={3} className="col-stt sticky left-0 z-40 bg-secondary border-r border-border/80 px-1 py-1.5 w-12 text-center font-bold">
                <div>STT</div>
                <div className="text-[10px] print:text-[5pt] text-muted-foreground/60 font-normal">序号</div>
              </th>
              <th rowSpan={3} className="col-code sticky left-12 z-40 bg-secondary border-r border-border/80 px-1 py-1.5 w-24 text-center font-bold">
                <div>MÃ SỐ</div>
                <div className="text-[10px] print:text-[5pt] text-muted-foreground/60 font-normal">编号</div>
              </th>
              <th rowSpan={3} className="col-name sticky left-36 z-40 bg-secondary border-r border-border/80 px-2 py-1.5 w-48 text-left print:text-center font-bold">
                <div>HỌ TÊN</div>
                <div className="text-[10px] print:text-[5pt] text-muted-foreground/60 font-normal">越南姓名</div>
              </th>
              <th rowSpan={3} className="col-type border-r border-border/80 px-1 py-1.5 w-16 text-center font-bold">
                <div>LOẠI</div>
                <div className="text-[10px] print:text-[5pt] text-muted-foreground/60 font-normal">班次</div>
              </th>

              {/* Các Cột Ngày */}
              {days.map((d) => (
                <th
                  key={d.day}
                  className={`col-day border-r border-border/60 px-0.5 py-1 text-center min-w-[34px] font-bold ${
                    d.isSunday 
                      ? 'bg-sky-600 text-white font-extrabold print-sunday-hdr' 
                      : 'text-foreground'
                  }`}
                >
                  {d.dayFormatted}
                </th>
              ))}

              {/* 2 Cột Tổng Bên Phải */}
              <th
                rowSpan={2}
                className="col-total-w border-r border-border/80 px-1 py-1 text-center min-w-[70px] bg-rose-700 text-white font-bold print-total-weekday-hdr leading-tight text-[11px] print:text-[6pt]"
              >
                Tổng Ngày Thường
              </th>
              <th
                rowSpan={2}
                className="col-total-s px-1 py-1 text-center min-w-[65px] bg-sky-600 text-white font-bold print-total-sunday-hdr leading-tight text-[11px] print:text-[6pt]"
              >
                Tổng ngày CN
              </th>
            </tr>

            {/* Header Dòng 2: Thứ Tiếng Trung (星期...) */}
            <tr className="border-b border-border/60 text-[10px] print:text-[5pt]">
              {days.map((d) => (
                <th
                  key={d.day}
                  className={`col-day border-r border-border/60 px-0.5 py-0.5 text-center ${
                    d.isSunday 
                      ? 'bg-sky-500 text-white font-semibold print-sunday-hdr' 
                      : 'text-muted-foreground/80'
                  }`}
                >
                  <div className="leading-tight">
                    <div className="print:text-[4pt]">星期</div>
                    <div>{d.zh.replace('星期', '')}</div>
                  </div>
                </th>
              ))}
            </tr>

            {/* Header Dòng 3: Thứ Tiếng Việt (T2...CN) */}
            <tr className="border-b border-border/80 text-[11px] print:text-[6pt] font-bold">
              {days.map((d) => (
                <th
                  key={d.day}
                  className={`col-day border-r border-border/60 px-0.5 py-0.5 text-center ${
                    d.isSunday 
                      ? 'bg-sky-500 text-white font-bold print-sunday-hdr' 
                      : 'text-foreground'
                  }`}
                >
                  {d.vi}
                </th>
              ))}
              <th className="col-total-w border-r border-border/80 py-0.5 text-[10px] print:text-[5.5pt] text-center bg-rose-800/80 text-white print-total-weekday-hdr">
                平时合计
              </th>
              <th className="col-total-s py-0.5 text-[10px] print:text-[5.5pt] text-center bg-sky-700/80 text-white print-total-sunday-hdr">
                周日合计
              </th>
            </tr>
          </thead>

          {/* DỮ LIỆU TỪNG NHÂN VIÊN */}
          <tbody className="divide-y divide-border/60 font-sans">
            {employees.length === 0 ? (
              <tr>
                <td colSpan={days.length + 6} className="py-12 text-center text-muted-foreground">
                  Chưa có nhân viên nào trong kỳ chấm công này. Vui lòng vào mục Quản Lý Nhân Viên để thêm nhân sự.
                </td>
              </tr>
            ) : (
              employees.map((emp, index) => {
                const totals = employeeTotals.get(emp.id) || {
                  workWeekday: 0,
                  workSunday: 0,
                  otWeekday: 0,
                  otSunday: 0,
                }

                return (
                  <React.Fragment key={emp.id}>
                    {/* HÀNG 1: ĐI LÀM (work - 上班) */}
                    <tr className="hover:bg-secondary/40 transition-colors border-t-2 border-border/80">
                      {/* STT */}
                      <td
                        rowSpan={2}
                        className="col-stt sticky left-0 z-20 bg-card border-r border-border/80 px-1 text-center font-bold text-foreground text-xs print:text-[6.5pt]"
                      >
                        {index + 1}
                      </td>

                      {/* Mã Số */}
                      <td
                        rowSpan={2}
                        className="col-code sticky left-12 z-20 bg-card border-r border-border/80 px-1 text-center font-mono font-bold text-foreground print-emp-code text-xs print:text-[6.5pt]"
                      >
                        {emp.employee_code}
                      </td>

                      {/* Họ Tên: Tiếng Việt trên, Chữ Hán dưới */}
                      <td
                        rowSpan={2}
                        className="col-name sticky left-36 z-20 bg-card border-r border-border/80 px-2 py-1 text-center"
                      >
                        <div className="flex flex-col items-center justify-center">
                          <span className="font-bold text-foreground tracking-tight text-xs print-emp-name leading-tight">
                            {emp.full_name}
                          </span>
                          {emp.chinese_name && (
                            <span className="text-[11px] text-muted-foreground font-medium mt-0.5 print-emp-zh leading-tight">
                              {emp.chinese_name}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Nhãn hàng: 上班 (Công) */}
                      <td className="col-type border-r border-border/80 px-0.5 py-0.5 text-center font-bold text-emerald-400 bg-emerald-500/5 print-row-work text-xs print:text-[6.5pt]">
                        上班
                      </td>

                      {/* Các ô ngày hàng Đi làm */}
                      {days.map((d) => {
                        const entry = entryMap.get(`${emp.id}_work_${d.day}`)
                        return (
                          <td
                            key={d.day}
                            className={`col-day border-r border-border/50 p-0 text-center ${
                              d.isSunday ? 'bg-sky-500/10 print-sunday-cell' : ''
                            }`}
                          >
                            <TimesheetCell
                              entry={entry}
                              employeeId={emp.id}
                              periodId={period.id}
                              rowType="work"
                              day={d.day}
                              isSunday={d.isSunday}
                              leaveTypes={leaveTypes}
                              canEdit={canEdit}
                              onSave={onSaveCell}
                              onOpenLeaveConfig={onOpenLeaveConfig}
                            />
                          </td>
                        )
                      })}

                      {/* Tổng Hàng 1: Ngày thường & Ngày CN */}
                      <td className="col-total-w border-r border-border/80 px-1 text-center font-bold text-rose-300 bg-rose-500/10 print-total-weekday-cell text-xs print:text-[6.5pt]">
                        {totals.workWeekday > 0 ? totals.workWeekday : 0}
                      </td>
                      <td className="col-total-s px-1 text-center font-bold text-sky-300 bg-sky-500/10 print-total-sunday-cell text-xs print:text-[6.5pt]">
                        {totals.workSunday > 0 ? totals.workSunday : 0}
                      </td>
                    </tr>

                    {/* HÀNG 2: TĂNG CA (overtime - 加班) */}
                    <tr className="hover:bg-secondary/40 transition-colors border-b border-border/70">
                      {/* Nhãn hàng: 加班 (Tăng ca) */}
                      <td className="col-type border-r border-border/80 px-0.5 py-0.5 text-center font-bold text-sky-400 bg-sky-500/5 print-row-ot text-xs print:text-[6.5pt]">
                        加班
                      </td>

                      {/* Các ô ngày hàng Tăng ca */}
                      {days.map((d) => {
                        const entry = entryMap.get(`${emp.id}_overtime_${d.day}`)
                        return (
                          <td
                            key={d.day}
                            className={`col-day border-r border-border/50 p-0 text-center ${
                              d.isSunday ? 'bg-sky-500/10 print-sunday-cell' : ''
                            }`}
                          >
                            <TimesheetCell
                              entry={entry}
                              employeeId={emp.id}
                              periodId={period.id}
                              rowType="overtime"
                              day={d.day}
                              isSunday={d.isSunday}
                              leaveTypes={leaveTypes}
                              canEdit={canEdit}
                              onSave={onSaveCell}
                              onOpenLeaveConfig={onOpenLeaveConfig}
                            />
                          </td>
                        )
                      })}

                      {/* Tổng Hàng 2: Tăng ca thường & Tăng ca CN */}
                      <td className="col-total-w border-r border-border/80 px-1 text-center font-bold text-rose-300 bg-rose-500/10 print-total-weekday-cell text-xs print:text-[6.5pt]">
                        {totals.otWeekday > 0 ? totals.otWeekday : 0}
                      </td>
                      <td className="col-total-s px-1 text-center font-bold text-sky-300 bg-sky-500/10 print-total-sunday-cell text-xs print:text-[6.5pt]">
                        {totals.otSunday > 0 ? totals.otSunday : 0}
                      </td>
                    </tr>
                  </React.Fragment>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {/* CHÂN TRANG CHỮ KÝ DÀNH CHO BẢN IN A4 (Ẩn trên Web, Hiện khi In) */}
      <div className="hidden print:grid grid-cols-3 text-center text-[8pt] font-bold mt-3 pt-2 text-black">
        <div>
          <div>Người lập biểu</div>
          <div className="text-[7pt] text-slate-600 font-normal">制表人</div>
          <div className="h-8"></div>
          <div className="text-[7.5pt] font-normal">............................................</div>
        </div>
        <div>
          <div>Quản lý bộ phận</div>
          <div className="text-[7pt] text-slate-600 font-normal">部门主管</div>
          <div className="h-8"></div>
          <div className="text-[7.5pt] font-normal">............................................</div>
        </div>
        <div>
          <div>Giám đốc duyệt</div>
          <div className="text-[7pt] text-slate-600 font-normal">总经理审批</div>
          <div className="h-8"></div>
          <div className="text-[7.5pt] font-normal">............................................</div>
        </div>
      </div>
    </div>
  )
}


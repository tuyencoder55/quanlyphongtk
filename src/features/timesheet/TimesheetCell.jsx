import React, { useState, useRef, useEffect } from 'react'
import { Check, X, Clock, AlertCircle } from 'lucide-react'

export default function TimesheetCell({ 
  entry, 
  employeeId,
  periodId,
  rowType, 
  day, 
  isSunday, 
  leaveTypes = [],
  canEdit, 
  onSave,
  onOpenLeaveConfig
}) {
  const [isOpen, setIsOpen] = useState(false)
  const cellRef = useRef(null)
  const popoverRef = useRef(null)

  const [popoverCoords, setPopoverCoords] = useState({ top: 0, left: 0 })

  const valueHours = entry?.value_hours ?? 0
  const leaveCode = entry?.leave_code || null
  const leaveHours = entry?.leave_hours ?? 0

  // Tra cứu loại phép hiện tại
  const currentLeaveType = leaveCode ? leaveTypes.find((lt) => lt.code === leaveCode) : null

  // Tính toán toạ độ thông minh: Luôn nằm trọn vẹn trong viewport màn hình (không bao giờ tràn đỉnh hay đáy)
  useEffect(() => {
    if (isOpen && cellRef.current) {
      const rect = cellRef.current.getBoundingClientRect()
      const popoverWidth = rowType === 'work' ? 510 : 280
      const popoverHeight = rowType === 'work' ? 280 : 180

      const spaceAbove = rect.top
      const spaceBelow = window.innerHeight - rect.bottom

      let finalTop
      // Nếu khoảng trống bên dưới đủ bung xuống dưới
      if (spaceBelow >= popoverHeight + 10 || spaceBelow >= spaceAbove) {
        finalTop = rect.bottom + 6
        // Chặn không vượt quá đáy màn hình
        if (finalTop + popoverHeight > window.innerHeight - 8) {
          finalTop = Math.max(8, window.innerHeight - popoverHeight - 8)
        }
      } else {
        // Bung LÊN TRÊN ô
        finalTop = rect.top - popoverHeight - 6
        // Chặn không vượt quá đỉnh màn hình
        if (finalTop < 8) {
          finalTop = 8
        }
      }

      // Canh giữa theo ô, không bao giờ để lọt ra ngoài 2 mép trái/phải màn hình
      const centerLeft = rect.left + rect.width / 2
      const finalLeft = Math.max(popoverWidth / 2 + 10, Math.min(window.innerWidth - popoverWidth / 2 - 10, centerLeft))

      setPopoverCoords({ top: finalTop, left: finalLeft })
    }
  }, [isOpen, rowType])

  // Đóng popover khi click ra ngoài
  useEffect(() => {
    function handleClickOutside(event) {
      if (
        popoverRef.current && 
        !popoverRef.current.contains(event.target) &&
        cellRef.current && 
        !cellRef.current.contains(event.target)
      ) {
        setIsOpen(false)
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  // Xử lý chọn nhanh
  const handleQuickSelect = (newValHours, newLeaveCode, newLeaveHours) => {
    onSave({
      entryId: entry?.id,
      periodId,
      employeeId,
      rowType,
      day,
      valueHours: newValHours,
      leaveCode: newLeaveCode,
      leaveHours: newLeaveHours,
    })
    setIsOpen(false)
  }

// Hàm tính màu chữ tương phản chuẩn W3C (nền sáng chữ đen, nền tối chữ trắng)
function getContrastTextColor(hexColor) {
  if (!hexColor || !hexColor.startsWith('#') || hexColor.length < 7) return '#ffffff'
  const r = parseInt(hexColor.slice(1, 3), 16) || 0
  const g = parseInt(hexColor.slice(3, 5), 16) || 0
  const b = parseInt(hexColor.slice(5, 7), 16) || 0
  const yiq = (r * 299 + g * 587 + b * 114) / 1000
  return yiq >= 160 ? '#000000' : '#ffffff'
}

  // Render hiển thị nội dung ô
  const renderCellContent = () => {
    if (rowType === 'work') {
      // Có mã phép bất kỳ (PN, PT, KP, TANG, PB, ...)
      if (leaveCode) {
        const badgeColor = currentLeaveType?.color || (
          leaveCode === 'PN' ? '#e11d48' :
          leaveCode === 'PT' ? '#d97706' :
          leaveCode === 'KP' ? '#475569' : '#0284c7'
        )

        // Tính màu chữ tương phản (nền sáng chữ đen, nền tối chữ trắng)
        const textColor = getContrastTextColor(badgeColor)

        if (valueHours > 0 && leaveHours > 0) {
          const comboText = `${valueHours}/${leaveCode}${leaveHours}`
          const lenClass = comboText.length <= 4 ? 'len-3-4' : 'len-5-plus'

          return (
            <span 
              className={`inline-flex items-center justify-center text-[9px] sm:text-[9.5px] font-bold px-1 py-0.5 rounded leading-none shadow-sm print-leave-badge ${lenClass}`}
              style={{ backgroundColor: badgeColor, color: textColor }}
            >
              {comboText}
            </span>
          )
        }

        const lenClass = leaveCode.length <= 2 
          ? 'len-1-2' 
          : leaveCode.length <= 4 
            ? 'len-3-4' 
            : 'len-5-plus'

        const webTextSize = leaveCode.length <= 2 
          ? 'text-xs' 
          : leaveCode.length <= 4 
            ? 'text-[11px]' 
            : 'text-[9.5px]'

        return (
          <span 
            className={`inline-flex items-center justify-center ${webTextSize} font-bold w-full h-full rounded leading-none shadow-sm print-leave-badge ${lenClass}`}
            style={{ backgroundColor: badgeColor, color: textColor }}
          >
            {leaveCode}
          </span>
        )
      }

      // Giờ làm bình thường
      if (valueHours > 0) {
        return (
          <span className="font-semibold text-foreground text-xs print-cell-value">
            {valueHours}
          </span>
        )
      }

      return null
    }

    // Hàng Tăng ca (overtime)
    if (rowType === 'overtime') {
      if (valueHours > 0) {
        return (
          <span className="font-semibold text-sky-400 text-xs print-cell-value">
            {valueHours}
          </span>
        )
      }
      return null
    }

    return null
  }

  return (
    <div className="relative w-full h-full">
      <div
        ref={cellRef}
        onClick={() => {
          if (canEdit) setIsOpen(!isOpen)
        }}
        className={`w-full h-8 print:h-[18px] flex items-center justify-center text-center select-none transition-colors ${
          canEdit ? 'cursor-pointer hover:ring-2 hover:ring-primary/60' : 'cursor-default'
        } ${
          isSunday 
            ? 'bg-sky-500/10 print-sunday-cell' 
            : ''
        }`}
      >
        {renderCellContent()}
      </div>

      {/* Popover Chọn Nhanh khi bấm vào ô */}
      {isOpen && canEdit && (
        <div
          ref={popoverRef}
          className={`fixed z-50 ${
            rowType === 'work' ? 'w-[510px]' : 'w-[280px]'
          } max-w-[96vw] bg-card/95 backdrop-blur-xl border border-border/90 rounded-2xl shadow-2xl p-3.5 text-xs text-foreground animate-popup-smooth`}
          style={{
            top: popoverCoords.top,
            left: popoverCoords.left,
          }}
        >
          {/* Header Popover */}
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-border/70">
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-foreground text-xs">
                Ngày {String(day).padStart(2, '0')}
              </span>
              <span className="text-muted-foreground">•</span>
              <span className="font-semibold text-xs text-primary">
                {rowType === 'work' ? 'Giờ Công & Phép (上班)' : 'Tăng Ca (加班)'}
              </span>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 text-muted-foreground hover:text-foreground rounded-lg hover:bg-secondary transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Menu cho hàng Đi làm (work) */}
          {rowType === 'work' && (
            <div className="space-y-2.5">
              {/* Nút 8h đi làm bình thường (Nổi bật, sang trọng) */}
              <button
                type="button"
                onClick={() => handleQuickSelect(8, null, 0)}
                className="w-full py-2 px-3 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 hover:border-emerald-500/50 rounded-xl text-left font-bold transition-all flex items-center justify-between group shadow-xs"
              >
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-xs text-emerald-300 font-extrabold">
                    8h Đi Làm Cả Ngày
                  </span>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  8h công
                </span>
              </button>

              {/* Danh sách các loại phép (Layout 3 cột ngang rộng rãi) */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[10px] text-muted-foreground font-semibold uppercase tracking-wider px-0.5">
                  <span>Nghỉ phép cả ngày (8h)</span>
                  <span className="text-[9px] font-normal lowercase">
                    ({(leaveTypes.length > 0 ? leaveTypes : []).length} loại)
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-1.5 max-h-40 overflow-y-auto pr-0.5">
                  {(leaveTypes.length > 0 ? leaveTypes : [
                    { code: 'PN', name: 'Phép năm', is_paid: true, color: '#e11d48' },
                    { code: 'PT', name: 'Phép thường', is_paid: false, color: '#f59e0b' },
                    { code: 'KP', name: 'Không phép', is_paid: false, color: '#64748b' }
                  ]).map((lt) => (
                    <button
                      key={lt.code}
                      type="button"
                      onClick={() => handleQuickSelect(0, lt.code, 8)}
                      className="group p-2 rounded-xl text-left transition-all border bg-secondary/40 hover:bg-secondary/90 border-border/70 hover:border-slate-500/60 flex flex-col justify-between gap-1 shadow-xs"
                    >
                      {/* Badge mã phép & Tag công */}
                      <div className="flex items-center justify-between w-full">
                        <span
                          className="px-1.5 py-0.5 rounded-md text-[10px] font-black font-mono text-white shadow-xs"
                          style={{ backgroundColor: lt.color || '#e11d48' }}
                        >
                          {lt.code}
                        </span>
                        <span className={`text-[9px] font-semibold px-1 py-0.2 rounded ${
                          lt.is_paid 
                            ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/25' 
                            : 'bg-muted text-muted-foreground'
                        }`}>
                          {lt.is_paid ? '8h công' : '0h công'}
                        </span>
                      </div>

                      {/* Tên loại phép */}
                      <span 
                        className="text-[11px] font-medium text-foreground group-hover:text-primary transition-colors leading-tight line-clamp-1" 
                        title={lt.name}
                      >
                        {lt.name}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Nửa buổi & Về sớm (Layout 3-4 cột ngang) */}
              <div className="pt-2 border-t border-border/60">
                <div className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider mb-1 px-0.5">
                  Nghỉ nửa buổi & Về sớm
                </div>
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-1.5">
                  {(leaveTypes.length > 0 ? leaveTypes.slice(0, 4) : [
                    { code: 'PN', name: 'Phép năm', color: '#e11d48' },
                    { code: 'PT', name: 'Phép thường', color: '#f59e0b' }
                  ]).map((lt) => (
                    <button
                      key={`half_${lt.code}`}
                      type="button"
                      onClick={() => handleQuickSelect(4, lt.code, 4)}
                      className="p-1.5 bg-secondary/40 hover:bg-secondary text-[11px] rounded-xl border border-border/60 hover:border-slate-500/60 text-left font-medium flex items-center gap-1.5 transition-all truncate"
                      title={`4h Làm + 4h ${lt.name}`}
                    >
                      <span
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ backgroundColor: lt.color || '#e11d48' }}
                      />
                      <span className="truncate">4h + 4h {lt.code}</span>
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => handleQuickSelect(6, 'PT', 2)}
                    className="p-1.5 bg-secondary/40 hover:bg-secondary text-[11px] rounded-xl border border-border/60 hover:border-slate-500/60 text-left font-medium transition-all text-center"
                  >
                    6h Làm + 2h PT
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickSelect(4, null, 0)}
                    className="p-1.5 bg-secondary/40 hover:bg-secondary text-[11px] rounded-xl border border-border/60 hover:border-slate-500/60 text-left font-medium transition-all text-center"
                  >
                    Chỉ 4h Làm
                  </button>
                </div>
              </div>

              {/* Footer: Xoá ô */}
              <div className="pt-1.5 border-t border-border/60 flex items-center justify-end text-xs px-0.5">
                <button
                  type="button"
                  onClick={() => handleQuickSelect(0, null, 0)}
                  className="text-[11px] text-muted-foreground hover:text-rose-400 py-0.5 transition-colors font-medium"
                >
                  Xoá ô này (Để trống)
                </button>
              </div>
            </div>
          )}

          {/* Menu cho hàng Tăng ca (overtime) */}
          {rowType === 'overtime' && (
            <div className="space-y-2.5">
              <div className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider px-0.5">
                Chọn số giờ tăng ca
              </div>
              <div className="grid grid-cols-4 gap-1.5 text-center font-bold">
                {[0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5, 6, 8].map((h) => (
                  <button
                    key={h}
                    type="button"
                    onClick={() => handleQuickSelect(h, null, 0)}
                    className="py-2 px-1 bg-secondary/60 hover:bg-primary hover:text-white border border-border/60 hover:border-primary rounded-xl transition-all shadow-xs"
                  >
                    {h}h
                  </button>
                ))}
              </div>

              {/* Xoá */}
              <div className="pt-2 border-t border-border/60 flex justify-end">
                <button
                  type="button"
                  onClick={() => handleQuickSelect(0, null, 0)}
                  className="text-[11px] text-muted-foreground hover:text-rose-400 py-0.5 transition-colors"
                >
                  Không tăng ca (0h)
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

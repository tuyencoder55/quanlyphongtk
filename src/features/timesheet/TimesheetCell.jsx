import React, { useState, useRef, useEffect } from 'react'
import { Check, X, Clock, AlertCircle } from 'lucide-react'

export default function TimesheetCell({ 
  entry, 
  employeeId,
  periodId,
  rowType, 
  day, 
  isSunday, 
  canEdit, 
  onSave 
}) {
  const [isOpen, setIsOpen] = useState(false)
  const cellRef = useRef(null)
  const popoverRef = useRef(null)

  const valueHours = entry?.value_hours ?? 0
  const leaveCode = entry?.leave_code || null
  const leaveHours = entry?.leave_hours ?? 0

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

  // Render hiển thị nội dung ô
  const renderCellContent = () => {
    if (rowType === 'work') {
      // Có mã phép
      if (leaveCode === 'PN') {
        if (valueHours > 0 && leaveHours > 0) {
          return (
            <span className="inline-flex items-center justify-center text-[10px] font-bold px-1 py-0.5 rounded bg-rose-600 text-white leading-none shadow-sm print-badge-pn">
              {valueHours}/PN{leaveHours}
            </span>
          )
        }
        return (
          <span className="inline-flex items-center justify-center text-xs font-bold w-full h-full rounded bg-rose-600 text-white leading-none shadow-sm print-badge-pn">
            PN
          </span>
        )
      }

      if (leaveCode === 'PT') {
        if (valueHours > 0 && leaveHours > 0) {
          return (
            <span className="inline-flex items-center justify-center text-[10px] font-bold px-1 py-0.5 rounded bg-amber-400 text-slate-950 leading-none shadow-sm print-badge-pt">
              {valueHours}/PT{leaveHours}
            </span>
          )
        }
        return (
          <span className="inline-flex items-center justify-center text-xs font-bold w-full h-full rounded bg-amber-400 text-slate-950 leading-none shadow-sm print-badge-pt">
            PT
          </span>
        )
      }

      if (leaveCode === 'KP') {
        return (
          <span className="inline-flex items-center justify-center text-xs font-bold w-full h-full rounded bg-slate-600 text-white leading-none shadow-sm print-badge-kp">
            KP
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
          className="fixed z-50 transform -translate-x-1/2 -translate-y-full mt-[-8px] w-64 bg-card border border-border rounded-xl shadow-2xl p-3 text-xs text-foreground animate-in zoom-in-95 duration-150"
          style={{
            top: cellRef.current ? cellRef.current.getBoundingClientRect().top - 4 : 0,
            left: cellRef.current ? cellRef.current.getBoundingClientRect().left + cellRef.current.getBoundingClientRect().width / 2 : 0,
          }}
        >
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-border/60">
            <span className="font-bold text-foreground">
              Ngày {String(day).padStart(2, '0')} • {rowType === 'work' ? 'Giờ Công (上班)' : 'Tăng Ca (加班)'}
            </span>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 text-muted-foreground hover:text-foreground rounded"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Menu cho hàng Đi làm (work) */}
          {rowType === 'work' && (
            <div className="space-y-2">
              <div className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">
                Chọn nhanh giờ công / phép
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  onClick={() => handleQuickSelect(8, null, 0)}
                  className="px-2 py-1.5 bg-secondary hover:bg-primary hover:text-white rounded-lg text-left font-medium transition-colors"
                >
                  8h Đi làm
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickSelect(0, 'PN', 8)}
                  className="px-2 py-1.5 bg-rose-600/20 text-rose-300 hover:bg-rose-600 hover:text-white border border-rose-500/30 rounded-lg text-left font-bold transition-colors"
                >
                  PN (Phép năm)
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickSelect(0, 'PT', 8)}
                  className="px-2 py-1.5 bg-amber-400/20 text-amber-300 hover:bg-amber-400 hover:text-slate-950 border border-amber-400/30 rounded-lg text-left font-bold transition-colors"
                >
                  PT (Phép thường)
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickSelect(0, 'KP', 8)}
                  className="px-2 py-1.5 bg-slate-700/50 hover:bg-slate-700 text-slate-200 rounded-lg text-left font-medium transition-colors"
                >
                  KP (Không phép)
                </button>
              </div>

              {/* Nửa buổi & Về sớm */}
              <div className="pt-1.5 border-t border-border/50">
                <div className="text-[10px] text-muted-foreground font-semibold mb-1">
                  Nghỉ nửa buổi / Về sớm:
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleQuickSelect(4, 'PN', 4)}
                    className="px-2 py-1 bg-secondary/80 hover:bg-secondary text-[11px] rounded border border-border text-left"
                  >
                    4h Làm + 4h PN
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickSelect(4, 'PT', 4)}
                    className="px-2 py-1 bg-secondary/80 hover:bg-secondary text-[11px] rounded border border-border text-left"
                  >
                    4h Làm + 4h PT
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickSelect(6, 'PT', 2)}
                    className="px-2 py-1 bg-secondary/80 hover:bg-secondary text-[11px] rounded border border-border text-left"
                  >
                    6h Làm + 2h PT
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickSelect(4, null, 0)}
                    className="px-2 py-1 bg-secondary/80 hover:bg-secondary text-[11px] rounded border border-border text-left"
                  >
                    Chỉ 4h Làm
                  </button>
                </div>
              </div>

              {/* Xoá / Để trống */}
              <div className="pt-1 border-t border-border/50 flex justify-end">
                <button
                  type="button"
                  onClick={() => handleQuickSelect(0, null, 0)}
                  className="text-[11px] text-muted-foreground hover:text-rose-400 py-1"
                >
                  Xoá ô này (Để trống)
                </button>
              </div>
            </div>
          )}

          {/* Menu cho hàng Tăng ca (overtime) */}
          {rowType === 'overtime' && (
            <div className="space-y-2">
              <div className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">
                Chọn số giờ tăng ca
              </div>
              <div className="grid grid-cols-4 gap-1.5 text-center font-semibold">
                {[0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5, 6, 8].map((h) => (
                  <button
                    key={h}
                    type="button"
                    onClick={() => handleQuickSelect(h, null, 0)}
                    className="py-1.5 px-1 bg-secondary hover:bg-primary hover:text-white rounded-lg transition-colors"
                  >
                    {h}h
                  </button>
                ))}
              </div>

              {/* Xoá */}
              <div className="pt-1.5 border-t border-border/50 flex justify-end">
                <button
                  type="button"
                  onClick={() => handleQuickSelect(0, null, 0)}
                  className="text-[11px] text-muted-foreground hover:text-rose-400 py-1"
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

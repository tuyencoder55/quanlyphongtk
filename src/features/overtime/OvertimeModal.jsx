import React, { useState, useEffect } from 'react'
import { X, Clock, Calendar, Check, AlertCircle, Trash2 } from 'lucide-react'
import { calculateOvertimeHours, calculateEndTimeFromHours } from './overtimeService'

export default function OvertimeModal({
  isOpen,
  onClose,
  onSave,
  onDelete,
  initialData = null,
  period,
  days,
  employee
}) {
  const [day, setDay] = useState(initialData?.day || 1)
  const [startTime, setStartTime] = useState(initialData?.startTime || '16:30')
  const [endTime, setEndTime] = useState(initialData?.endTime || '18:30')
  const [hours, setHours] = useState(initialData?.hours || 2.0)
  const [manualHours, setManualHours] = useState(false)
  const defaultDeptReason = employee?.department === 'CTP'
    ? 'Xuất rửa bảng, sắp xếp bảng CTP/出版、洗版、整理CTP版。'
    : 'Xử lý file / 处理档案'

  const initialReason = (employee?.department === 'CTP' && (!initialData?.reason || initialData?.reason === 'Xử lý file / 处理档案'))
    ? defaultDeptReason
    : (initialData?.reason || defaultDeptReason)

  const [reason, setReason] = useState(initialReason)

  // Xác định ngày đang chọn có phải Chủ Nhật không
  const selectedDayInfo = days.find((d) => d.day === Number(day))
  const isSunday = selectedDayInfo?.isSunday || false

  // Tự động điều chỉnh giờ bắt đầu khi chọn ngày nếu chưa chỉnh tay
  useEffect(() => {
    if (!initialData) {
      if (isSunday) {
        setStartTime('07:30')
        setEndTime('16:30')
      } else {
        setStartTime('16:30')
        setEndTime('18:30')
      }
    }
  }, [day, isSunday, initialData])

  // Chuẩn hoá chuỗi thời gian nhập từ bàn phím (hỗ trợ 1830, 18.30, 18h30, 18 -> 18:00)
  const normalizeTimeInput = (val) => {
    if (!val) return ''
    let cleaned = String(val).trim().toLowerCase().replace('h', ':').replace('.', ':')

    // Nếu gõ 3-4 chữ số liền (1830 -> 18:30, 730 -> 07:30)
    if (/^\d{3,4}$/.test(cleaned)) {
      if (cleaned.length === 3) cleaned = '0' + cleaned
      const h = Math.min(23, Math.max(0, Number(cleaned.slice(0, 2))))
      const m = Math.min(59, Math.max(0, Number(cleaned.slice(2, 4))))
      return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
    }

    // Nếu chỉ gõ 1-2 chữ số (ví dụ 18 -> 18:00, 7 -> 07:00)
    if (/^\d{1,2}$/.test(cleaned)) {
      const h = Math.min(23, Math.max(0, Number(cleaned)))
      return `${String(h).padStart(2, '0')}:00`
    }

    // Nếu có dấu hai chấm : (ví dụ 7:30 -> 07:30)
    if (cleaned.includes(':')) {
      const [rawH, rawM] = cleaned.split(':')
      const h = Math.min(23, Math.max(0, Number(rawH) || 0))
      const m = Math.min(59, Math.max(0, Number(rawM) || 0))
      return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
    }

    return cleaned
  }

  // Xử lý khi rời ô nhập giờ (Blur) để format đẹp lại
  const handleBlurTime = (type) => {
    if (type === 'start') {
      const formatted = normalizeTimeInput(startTime)
      if (formatted && formatted !== startTime) {
        setStartTime(formatted)
      }
      if (!manualHours && formatted && endTime) {
        const normEnd = normalizeTimeInput(endTime) || endTime
        const computed = calculateOvertimeHours(formatted, normEnd, isSunday)
        setHours(computed)
      }
    } else {
      const formatted = normalizeTimeInput(endTime)
      if (formatted && formatted !== endTime) {
        setEndTime(formatted)
      }
      if (!manualHours && startTime && formatted) {
        const normStart = normalizeTimeInput(startTime) || startTime
        const computed = calculateOvertimeHours(normStart, formatted, isSunday)
        setHours(computed)
      }
    }
  }

  // Tự động tính số giờ khi đổi giờ vào hoặc giờ ra
  useEffect(() => {
    if (!manualHours && startTime && endTime) {
      const normStart = normalizeTimeInput(startTime)
      const normEnd = normalizeTimeInput(endTime)
      if (normStart.includes(':') && normEnd.includes(':') && normEnd.length >= 4) {
        const computed = calculateOvertimeHours(normStart, normEnd, isSunday)
        if (computed > 0) {
          setHours(computed)
        }
      }
    }
  }, [startTime, endTime, isSunday, manualHours])

  if (!isOpen) return null

  const handleSubmit = (e) => {
    e.preventDefault()

    const finalStart = normalizeTimeInput(startTime) || startTime
    const finalEnd = normalizeTimeInput(endTime) || endTime

    const computedHours = manualHours
      ? Number(hours)
      : calculateOvertimeHours(finalStart, finalEnd, isSunday)

    if (computedHours <= 0) {
      alert('Số giờ tăng ca phải lớn hơn 0!')
      return
    }

    // Luôn làm tròn giờ kết thúc theo số giờ đã tính để không bị phút lẻ
    const roundedEndTime = calculateEndTimeFromHours(finalStart, computedHours, isSunday) || finalEnd

    onSave({
      periodId: period.id,
      employeeId: employee.id,
      day: Number(day),
      hours: computedHours,
      startTime: finalStart,
      endTime: roundedEndTime,
      reason: reason.trim() || defaultDeptReason,
      isSunday
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-card border border-border/80 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header Modal */}
        <div className="p-4 border-b border-border/60 bg-secondary/30 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-primary/15 text-primary flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-foreground">
                {initialData ? 'Chỉnh Sửa Ca Tăng Ca' : 'Ghi Nhận Ca Tăng Ca'}
              </h3>
              <p className="text-[11px] text-muted-foreground">
                Nhân viên: <span className="font-semibold text-foreground">{employee?.full_name}</span> ({employee?.employee_code})
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
          {/* Chọn ngày trong tháng */}
          <div>
            <label className="block font-semibold text-foreground mb-1.5">
              Ngày tăng ca (Tháng {period?.month}/{period?.year})
            </label>
            <select
              value={day}
              onChange={(e) => setDay(Number(e.target.value))}
              className="w-full px-3 py-2 bg-secondary/60 border border-border rounded-xl text-sm font-semibold text-foreground outline-none focus:ring-2 focus:ring-primary/50 cursor-pointer"
            >
              {days.map((d) => (
                <option key={d.day} value={d.day} className="bg-card text-foreground">
                  Ngày {d.dayFormatted} - {d.vi} ({d.zh}) {d.isSunday ? '⭐ Chủ Nhật' : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Khung giờ: Giờ vào và Giờ ra (Cho phép gõ phím trực tiếp 24h, xoá icon tối) */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-foreground mb-1">
                Giờ vào ca {isSunday ? '(Chủ Nhật)' : '(Ngày thường)'}
              </label>
              <input
                type="text"
                maxLength={5}
                value={startTime}
                onChange={(e) => {
                  setStartTime(e.target.value)
                  setManualHours(false)
                }}
                onBlur={() => handleBlurTime('start')}
                placeholder={isSunday ? '07:30' : '16:30'}
                className="w-full px-3 py-2 bg-secondary/60 border border-border rounded-xl text-sm font-mono font-bold text-foreground text-center tracking-wider outline-none focus:ring-2 focus:ring-primary/50 shadow-inner"
              />
              <div className="text-[10px] text-muted-foreground mt-0.5 text-center">
                {isSunday ? 'Gợi ý: 07:30 hoặc 08:00' : 'Mặc định: 16:30'}
              </div>
            </div>

            <div>
              <label className="block font-semibold text-foreground mb-1">
                Giờ xuống ca (ra về)
              </label>
              <input
                type="text"
                maxLength={5}
                value={endTime}
                onChange={(e) => {
                  setEndTime(e.target.value)
                  setManualHours(false)
                }}
                onBlur={() => handleBlurTime('end')}
                placeholder={isSunday ? '16:30' : '18:30'}
                className="w-full px-3 py-2 bg-secondary/60 border border-border rounded-xl text-sm font-mono font-bold text-foreground text-center tracking-wider outline-none focus:ring-2 focus:ring-primary/50 shadow-inner"
              />
              <div className="text-[10px] text-muted-foreground mt-0.5 text-center">
                Quy tắc lùi 30p
              </div>
            </div>
          </div>

          {/* Gợi ý chọn nhanh các mốc giờ phổ biến */}
          <div className="flex flex-wrap items-center gap-1.5 p-2 bg-secondary/30 rounded-xl border border-border/40">
            <span className="text-[11px] font-semibold text-muted-foreground mr-0.5">Chọn nhanh:</span>
            {(isSunday
              ? [
                  { label: '4h (11:30)', end: '11:30', h: 4 },
                  { label: '8h (16:30)', end: '16:30', h: 8 },
                  { label: '9h (17:30)', end: '17:30', h: 9 },
                  { label: '10h (18:30)', end: '18:30', h: 10 }
                ]
              : [
                  { label: '1h (17:30)', end: '17:30', h: 1 },
                  { label: '2h (18:30)', end: '18:30', h: 2 },
                  { label: '3h (19:30)', end: '19:30', h: 3 },
                  { label: '4h (20:30)', end: '20:30', h: 4 }
                ]
            ).map((preset) => {
              const isActive = endTime === preset.end && Number(hours) === preset.h
              return (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => {
                    setEndTime(preset.end)
                    setHours(preset.h)
                    setManualHours(false)
                  }}
                  className={`px-2 py-0.5 rounded-lg text-[11px] font-semibold border transition-all ${
                    isActive
                      ? 'bg-primary text-primary-foreground border-primary shadow-xs'
                      : 'bg-card hover:bg-secondary text-muted-foreground hover:text-foreground border-border/60'
                  }`}
                >
                  {preset.label}
                </button>
              )
            })}
          </div>

          {/* Số giờ tính tăng ca */}
          <div className="p-3 bg-secondary/40 border border-border/70 rounded-xl">
            <div className="flex items-center justify-between">
              <div>
                <span className="font-bold text-foreground text-xs">Tổng giờ tăng ca:</span>
                <p className="text-[11px] text-muted-foreground">
                  {isSunday ? 'Ca Chủ Nhật (đã trừ 1h trưa nếu qua trưa)' : 'Làm tròn theo mốc 30 phút (có thể gõ phím trực tiếp)'}
                </p>
              </div>
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  step="0.5"
                  min="0.5"
                  max="24"
                  value={hours}
                  onChange={(e) => {
                    const val = Number(e.target.value)
                    setHours(val)
                    setManualHours(true)
                    // Tự tính lại giờ xuống ca khi nhập tay số giờ
                    if (val > 0) {
                      const normStart = normalizeTimeInput(startTime) || (isSunday ? '07:30' : '16:30')
                      const calculatedEnd = calculateEndTimeFromHours(normStart, val, isSunday)
                      if (calculatedEnd) {
                        setEndTime(calculatedEnd)
                      }
                    }
                  }}
                  className="w-20 px-2 py-1 bg-card border border-primary/50 rounded-lg text-center font-bold text-base text-primary outline-none focus:ring-2 focus:ring-primary"
                />
                <span className="font-bold text-foreground">Giờ</span>
              </div>
            </div>
          </div>

          {/* Lý do tăng ca */}
          <div>
            <label className="block font-semibold text-foreground mb-1">
              Lý do tăng ca (加班理由)
            </label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={defaultDeptReason}
              className="w-full px-3 py-2 bg-secondary/60 border border-border rounded-xl text-xs text-foreground outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>

          {/* Các nút bấm */}
          <div className="flex items-center justify-between pt-2 border-t border-border/50">
            {initialData && onDelete ? (
              <button
                type="button"
                onClick={() => onDelete(initialData.day, isSunday)}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-destructive/15 text-destructive hover:bg-destructive hover:text-white transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Xoá ca này</span>
              </button>
            ) : (
              <div />
            )}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-secondary hover:bg-secondary/80 text-muted-foreground hover:text-foreground transition-colors"
              >
                Huỷ
              </button>
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs font-semibold bg-primary hover:bg-primary/90 text-primary-foreground shadow-md shadow-primary/25 transition-all"
              >
                <Check className="w-4 h-4" />
                <span>Lưu Ca Tăng Ca</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}

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
  const [reason, setReason] = useState(initialData?.reason || 'Xử lý file / 处理档案')

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

  // Tự động tính số giờ khi đổi giờ vào hoặc giờ ra
  useEffect(() => {
    if (!manualHours && startTime && endTime) {
      const computed = calculateOvertimeHours(startTime, endTime, isSunday)
      setHours(computed)
    }
  }, [startTime, endTime, isSunday, manualHours])

  if (!isOpen) return null

  const handleSubmit = (e) => {
    e.preventDefault()
    if (Number(hours) <= 0) {
      alert('Số giờ tăng ca phải lớn hơn 0!')
      return
    }

    // Luôn làm tròn giờ kết thúc theo số giờ đã tính để không bị phút lẻ
    const roundedEndTime = calculateEndTimeFromHours(startTime, Number(hours), isSunday) || endTime

    onSave({
      periodId: period.id,
      employeeId: employee.id,
      day: Number(day),
      hours: Number(hours),
      startTime,
      endTime: roundedEndTime,
      reason: reason.trim() || 'Xử lý file / 处理档案'
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

          {/* Khung giờ: Giờ vào và Giờ ra */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-foreground mb-1">
                Giờ vào ca {isSunday ? '(Chủ Nhật)' : '(Ngày thường)'}
              </label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => {
                  setStartTime(e.target.value)
                  setManualHours(false)
                }}
                className="w-full px-3 py-2 bg-secondary/60 border border-border rounded-xl text-sm font-mono font-bold text-foreground outline-none focus:ring-2 focus:ring-primary/50"
              />
              <div className="text-[10px] text-muted-foreground mt-0.5">
                {isSunday ? 'Gợi ý: 07:30, 08:00, 08:30...' : 'Mặc định: 16:30'}
              </div>
            </div>

            <div>
              <label className="block font-semibold text-foreground mb-1">
                Giờ xuống ca (ra về)
              </label>
              <input
                type="time"
                value={endTime}
                onChange={(e) => {
                  setEndTime(e.target.value)
                  setManualHours(false)
                }}
                className="w-full px-3 py-2 bg-secondary/60 border border-border rounded-xl text-sm font-mono font-bold text-foreground outline-none focus:ring-2 focus:ring-primary/50"
              />
              <div className="text-[10px] text-muted-foreground mt-0.5">
                Quy tắc lùi 30p
              </div>
            </div>
          </div>

          {/* Số giờ tính tăng ca */}
          <div className="p-3 bg-secondary/40 border border-border/70 rounded-xl">
            <div className="flex items-center justify-between">
              <div>
                <span className="font-bold text-foreground text-xs">Tổng giờ tăng ca:</span>
                <p className="text-[11px] text-muted-foreground">
                  {isSunday ? 'Ca Chủ Nhật (đã trừ 1h trưa nếu qua trưa)' : 'Làm tròn theo mốc 30 phút'}
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
                    setHours(Number(e.target.value))
                    setManualHours(true)
                  }}
                  className="w-20 px-2 py-1 bg-card border border-primary/50 rounded-lg text-center font-bold text-base text-primary outline-none"
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
              placeholder="Xử lý file / 处理档案"
              className="w-full px-3 py-2 bg-secondary/60 border border-border rounded-xl text-xs text-foreground outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>

          {/* Các nút bấm */}
          <div className="flex items-center justify-between pt-2 border-t border-border/50">
            {initialData && onDelete ? (
              <button
                type="button"
                onClick={() => onDelete(initialData.day)}
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

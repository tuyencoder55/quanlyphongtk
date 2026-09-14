import React, { useState, useEffect } from 'react'
import { X, Check, Loader2, Sparkles, AlertCircle } from 'lucide-react'
import toast from 'react-hot-toast'
import { createLeaveType, updateLeaveType } from './leaveTypeService'

const PRESET_COLORS = [
  { label: 'Đỏ', hex: '#e11d48' },
  { label: 'Cam', hex: '#f97316' },
  { label: 'Vàng', hex: '#f59e0b' },
  { label: 'Xanh Lá', hex: '#10b981' },
  { label: 'Xanh Dương', hex: '#0284c7' },
  { label: 'Chàm', hex: '#6366f1' },
  { label: 'Tím', hex: '#8b5cf6' },
  { label: 'Xám', hex: '#64748b' },
]

export default function LeaveTypeModal({ isOpen, onClose, leaveType, onSuccess }) {
  const isEditing = Boolean(leaveType?.id)

  const [code, setCode] = useState('')
  const [name, setName] = useState('')
  const [isPaid, setIsPaid] = useState(true)
  const [color, setColor] = useState('#e11d48')
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (leaveType) {
      setCode(leaveType.code || '')
      setName(leaveType.name || '')
      setIsPaid(Boolean(leaveType.is_paid))
      setColor(leaveType.color || '#e11d48')
      setDescription(leaveType.description || '')
    } else {
      setCode('')
      setName('')
      setIsPaid(true)
      setColor('#0284c7')
      setDescription('')
    }
  }, [leaveType, isOpen])

  if (!isOpen) return null

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!code.trim() || !name.trim()) {
      toast.error('Vui lòng nhập đầy đủ Mã phép và Tên loại phép')
      return
    }

    setLoading(true)
    try {
      if (isEditing) {
        await updateLeaveType(leaveType.id, {
          name,
          is_paid: isPaid,
          color,
          description,
        })
        toast.success(`Đã cập nhật loại phép "${name}"!`)
      } else {
        await createLeaveType({
          code,
          name,
          is_paid: isPaid,
          color,
          description,
        })
        toast.success(`Đã thêm loại phép mới: [${code.toUpperCase()}] ${name}!`)
      }

      onSuccess?.()
      onClose()
    } catch (err) {
      toast.error(err.message || 'Lỗi lưu loại phép')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-card border border-border/80 w-full max-w-md rounded-2xl shadow-2xl p-6 relative animate-in zoom-in-95 duration-150">
        {/* Nút Đóng */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 p-1 text-muted-foreground hover:text-foreground rounded-lg transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Tiêu đề Modal */}
        <div className="mb-5">
          <h3 className="text-base font-bold text-foreground flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            <span>{isEditing ? 'Chỉnh Sửa Loại Phép' : 'Thêm Loại Phép Mới'}</span>
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Cấu hình mã hiển thị trên bảng chấm công và quy tắc tính 8h công
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Mã phép (Code) */}
          <div>
            <label className="block text-xs font-semibold text-foreground mb-1.5">
              Mã phép (Hiển thị trên ô chấm công) <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              required
              disabled={isEditing && ['PN', 'PT', 'KP'].includes(leaveType?.code)}
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase().replace(/\s+/g, '_'))}
              placeholder="Ví dụ: TANG, PB, PB_KO, TS..."
              className="w-full px-3 py-2 bg-secondary/50 border border-border rounded-xl text-xs font-mono font-bold text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary uppercase transition-all disabled:opacity-50"
            />
            <span className="text-[10px] text-muted-foreground mt-1 block">
              Mã ngắn gọn (từ 2-6 chữ cái), ví dụ: <code className="text-primary font-bold">TANG</code>, <code className="text-primary font-bold">PB</code>
            </span>
          </div>

          {/* Tên loại phép */}
          <div>
            <label className="block text-xs font-semibold text-foreground mb-1.5">
              Tên loại phép <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ví dụ: Phép tang (hưởng lương), Phép bệnh..."
              className="w-full px-3 py-2 bg-secondary/50 border border-border rounded-xl text-xs text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
            />
          </div>

          {/* Quy tắc tính công (is_paid) - YÊU CẦU CỐT LÕI */}
          <div className="p-3.5 bg-secondary/40 rounded-xl border border-border/60 space-y-2.5">
            <label className="block text-xs font-bold text-foreground">
              Quy tắc tính công (Lương) <span className="text-rose-400">*</span>
            </label>

            <div className="grid grid-cols-1 gap-2">
              {/* Option: Có tính công 8h */}
              <label
                onClick={() => setIsPaid(true)}
                className={`flex items-start gap-3 p-2.5 rounded-xl border cursor-pointer transition-all ${
                  isPaid
                    ? 'bg-emerald-500/10 border-emerald-500/50 text-foreground'
                    : 'bg-card/50 border-border/50 text-muted-foreground hover:bg-secondary/70'
                }`}
              >
                <input
                  type="radio"
                  name="is_paid"
                  checked={isPaid === true}
                  onChange={() => setIsPaid(true)}
                  className="mt-0.5 text-emerald-500 focus:ring-emerald-500"
                />
                <div>
                  <div className="font-bold text-xs flex items-center gap-1.5 text-emerald-400">
                    <span>Tính full công 8h (Hưởng lương)</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Được cộng vào cột <strong>"Tổng Ngày Thường"</strong> như ngày đi làm (vd: Phép năm, Phép tang, Phép bệnh có duyệt).
                  </p>
                </div>
              </label>

              {/* Option: Không tính công */}
              <label
                onClick={() => setIsPaid(false)}
                className={`flex items-start gap-3 p-2.5 rounded-xl border cursor-pointer transition-all ${
                  !isPaid
                    ? 'bg-amber-500/10 border-amber-500/50 text-foreground'
                    : 'bg-card/50 border-border/50 text-muted-foreground hover:bg-secondary/70'
                }`}
              >
                <input
                  type="radio"
                  name="is_paid"
                  checked={isPaid === false}
                  onChange={() => setIsPaid(false)}
                  className="mt-0.5 text-amber-500 focus:ring-amber-500"
                />
                <div>
                  <div className="font-bold text-xs flex items-center gap-1.5 text-amber-400">
                    <span>Không tính công (Nghỉ việc riêng / Không lương)</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Không tính lương và không cộng vào cột tổng công (vd: Phép thường, Không phép, Bệnh không duyệt).
                  </p>
                </div>
              </label>
            </div>
          </div>

          {/* Chọn màu Badge */}
          <div>
            <label className="block text-xs font-semibold text-foreground mb-1.5">
              Màu hiển thị trên ô
            </label>
            <div className="flex flex-wrap items-center gap-2">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c.hex}
                  type="button"
                  onClick={() => setColor(c.hex)}
                  className={`w-7 h-7 rounded-lg flex items-center justify-center transition-transform ${
                    color === c.hex ? 'scale-110 ring-2 ring-white shadow-md' : 'opacity-80 hover:opacity-100'
                  }`}
                  style={{ backgroundColor: c.hex }}
                  title={c.label}
                >
                  {color === c.hex && <Check className="w-4 h-4 text-white drop-shadow" />}
                </button>
              ))}

              {/* Preview Badge */}
              <div className="ml-auto flex items-center gap-1.5">
                <span className="text-[11px] text-muted-foreground">Xem thử:</span>
                <span
                  className="px-2 py-0.5 rounded text-xs font-bold text-white shadow-sm"
                  style={{ backgroundColor: color }}
                >
                  {code || 'MÃ'}
                </span>
              </div>
            </div>
          </div>

          {/* Mô tả */}
          <div>
            <label className="block text-xs font-semibold text-foreground mb-1.5">
              Ghi chú / Quy định áp dụng (tuỳ chọn)
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Quy định ngày nghỉ, thủ tục giấy tờ kèm theo..."
              className="w-full px-3 py-2 bg-secondary/50 border border-border rounded-xl text-xs text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all resize-none"
            />
          </div>

          {/* Nút Submit */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-border/60">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-secondary rounded-xl transition-colors"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center gap-2 px-5 py-2 bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold rounded-xl shadow-md shadow-primary/25 transition-all disabled:opacity-50"
            >
              {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>{isEditing ? 'Lưu Thay Đổi' : 'Thêm Loại Phép'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

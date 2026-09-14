import React, { useState, useEffect } from 'react'
import { X, User, Hash, Languages, Loader2, CheckCircle2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { createEmployee, updateEmployee } from './employeeService'

export default function EmployeeModal({ isOpen, onClose, employee, onSuccess }) {
  const isEdit = Boolean(employee)

  const [employeeCode, setEmployeeCode] = useState('')
  const [fullName, setFullName] = useState('')
  const [chineseName, setChineseName] = useState('')
  const [status, setStatus] = useState('active')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (employee) {
      setEmployeeCode(employee.employee_code || '')
      setFullName(employee.full_name || '')
      setChineseName(employee.chinese_name || '')
      setStatus(employee.status || 'active')
    } else {
      setEmployeeCode('')
      setFullName('')
      setChineseName('')
      setStatus('active')
    }
  }, [employee, isOpen])

  if (!isOpen) return null

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!employeeCode.trim() || !fullName.trim()) {
      toast.error('Vui lòng nhập Mã số và Họ tên nhân viên')
      return
    }

    setSubmitting(true)
    try {
      if (isEdit) {
        await updateEmployee(employee.id, {
          employee_code: employeeCode,
          full_name: fullName,
          chinese_name: chineseName,
          status,
        })
        toast.success('Cập nhật thông tin nhân viên thành công!')
      } else {
        await createEmployee({
          employee_code: employeeCode,
          full_name: fullName,
          chinese_name: chineseName,
        })
        toast.success('Thêm nhân viên mới thành công!')
      }
      onSuccess()
      onClose()
    } catch (err) {
      toast.error(err.message || 'Có lỗi xảy ra khi lưu nhân viên')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="bg-card border border-border/80 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Modal */}
        <div className="px-6 py-4 border-b border-border/60 flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-foreground">
              {isEdit ? 'Chỉnh Sửa Nhân Viên' : 'Thêm Nhân Viên Mới'}
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              {isEdit ? 'Cập nhật thông tin hồ sơ nhân sự' : 'Nhân sự mới sẽ tự động hiển thị trong kỳ chấm công'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Mã số nhân viên */}
          <div>
            <label className="block text-xs font-semibold text-foreground mb-1.5 flex items-center justify-between">
              <span>Mã Số Nhân Viên (MSNV) *</span>
              <span className="text-[10px] text-muted-foreground font-normal">Duy nhất (vd: GH1838)</span>
            </label>
            <div className="relative">
              <Hash className="w-4 h-4 text-muted-foreground absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                required
                value={employeeCode}
                onChange={(e) => setEmployeeCode(e.target.value.toUpperCase())}
                placeholder="GH412"
                className="w-full pl-10 pr-4 py-2.5 bg-secondary/50 border border-border rounded-xl text-sm font-mono text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary uppercase transition-all"
              />
            </div>
          </div>

          {/* Họ tên tiếng Việt */}
          <div>
            <label className="block text-xs font-semibold text-foreground mb-1.5">
              Họ Và Tên Tiếng Việt *
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-muted-foreground absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="TRẦN HẢO HOA"
                className="w-full pl-10 pr-4 py-2.5 bg-secondary/50 border border-border rounded-xl text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
              />
            </div>
          </div>

          {/* Tên chữ Hán (Tùy chọn) */}
          <div>
            <label className="block text-xs font-semibold text-foreground mb-1.5 flex items-center justify-between">
              <span>Tên Chữ Hán (Tùy chọn)</span>
              <span className="text-[10px] text-muted-foreground font-normal">Hiển thị trên biểu Excel</span>
            </label>
            <div className="relative">
              <Languages className="w-4 h-4 text-muted-foreground absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={chineseName}
                onChange={(e) => setChineseName(e.target.value)}
                placeholder="陈好花"
                className="w-full pl-10 pr-4 py-2.5 bg-secondary/50 border border-border rounded-xl text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
              />
            </div>
          </div>

          {/* Trạng thái (Chỉ hiện khi chỉnh sửa) */}
          {isEdit && (
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1.5">
                Trạng Thái Hoạt Động
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full px-3 py-2.5 bg-secondary/50 border border-border rounded-xl text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
              >
                <option value="active">Đang làm việc (Active)</option>
                <option value="inactive">Đã nghỉ việc / Ngưng hoạt động (Inactive)</option>
              </select>
            </div>
          )}

          {/* Nút hành động */}
          <div className="pt-4 border-t border-border/60 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
            >
              Huỷ
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2.5 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-xl text-sm shadow-md shadow-primary/25 flex items-center gap-2 transition-all disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Đang lưu...</span>
                </>
              ) : (
                <span>{isEdit ? 'Lưu Thay Đổi' : 'Thêm Nhân Viên'}</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

import React, { useState, useEffect } from 'react'
import { User, Lock, Shield, Check, X, Loader2, Eye, EyeOff, UserPlus, ShieldAlert, Sparkles } from 'lucide-react'
import toast from 'react-hot-toast'
import { createUserAccount, updateUserPermissions } from './userAdminService'

export default function UserModal({
  isOpen,
  onClose,
  account, // null nếu là tạo mới, hoặc object account nếu là sửa
  employees = [],
  preselectedEmployee = null,
  onSuccess,
}) {
  const isEditing = !!account

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [role, setRole] = useState('member')
  const [canEdit, setCanEdit] = useState(false)
  const [canDelete, setCanDelete] = useState(false)
  const [employeeId, setEmployeeId] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  // Khởi tạo dữ liệu form khi mở modal
  useEffect(() => {
    if (!isOpen) return

    if (account) {
      // Chế độ sửa
      setUsername(account.username || '')
      setPassword('')
      setFullName(account.fullName || '')
      setRole(account.role || 'member')
      setCanEdit(Boolean(account.canEdit))
      setCanDelete(Boolean(account.canDelete))
      setEmployeeId(account.employeeId || '')
    } else {
      // Chế độ tạo mới
      const targetEmp = preselectedEmployee || null
      setUsername(targetEmp ? targetEmp.employee_code.toLowerCase().replace(/\s+/g, '') : '')
      setPassword('123456') // Gợi ý mật khẩu mặc định phổ thông
      setFullName(targetEmp ? targetEmp.full_name : '')
      setRole('member')
      setCanEdit(false)
      setCanDelete(false)
      setEmployeeId(targetEmp ? targetEmp.id : '')
    }
  }, [isOpen, account, preselectedEmployee])

  if (!isOpen) return null

  // Khi người dùng chọn nhân viên từ danh sách
  const handleEmployeeChange = (empId) => {
    setEmployeeId(empId)
    if (!empId) return

    const emp = employees.find((e) => e.id === empId)
    if (emp) {
      if (!fullName || fullName === username) {
        setFullName(emp.full_name)
      }
      if (!isEditing && (!username || employees.some(e => e.employee_code.toLowerCase() === username))) {
        setUsername(emp.employee_code.toLowerCase().replace(/\s+/g, ''))
      }
    }
  }

  // Khi đổi vai trò sang Admin -> tự động kích hoạt quyền sửa và xoá
  const handleRoleChange = (newRole) => {
    setRole(newRole)
    if (newRole === 'admin') {
      setCanEdit(true)
      setCanDelete(true)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    const cleanUsername = username.trim().toLowerCase().replace(/\s+/g, '')
    if (!cleanUsername) {
      toast.error('Vui lòng nhập Tên đăng nhập')
      return
    }

    const finalPassword = (!password || !password.trim()) ? '123456' : password.trim()
    if (!isEditing && finalPassword.length < 6) {
      toast.error('Mật khẩu khởi tạo phải có ít nhất 6 ký tự!')
      return
    }

    setSubmitting(true)
    try {
      if (isEditing) {
        await updateUserPermissions(account.id, {
          fullName: fullName.trim() || cleanUsername,
          role,
          canEdit: role === 'admin' ? true : canEdit,
          canDelete: role === 'admin' ? true : canDelete,
          employeeId: employeeId || null,
        })
        toast.success(`Đã cập nhật tài khoản "${cleanUsername}" thành công!`)
      } else {
        await createUserAccount({
          username: cleanUsername,
          password: finalPassword,
          fullName: fullName.trim() || cleanUsername,
          role,
          canEdit: role === 'admin' ? true : canEdit,
          canDelete: role === 'admin' ? true : canDelete,
          employeeId: employeeId || null,
        })
        toast.success(`Đã cấp tài khoản "${cleanUsername}" thành công!`)
      }

      onSuccess?.()
      onClose()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-card border border-border/80 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-border/60 flex items-center justify-between bg-secondary/30">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              {isEditing ? <Shield className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
            </div>
            <div>
              <h3 className="text-sm font-bold text-foreground">
                {isEditing ? 'Chỉnh Sửa Quyền Hạn Tài Khoản' : 'Cấp Tài Khoản Mới Cho Nhân Viên'}
              </h3>
              <p className="text-[11px] text-muted-foreground">
                {isEditing
                  ? `Cập nhật vai trò và phân quyền cho "${account.username}"`
                  : 'Tạo tài khoản đăng nhập và phân quyền thao tác'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
          {/* Liên kết nhân viên */}
          <div>
            <label className="block text-xs font-semibold text-foreground mb-1.5 flex items-center justify-between">
              <span>Liên kết nhân viên phòng thiết kế</span>
              <span className="text-[10px] text-muted-foreground font-normal">(Tuỳ chọn)</span>
            </label>
            <select
              value={employeeId}
              onChange={(e) => handleEmployeeChange(e.target.value)}
              className="w-full px-3 py-2.5 bg-secondary/50 border border-border rounded-xl text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
            >
              <option value="">-- Không liên kết / Tài khoản độc lập --</option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.employee_code} • {emp.full_name} {emp.chinese_name ? `(${emp.chinese_name})` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Tên đăng nhập (Username) */}
          <div>
            <label className="block text-xs font-semibold text-foreground mb-1.5">
              Tên đăng nhập (Username) <span className="text-rose-400">*</span>
            </label>
            <div className="relative">
              <input
                type="text"
                required
                disabled={isEditing}
                value={username}
                onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/\s+/g, ''))}
                placeholder="Ví dụ: gh1838, tuyen, admin2..."
                className="w-full pl-3.5 pr-4 py-2.5 bg-secondary/50 border border-border rounded-xl text-xs text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all font-mono disabled:opacity-60 disabled:cursor-not-allowed"
              />
            </div>
            <p className="text-[10px] text-muted-foreground mt-1">
              {isEditing
                ? 'Tên đăng nhập không thể thay đổi sau khi tạo.'
                : 'Dùng để đăng nhập trực tiếp vào hệ thống (không dấu, viết liền).'}
            </p>
          </div>

          {/* Họ và tên hiển thị */}
          <div>
            <label className="block text-xs font-semibold text-foreground mb-1.5">
              Họ và tên hiển thị
            </label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Ví dụ: Đặng Công Tuyến"
              className="w-full px-3.5 py-2.5 bg-secondary/50 border border-border rounded-xl text-xs text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
            />
          </div>

          {/* Mật khẩu khởi tạo (Chỉ hiển thị khi Tạo Mới) */}
          {!isEditing && (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-foreground">
                  Mật khẩu khởi tạo <span className="text-rose-400">*</span>
                </label>
                <button
                  type="button"
                  onClick={() => setPassword('123456')}
                  className="text-[11px] text-amber-400 hover:text-amber-300 hover:underline inline-flex items-center gap-1 font-medium transition-colors"
                >
                  <Sparkles className="w-3 h-3" />
                  Mặc định: 123456
                </button>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Mặc định: 123456 (tối thiểu 6 ký tự)"
                  className="w-full pl-3.5 pr-10 py-2.5 bg-secondary/50 border border-border rounded-xl text-xs text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-0.5"
                >
                  {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
              <p className="text-[10px] text-muted-foreground mt-1">
                Mặc định là <b className="text-foreground">123456</b> (nếu để trống hệ thống sẽ tự động dùng 123456).
              </p>
            </div>
          )}

          {/* Phân vai trò */}
          <div className="pt-2 border-t border-border/50">
            <label className="block text-xs font-semibold text-foreground mb-2">
              Vai trò người dùng
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label
                className={`flex items-start gap-2.5 p-3 rounded-xl border cursor-pointer transition-all ${
                  role === 'member'
                    ? 'border-primary/50 bg-primary/10 text-foreground'
                    : 'border-border/60 bg-secondary/30 text-muted-foreground hover:border-border'
                }`}
              >
                <input
                  type="radio"
                  name="role"
                  value="member"
                  checked={role === 'member'}
                  onChange={() => handleRoleChange('member')}
                  className="mt-0.5 text-primary focus:ring-primary"
                />
                <div className="text-xs">
                  <span className="font-semibold block text-foreground">Thành Viên (Member)</span>
                  <span className="text-[10px] text-muted-foreground mt-0.5 block leading-tight">
                    Nhân viên bình thường, chỉ xem và làm phiếu tăng ca của mình
                  </span>
                </div>
              </label>

              <label
                className={`flex items-start gap-2.5 p-3 rounded-xl border cursor-pointer transition-all ${
                  role === 'admin'
                    ? 'border-indigo-500/50 bg-indigo-500/10 text-foreground'
                    : 'border-border/60 bg-secondary/30 text-muted-foreground hover:border-border'
                }`}
              >
                <input
                  type="radio"
                  name="role"
                  value="admin"
                  checked={role === 'admin'}
                  onChange={() => handleRoleChange('admin')}
                  className="mt-0.5 text-indigo-500 focus:ring-indigo-500"
                />
                <div className="text-xs">
                  <span className="font-semibold block text-indigo-400">Quản Trị Viên (Admin)</span>
                  <span className="text-[10px] text-muted-foreground mt-0.5 block leading-tight">
                    Toàn quyền quản trị nhân sự, chấm công, quản lý tài khoản
                  </span>
                </div>
              </label>
            </div>
          </div>

          {/* Quyền hạn chi tiết (áp dụng cho Member) */}
          {role === 'member' && (
            <div className="space-y-2 bg-secondary/40 border border-border/60 rounded-xl p-3">
              <span className="text-xs font-semibold text-foreground block mb-1">
                Quyền hạn bổ sung:
              </span>
              <label className="flex items-center gap-2 cursor-pointer text-xs text-foreground">
                <input
                  type="checkbox"
                  checked={canEdit}
                  onChange={(e) => setCanEdit(e.target.checked)}
                  className="rounded border-border text-primary focus:ring-primary w-3.5 h-3.5"
                />
                <span>Cho phép chỉnh sửa ô trên Bảng Chấm Công</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer text-xs text-foreground">
                <input
                  type="checkbox"
                  checked={canDelete}
                  onChange={(e) => setCanDelete(e.target.checked)}
                  className="rounded border-border text-primary focus:ring-primary w-3.5 h-3.5"
                />
                <span>Cho phép thao tác ngưng hoạt động nhân viên</span>
              </label>
            </div>
          )}

          {/* Nút Submit */}
          <div className="pt-3 flex items-center justify-end gap-2 border-t border-border/50">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 bg-secondary hover:bg-secondary/80 text-foreground text-xs font-semibold rounded-xl transition-colors"
            >
              Huỷ Bỏ
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold rounded-xl shadow-md shadow-primary/20 transition-all disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Đang xử lý...</span>
                </>
              ) : (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>{isEditing ? 'Lưu Thay Đổi' : 'Cấp Tài Khoản'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

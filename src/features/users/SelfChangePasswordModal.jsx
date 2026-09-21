import React, { useState } from 'react'
import { KeyRound, Eye, EyeOff, Loader2, X, Check, ShieldCheck } from 'lucide-react'
import toast from 'react-hot-toast'
import { changeMyPassword } from './userAdminService'

export default function SelfChangePasswordModal({ isOpen, onClose, user, profile }) {
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  if (!isOpen) return null

  const displayName = profile?.full_name || user?.user_metadata?.username || user?.email?.split('@')[0] || 'Thành viên'
  const username = profile?.username || user?.user_metadata?.username || user?.email?.split('@')[0] || ''

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!newPassword || newPassword.length < 6) {
      toast.error('Mật khẩu mới phải có ít nhất 6 ký tự!')
      return
    }

    if (newPassword !== confirmPassword) {
      toast.error('Mật khẩu xác nhận không khớp!')
      return
    }

    setSubmitting(true)
    try {
      await changeMyPassword(newPassword)
      toast.success('Đổi mật khẩu thành công! Bạn hãy ghi nhớ mật khẩu mới nhé.')
      setNewPassword('')
      setConfirmPassword('')
      onClose()
    } catch (err) {
      toast.error(err.message || 'Lỗi khi đổi mật khẩu')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-card border border-border/80 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-5 py-4 border-b border-border/60 flex items-center justify-between bg-secondary/30">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-500/15 text-amber-400 flex items-center justify-center">
              <KeyRound className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-foreground">Đổi Mật Khẩu Cá Nhân</h3>
              <p className="text-[11px] text-muted-foreground">
                Tài khoản: <span className="font-mono font-semibold text-primary">{username}</span>
                {displayName && ` (${displayName})`}
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

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-foreground mb-1.5">
              Mật khẩu mới <span className="text-rose-400">*</span>
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Nhập mật khẩu mới (tối thiểu 6 ký tự)..."
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
          </div>

          <div>
            <label className="block font-semibold text-foreground mb-1.5">
              Xác nhận mật khẩu mới <span className="text-rose-400">*</span>
            </label>
            <input
              type={showPassword ? 'text' : 'password'}
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Nhập lại mật khẩu mới..."
              className="w-full px-3.5 py-2.5 bg-secondary/50 border border-border rounded-xl text-xs text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all font-mono"
            />
          </div>

          <div className="bg-primary/10 border border-primary/20 rounded-xl p-3 text-[11px] text-primary/90 space-y-1">
            <div className="flex items-center gap-1.5 font-semibold text-primary">
              <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
              <span>Bảo mật tài khoản:</span>
            </div>
            <p className="text-muted-foreground">
              Mật khẩu mới cần có ít nhất 6 ký tự. Sau khi đổi thành công, bạn sẽ sử dụng mật khẩu này cho các lần đăng nhập tiếp theo.
            </p>
          </div>

          {/* Buttons */}
          <div className="pt-2 flex items-center justify-end gap-2">
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
                  <span>Đang cập nhật...</span>
                </>
              ) : (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Cập Nhật Mật Khẩu</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

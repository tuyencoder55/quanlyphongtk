import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/useAuthStore'
import { supabase } from '@/lib/supabase'
import { Eye, EyeOff, Lock, User, Sparkles, ArrowRight, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'

// Chuyển username thành định dạng email nội bộ để Supabase Auth xử lý
function toInternalEmail(username) {
  const clean = username.trim().toLowerCase()
  if (clean.includes('@')) return clean
  return `${clean}@lapthinh.com`
}

export default function LoginPage() {
  const [isSignUp, setIsSignUp] = useState(false)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const { signIn } = useAuthStore()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!username.trim() || !password.trim()) {
      toast.error('Vui lòng nhập Tên đăng nhập và Mật khẩu')
      return
    }

    setSubmitting(true)
    const email = toInternalEmail(username)

    if (isSignUp) {
      // Đăng ký bằng username
      try {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: fullName.trim() || username.trim(),
              username: username.trim().toLowerCase(),
            },
          },
        })

        if (error) {
          toast.error(error.message)
        } else {
          toast.success('Đã tạo tài khoản! Bạn có thể đăng nhập ngay.')
          setIsSignUp(false)
        }
      } catch (err) {
        toast.error('Lỗi khi đăng ký: ' + err.message)
      } finally {
        setSubmitting(false)
      }
    } else {
      // Đăng nhập bằng username
      const res = await signIn(email, password)
      setSubmitting(false)

      if (res.success) {
        toast.success('Đăng nhập thành công!')
        navigate('/')
      } else {
        toast.error('Đăng nhập thất bại: Sai tên đăng nhập hoặc mật khẩu!')
      }
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 relative overflow-hidden">
      {/* Hiệu ứng ánh sáng nền */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-blue-600/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-72 h-72 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        {/* Logo & Tiêu đề */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-500 shadow-xl shadow-blue-500/25 text-white mb-4">
            <Sparkles className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            Bộ Phận Thiết Kế
          </h1>
          <p className="text-sm text-blue-400 font-medium mt-0.5">
            Hệ thống Quản lý Chấm công & Nhân sự
          </p>
        </div>

        {/* Khung Form Card */}
        <div className="bg-card border border-border/70 rounded-2xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl">
          <div className="flex items-center justify-between mb-6 pb-4 border-b border-border/50">
            <div>
              <h2 className="text-lg font-semibold text-foreground">
                {isSignUp ? 'Tạo tài khoản mới' : 'Đăng nhập hệ thống'}
              </h2>
              <p className="text-xs text-muted-foreground">
                {isSignUp ? 'Đăng ký thành viên mới' : 'Sử dụng Tên đăng nhập và Mật khẩu của bạn'}
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Tên hiển thị (chỉ khi đăng ký) */}
            {isSignUp && (
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                  Họ và tên
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-muted-foreground absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required={isSignUp}
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Ví dụ: Đặng Công Tuyến"
                    className="w-full pl-10 pr-4 py-2.5 bg-secondary/50 border border-border rounded-xl text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                  />
                </div>
              </div>
            )}

            {/* Tên đăng nhập */}
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                Tên đăng nhập (Username)
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-muted-foreground absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="admin"
                  autoCapitalize="none"
                  className="w-full pl-10 pr-4 py-2.5 bg-secondary/50 border border-border rounded-xl text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                />
              </div>
            </div>

            {/* Mật khẩu */}
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                Mật khẩu
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-muted-foreground absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-11 py-2.5 bg-secondary/50 border border-border rounded-xl text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Nút Submit */}
            <button
              type="submit"
              disabled={submitting}
              className="w-full mt-2 py-3 px-4 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-xl text-sm shadow-lg shadow-primary/25 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Đang xử lý...</span>
                </>
              ) : (
                <>
                  <span>{isSignUp ? 'Đăng ký' : 'Đăng nhập'}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Toggle Đăng ký / Đăng nhập */}
          <div className="mt-6 pt-4 border-t border-border/50 text-center">
            <button
              type="button"
              onClick={() => setIsSignUp(!isSignUp)}
              className="text-xs text-muted-foreground hover:text-primary transition-colors"
            >
              {isSignUp
                ? 'Đã có tài khoản? Quay lại đăng nhập'
                : 'Chưa có tài khoản? Bấm để tạo tài khoản mới'}
            </button>
          </div>
        </div>

        {/* Ghi chú chân trang */}
        <p className="text-center text-[11px] text-muted-foreground/60 mt-6">
          Hệ thống bảo mật nội bộ • Công ty TNHH Bao Bì Lập Thịnh
        </p>
      </div>
    </div>
  )
}

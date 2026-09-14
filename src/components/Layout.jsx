import React, { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/useAuthStore'
import { 
  LayoutDashboard,
  CalendarDays, 
  Users, 
  Clock,
  LogOut, 
  User, 
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
  Shield,
  ShieldCheck,
  Layers
} from 'lucide-react'
import toast from 'react-hot-toast'

export default function Layout({ children }) {
  const { user, profile, signOut } = useAuthStore()
  const location = useLocation()
  const navigate = useNavigate()

  // Thu nhỏ / mở rộng sidebar (rất hữu ích khi xem bảng chấm công nhiều cột)
  const [collapsed, setCollapsed] = useState(false)
  // Mở menu trên thiết bị di động
  const [mobileOpen, setMobileOpen] = useState(false)

  const handleSignOut = async () => {
    try {
      await signOut()
      toast.success('Đã đăng xuất')
      navigate('/login')
    } catch (err) {
      toast.error('Lỗi khi đăng xuất')
    }
  }

  const isAdmin = profile?.role === 'admin'
  const canEdit = isAdmin || profile?.can_edit
  const canDelete = isAdmin || profile?.can_delete

  const navItems = [
    {
      name: 'Trang Chủ',
      path: '/',
      icon: LayoutDashboard,
    },
    {
      name: 'Bảng Chấm Công',
      path: '/timesheet',
      icon: CalendarDays,
    },
    {
      name: 'Đề Nghị Tăng Ca',
      path: '/overtime',
      icon: Clock,
    },
    {
      name: 'Quản Lý Nhân Viên',
      path: '/employees',
      icon: Users,
    },
    ...(isAdmin ? [
      {
        name: 'Tài Khoản & Phân Quyền',
        path: '/users',
        icon: ShieldCheck,
      }
    ] : []),
  ]

  // Xác định tiêu đề trang hiện tại
  const currentPage = navItems.find((item) => item.path === location.pathname) || {
    name: 'Tổng Quan',
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex overflow-hidden">
      {/* Backdrop cho mobile */}
      {mobileOpen && (
        <div 
          onClick={() => setMobileOpen(false)}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
        />
      )}

      {/* SIDEBAR BÊN TRÁI */}
      <aside
        className={`fixed lg:static top-0 bottom-0 left-0 z-50 flex flex-col bg-card border-r border-border/70 transition-all duration-300 ease-in-out ${
          collapsed ? 'w-20' : 'w-64'
        } ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Phần Logo / Brand */}
        <div className="h-16 px-4 flex items-center justify-between border-b border-border/60">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20 text-white shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
            {!collapsed && (
              <div className="flex flex-col overflow-hidden">
                <span className="font-bold text-sm tracking-tight text-white truncate">
                  PHÒNG THIẾT KẾ
                </span>
                <span className="text-[10px] text-muted-foreground truncate">
                  Hệ thống Quản lý Nội bộ
                </span>
              </div>
            )}
          </div>

          {/* Nút đóng trên mobile */}
          <button
            onClick={() => setMobileOpen(false)}
            className="lg:hidden p-1.5 rounded-lg text-muted-foreground hover:text-foreground"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Menu Điều Hướng */}
        <div className="flex-1 py-4 px-3 space-y-1.5 overflow-y-auto">
          {!collapsed && (
            <div className="px-3 mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">
              Menu Quản Lý
            </div>
          )}

          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = location.pathname === item.path
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setMobileOpen(false)}
                title={collapsed ? item.name : undefined}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-primary text-primary-foreground shadow-md shadow-primary/25 font-semibold'
                    : 'text-muted-foreground hover:text-foreground hover:bg-secondary/70'
                } ${collapsed ? 'justify-center px-0' : ''}`}
              >
                <Icon className="w-5 h-5 shrink-0" />
                {!collapsed && <span className="truncate">{item.name}</span>}
              </Link>
            )
          })}
        </div>

        {/* Nút Thu nhỏ / Mở rộng Sidebar (dành cho Desktop) */}
        <div className="hidden lg:flex px-3 py-2 border-t border-border/50 justify-end">
          <button
            onClick={() => setCollapsed(!collapsed)}
            title={collapsed ? 'Mở rộng menu' : 'Thu nhỏ menu (tiện xem bảng rộng)'}
            className="w-full flex items-center justify-center gap-2 p-2 rounded-lg text-xs text-muted-foreground hover:text-foreground hover:bg-secondary/70 transition-colors"
          >
            {collapsed ? (
              <ChevronRight className="w-4 h-4" />
            ) : (
              <>
                <ChevronLeft className="w-4 h-4" />
                <span className="text-xs">Thu nhỏ menu</span>
              </>
            )}
          </button>
        </div>

        {/* Thông tin User & Đăng xuất ở chân Sidebar */}
        <div className="p-3 border-t border-border/60 bg-secondary/30">
          <div className={`flex items-center gap-3 ${collapsed ? 'flex-col items-center' : ''}`}>
            {/* Avatar */}
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-500/20 to-indigo-500/20 border border-blue-500/30 flex items-center justify-center text-blue-400 font-semibold text-sm shrink-0">
              <User className="w-4 h-4" />
            </div>

            {/* Tên & Role */}
            {!collapsed && (
              <div className="flex-1 min-w-0">
                <div className="text-xs font-semibold text-foreground truncate">
                  {profile?.full_name || user?.user_metadata?.username || user?.email?.replace('@lapthinh.com', '') || 'Người dùng'}
                </div>
                <div className="flex items-center gap-1 mt-0.5">
                  <span
                    className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${
                      isAdmin
                        ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                        : 'bg-slate-700/50 text-slate-300 border border-slate-600/40'
                    }`}
                  >
                    {isAdmin ? 'Admin' : 'Thành viên'}
                  </span>
                  {canEdit && !isAdmin && (
                    <span className="px-1.5 py-0.5 rounded text-[9px] bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                      Sửa
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Nút Đăng xuất */}
            <button
              onClick={handleSignOut}
              title="Đăng xuất"
              className="p-2 rounded-lg text-muted-foreground hover:text-rose-400 hover:bg-rose-500/10 transition-colors shrink-0"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* VÙNG NỘI DUNG CHÍNH (BÊN PHẢI) */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        {/* Topbar mỏng */}
        <header className="h-16 border-b border-border/70 bg-background/80 backdrop-blur-md px-4 sm:px-6 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            {/* Nút mở menu trên mobile */}
            <button
              onClick={() => setMobileOpen(true)}
              className="lg:hidden p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary"
            >
              <Menu className="w-5 h-5" />
            </button>

            <div>
              <h2 className="text-base sm:text-lg font-bold text-foreground">
                {currentPage.name}
              </h2>
              <p className="text-xs text-muted-foreground hidden sm:block">
                Hệ thống Quản lý Bộ phận Thiết kế • Công ty TNHH Bao Bì Lập Thịnh
              </p>
            </div>
          </div>

          {/* Thông báo góc phải */}
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-secondary/70 border border-border/50">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Hệ thống trực tuyến</span>
            </span>
          </div>
        </header>

        {/* Nội dung Page (Cuộn độc lập) */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 bg-background">
          <div className="max-w-[1750px] mx-auto w-full">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}

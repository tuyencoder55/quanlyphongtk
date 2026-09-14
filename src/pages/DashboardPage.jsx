import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuthStore } from '@/store/useAuthStore'
import { supabase } from '@/lib/supabase'
import { getDaysForMonth } from '@/lib/dateUtils'
import { 
  Users, 
  CalendarDays, 
  Clock, 
  ShieldCheck, 
  ArrowUpRight,
  UserPlus,
  FileSpreadsheet
} from 'lucide-react'

export default function DashboardPage() {
  const { user, profile } = useAuthStore()
  const [employeeCount, setEmployeeCount] = useState(0)
  const [loading, setLoading] = useState(true)

  const currentDate = new Date()
  const currentMonth = currentDate.getMonth() + 1
  const currentYear = currentDate.getFullYear()

  // Tính số ngày làm việc (không tính Chủ Nhật) trong tháng hiện tại
  const monthDays = getDaysForMonth(currentYear, currentMonth)
  const standardWorkDays = monthDays.filter(d => !d.isSunday).length

  const isAdmin = profile?.role === 'admin'
  const canEdit = isAdmin || profile?.can_edit

  useEffect(() => {
    async function loadStats() {
      try {
        const { count, error } = await supabase
          .from('employees')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'active')

        if (!error && count !== null) {
          setEmployeeCount(count)
        }
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    loadStats()
  }, [])

  const stats = [
    {
      title: 'Nhân Sự Hoạt Động',
      value: loading ? '...' : `${employeeCount} người`,
      desc: 'Phòng Thiết Kế',
      icon: Users,
      color: 'text-blue-400',
      bg: 'bg-blue-500/10',
      border: 'border-blue-500/20',
    },
    {
      title: 'Kỳ Hiện Tại',
      value: `Tháng ${String(currentMonth).padStart(2, '0')}/${currentYear}`,
      desc: `${monthDays.length} ngày trong tháng`,
      icon: CalendarDays,
      color: 'text-indigo-400',
      bg: 'bg-indigo-500/10',
      border: 'border-indigo-500/20',
    },
    {
      title: 'Ngày Công Chuẩn',
      value: `${standardWorkDays} ngày`,
      desc: 'Không tính Chủ Nhật',
      icon: Clock,
      color: 'text-emerald-400',
      bg: 'bg-emerald-500/10',
      border: 'border-emerald-500/20',
    },
    {
      title: 'Quyền Hạn Của Bạn',
      value: isAdmin ? 'Quản Trị Viên' : 'Thành Viên',
      desc: canEdit ? 'Được phép sửa dữ liệu' : 'Chế độ chỉ xem',
      icon: ShieldCheck,
      color: 'text-amber-400',
      bg: 'bg-amber-500/10',
      border: 'border-amber-500/20',
    },
  ]

  return (
    <div className="space-y-6">
      {/* 4 Thẻ Thống kê nhanh gọn gàng */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((item, idx) => {
          const Icon = item.icon
          return (
            <div
              key={idx}
              className="bg-card border border-border/70 rounded-xl p-4 flex items-center justify-between shadow-sm"
            >
              <div>
                <p className="text-xs font-medium text-muted-foreground">{item.title}</p>
                <h3 className="text-xl font-bold text-foreground mt-1 tracking-tight">
                  {item.value}
                </h3>
                <p className="text-[11px] text-muted-foreground/80 mt-0.5">{item.desc}</p>
              </div>
              <div className={`w-10 h-10 rounded-xl ${item.bg} ${item.border} border flex items-center justify-center ${item.color}`}>
                <Icon className="w-5 h-5" />
              </div>
            </div>
          )
        })}
      </div>

      {/* Lối tắt nghiệp vụ chính */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Lối tắt Bảng chấm công */}
        <Link
          to="/timesheet"
          className="group bg-card border border-border/70 hover:border-primary/50 rounded-xl p-5 transition-all shadow-sm flex flex-col justify-between"
        >
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center group-hover:scale-105 transition-transform">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-semibold text-sm text-foreground group-hover:text-primary transition-colors">
                  Bảng Chấm Công
                </h4>
                <p className="text-xs text-muted-foreground">
                  Theo dõi giờ công, tăng ca & ngày nghỉ tháng {currentMonth}/{currentYear}
                </p>
              </div>
            </div>
            <ArrowUpRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
          </div>
        </Link>

        {/* Lối tắt Quản lý nhân viên */}
        <Link
          to="/employees"
          className="group bg-card border border-border/70 hover:border-primary/50 rounded-xl p-5 transition-all shadow-sm flex flex-col justify-between"
        >
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center group-hover:scale-105 transition-transform">
                <UserPlus className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-semibold text-sm text-foreground group-hover:text-primary transition-colors">
                  Quản Lý Nhân Viên
                </h4>
                <p className="text-xs text-muted-foreground">
                  Thêm mới, chỉnh sửa thông tin & tên chữ Hán nhân sự
                </p>
              </div>
            </div>
            <ArrowUpRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
          </div>
        </Link>
      </div>
    </div>
  )
}

import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuthStore } from '@/store/useAuthStore'
import { supabase } from '@/lib/supabase'
import { getDaysForMonth } from '@/lib/dateUtils'
import { getTimesheetPeriod } from '@/features/timesheet/timesheetService'
import { quickClockOutToday } from '@/features/overtime/overtimeService'
import { 
  Users, 
  CalendarDays, 
  Clock, 
  ShieldCheck, 
  ArrowUpRight,
  UserPlus,
  FileSpreadsheet,
  Sparkles,
  User,
  Shield,
  CheckCircle2,
  Calendar
} from 'lucide-react'
import toast from 'react-hot-toast'

export default function DashboardPage() {
  const { user, profile } = useAuthStore()
  const [employeeCount, setEmployeeCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState(null)

  // Thông tin riêng cho tài khoản Member (Thành viên)
  const [memberEmployee, setMemberEmployee] = useState(null)
  const [memberWorkDays, setMemberWorkDays] = useState(0)
  const [memberOvertimeHours, setMemberOvertimeHours] = useState(0)

  const currentDate = new Date()
  const currentMonth = currentDate.getMonth() + 1
  const currentYear = currentDate.getFullYear()

  // Tính số ngày làm việc (không tính Chủ Nhật) trong tháng hiện tại
  const monthDays = getDaysForMonth(currentYear, currentMonth)
  const standardWorkDays = monthDays.filter(d => !d.isSunday).length

  const isAdmin = profile?.role === 'admin'
  const canEdit = isAdmin || profile?.can_edit

  useEffect(() => {
    async function loadDashboardData() {
      setLoading(true)
      try {
        // 1. Lấy kỳ chấm công hiện tại
        const p = await getTimesheetPeriod(currentMonth, currentYear)
        setPeriod(p)

        if (isAdmin) {
          // Với Admin: Đếm tổng số nhân sự đang hoạt động
          const { count } = await supabase
            .from('employees')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'active')

          setEmployeeCount(count || 0)
        } else {
          // Với Member: Tìm hồ sơ nhân viên liên kết
          let emp = null
          if (profile?.employee_id) {
            const { data } = await supabase
              .from('employees')
              .select('*')
              .eq('id', profile.employee_id)
              .maybeSingle()
            emp = data
          } else {
            // Thử tìm theo tên hoặc username nếu chưa gán cứng employee_id
            const searchName = profile?.full_name || profile?.username || ''
            if (searchName) {
              const { data: emps } = await supabase
                .from('employees')
                .select('*')
                .or(`full_name.ilike.%${searchName}%,employee_code.ilike.%${searchName}%`)
                .limit(1)
              if (emps && emps.length > 0) {
                emp = emps[0]
              }
            }
          }
          setMemberEmployee(emp)

          // Nếu có kỳ và có hồ sơ nhân viên -> Tính ngày công và giờ tăng ca của riêng bạn đó
          if (p && emp) {
            const { data: entries } = await supabase
              .from('timesheet_entries')
              .select('*')
              .eq('period_id', p.id)
              .eq('employee_id', emp.id)

            if (entries && entries.length > 0) {
              // Đếm số ngày có đi làm hoặc nghỉ phép năm
              const workCount = entries.filter(
                (e) => e.row_type === 'work' && (Number(e.value_hours) > 0 || e.leave_code === 'PN')
              ).length
              setMemberWorkDays(workCount)

              // Tổng giờ tăng ca
              const otTotal = entries
                .filter((e) => e.row_type === 'overtime')
                .reduce((sum, e) => sum + Number(e.value_hours || 0), 0)
              setMemberOvertimeHours(otTotal)
            }
          }
        }
      } catch (err) {
        console.error('Lỗi tải Dashboard:', err)
      } finally {
        setLoading(false)
      }
    }

    loadDashboardData()
  }, [isAdmin, profile?.employee_id, profile?.full_name, profile?.username])

  // Chấm nhanh Xuống ca hôm nay dành cho Member
  const handleQuickClockOut = async () => {
    if (!period) {
      toast.error(`Chưa có biểu chấm công tháng ${currentMonth}/${currentYear}!`)
      return
    }
    if (!memberEmployee) {
      toast.error('Tài khoản của bạn chưa được liên kết với hồ sơ nhân viên!')
      return
    }

    const isTodaySunday = currentDate.getDay() === 0
    try {
      const res = await quickClockOutToday(period.id, memberEmployee.id, isTodaySunday)
      toast.success(`Đã ghi nhận ca tăng ca ngày ${res.day}: ${res.hours}h (${res.startTime} — ${res.endTime})!`)
      // Cập nhật lại số giờ trên màn hình
      setMemberOvertimeHours((prev) => prev + res.hours)
    } catch (err) {
      toast.error(err.message || 'Lỗi khi chấm xuống ca')
    }
  }

  // Cấu hình các thẻ thống kê theo Vai Trò
  const stats = isAdmin
    ? [
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
          value: 'Quản Trị Viên',
          desc: 'Toàn quyền quản lý',
          icon: ShieldCheck,
          color: 'text-amber-400',
          bg: 'bg-amber-500/10',
          border: 'border-amber-500/20',
        },
      ]
    : [
        {
          title: 'Hồ Sơ Nhân Sự',
          value: memberEmployee ? memberEmployee.employee_code : 'Chưa liên kết',
          desc: memberEmployee?.full_name || profile?.full_name || 'Thành viên',
          icon: User,
          color: 'text-blue-400',
          bg: 'bg-blue-500/10',
          border: 'border-blue-500/20',
        },
        {
          title: 'Ngày Công Tháng Này',
          value: loading ? '...' : `${memberWorkDays} ngày`,
          desc: `Chuẩn: ${standardWorkDays} ngày công`,
          icon: Calendar,
          color: 'text-emerald-400',
          bg: 'bg-emerald-500/10',
          border: 'border-emerald-500/20',
        },
        {
          title: 'Tổng Giờ Tăng Ca',
          value: loading ? '...' : `${memberOvertimeHours} giờ`,
          desc: `Tháng ${String(currentMonth).padStart(2, '0')}/${currentYear}`,
          icon: Clock,
          color: 'text-amber-400',
          bg: 'bg-amber-500/10',
          border: 'border-amber-500/20',
        },
        {
          title: 'Vai Trò Hệ Thống',
          value: 'Thành Viên',
          desc: canEdit ? 'Được phép sửa dữ liệu' : 'Chế độ xem & đề nghị tăng ca',
          icon: Shield,
          color: 'text-indigo-400',
          bg: 'bg-indigo-500/10',
          border: 'border-indigo-500/20',
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

      {/* Banner 1 chạm dành riêng cho Member */}
      {!isAdmin && memberEmployee && (
        <div className="bg-gradient-to-r from-blue-600/15 via-indigo-600/15 to-purple-600/10 border border-blue-500/25 rounded-2xl p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-500 flex items-center justify-center text-white shadow-md shadow-orange-500/20 shrink-0">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-foreground text-sm sm:text-base">
                Chào bạn, {memberEmployee.full_name} {memberEmployee.chinese_name ? `(${memberEmployee.chinese_name})` : ''}!
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Khi tan ca làm việc hôm nay, bạn có thể bấm nút bên cạnh để tự động ghi nhận giờ tăng ca.
              </p>
            </div>
          </div>

          <button
            onClick={handleQuickClockOut}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-bold text-xs rounded-xl shadow-md shadow-orange-500/25 transition-all active:scale-95 shrink-0"
          >
            <Clock className="w-4 h-4" />
            <span>Chấm Xuống Ca Hôm Nay</span>
          </button>
        </div>
      )}

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
                  {isAdmin 
                    ? `Theo dõi & duyệt giờ công toàn phòng tháng ${currentMonth}/${currentYear}`
                    : `Đối chiếu ngày công và các mã phép của bạn tháng ${currentMonth}/${currentYear}`}
                </p>
              </div>
            </div>
            <ArrowUpRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
          </div>
        </Link>

        {/* Lối tắt Đề Nghị Tăng Ca (Dành cho Member) HOẶC Quản Lý Nhân Viên (Dành cho Admin) */}
        {!isAdmin ? (
          <Link
            to="/overtime"
            className="group bg-card border border-border/70 hover:border-primary/50 rounded-xl p-5 transition-all shadow-sm flex flex-col justify-between"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center group-hover:scale-105 transition-transform">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-semibold text-sm text-foreground group-hover:text-primary transition-colors">
                    Giấy Đề Nghị Tăng Ca
                  </h4>
                  <p className="text-xs text-muted-foreground">
                    Xem chi tiết các ca làm thêm, in phiếu hoặc xuất file Excel cá nhân
                  </p>
                </div>
              </div>
              <ArrowUpRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
            </div>
          </Link>
        ) : (
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
        )}
      </div>
    </div>
  )
}

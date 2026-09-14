import React, { useState, useEffect, useCallback } from 'react'
import { useAuthStore } from '@/store/useAuthStore'
import { getDaysForMonth } from '@/lib/dateUtils'
import { 
  getTimesheetPeriod, 
  createTimesheetPeriod, 
  getPeriodData, 
  updateTimesheetCell,
  getAllPeriods 
} from '@/features/timesheet/timesheetService'
import TimesheetGrid from '@/features/timesheet/TimesheetGrid'
import { exportTimesheetToExcel } from '@/features/timesheet/exportExcel'
import { 
  CalendarDays, 
  PlusCircle, 
  ChevronLeft, 
  ChevronRight, 
  Loader2, 
  Sparkles,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  Printer,
  FileSpreadsheet,
  Download,
  Wand2
} from 'lucide-react'
import toast from 'react-hot-toast'

export default function TimesheetPage() {
  const { profile } = useAuthStore()
  const isAdmin = profile?.role === 'admin'
  const canEdit = isAdmin || profile?.can_edit

  const now = new Date()
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1)
  const [selectedYear, setSelectedYear] = useState(now.getFullYear())

  const [period, setPeriod] = useState(null)
  const [employees, setEmployees] = useState([])
  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)

  // Danh sách ngày trong tháng đang chọn
  const days = getDaysForMonth(selectedYear, selectedMonth)

  // Tải dữ liệu kỳ hiện tại
  const loadPeriod = useCallback(async () => {
    setLoading(true)
    try {
      const p = await getTimesheetPeriod(selectedMonth, selectedYear)
      setPeriod(p)

      if (p) {
        const { entries: ent, employees: emp } = await getPeriodData(p.id)
        setEntries(ent)
        setEmployees(emp)
      } else {
        setEntries([])
        setEmployees([])
      }
    } catch (err) {
      toast.error('Lỗi tải dữ liệu chấm công: ' + err.message)
    } finally {
      setLoading(false)
    }
  }, [selectedMonth, selectedYear])

  useEffect(() => {
    loadPeriod()
  }, [loadPeriod])

  // Xử lý tạo biểu chấm công tháng mới
  const handleCreatePeriod = async () => {
    if (!isAdmin) {
      toast.error('Chỉ Quản trị viên (Admin) mới có quyền tạo kỳ mới!')
      return
    }

    setCreating(true)
    try {
      await createTimesheetPeriod(selectedMonth, selectedYear, profile?.id)
      toast.success(`Đã tạo thành công biểu chấm công tháng ${selectedMonth}/${selectedYear}!`)
      await loadPeriod()
    } catch (err) {
      toast.error(err.message || 'Lỗi khi tạo biểu chấm công tháng mới')
    } finally {
      setCreating(false)
    }
  }

  // Xử lý cập nhật ô chấm công (Optimistic UI để người dùng không phải chờ mạng)
  const handleSaveCell = async (cellPayload) => {
    const { periodId, employeeId, rowType, day, valueHours, leaveCode, leaveHours, entryId } = cellPayload

    // 1. Cập nhật ngay trên state giao diện
    setEntries((prev) => {
      const existingIndex = prev.findIndex(
        (e) => e.employee_id === employeeId && e.row_type === rowType && e.day === day
      )

      const updatedEntry = {
        id: entryId || `temp_${Date.now()}`,
        period_id: periodId,
        employee_id: employeeId,
        row_type: rowType,
        day,
        value_hours: valueHours,
        leave_code: leaveCode,
        leave_hours: leaveHours,
      }

      if (existingIndex >= 0) {
        const next = [...prev]
        next[existingIndex] = { ...next[existingIndex], ...updatedEntry }
        return next
      } else {
        return [...prev, updatedEntry]
      }
    })

    // 2. Gửi request lưu vào Supabase ngầm
    try {
      const savedData = await updateTimesheetCell(cellPayload)
      // Cập nhật lại ID thật từ database nếu trước đó là id tạm
      if (savedData?.id) {
        setEntries((prev) => 
          prev.map((e) => 
            e.employee_id === employeeId && e.row_type === rowType && e.day === day
              ? savedData
              : e
          )
        )
      }
    } catch (err) {
      toast.error('Lỗi khi lưu ô chấm công: ' + err.message)
      // Hoàn tác nếu lỗi
      loadPeriod()
    }
  }

  // Chuyển sang tháng trước
  const handlePrevMonth = () => {
    if (selectedMonth === 1) {
      setSelectedMonth(12)
      setSelectedYear(selectedYear - 1)
    } else {
      setSelectedMonth(selectedMonth - 1)
    }
  }

  // Chuyển sang tháng kế tiếp
  const handleNextMonth = () => {
    if (selectedMonth === 12) {
      setSelectedMonth(1)
      setSelectedYear(selectedYear + 1)
    } else {
      setSelectedMonth(selectedMonth + 1)
    }
  }

  // Về tháng hiện tại
  const handleCurrentMonth = () => {
    setSelectedMonth(now.getMonth() + 1)
    setSelectedYear(now.getFullYear())
  }

  // Luôn đặt khổ A4 Ngang khi người dùng đang ở trang Bảng Chấm Công
  useEffect(() => {
    const style = document.createElement('style')
    style.id = 'timesheet-print-orientation'
    style.innerHTML = `
      @page {
        size: A4 landscape;
        margin: 4mm 3mm;
      }
    `
    document.head.appendChild(style)
    return () => {
      const el = document.getElementById('timesheet-print-orientation')
      if (el) el.remove()
    }
  }, [])

  // In ấn biểu mẫu trực tiếp trên web (khổ A4 ngang)
  const handlePrint = () => {
    if (!period || employees.length === 0) {
      toast.error('Chưa có dữ liệu biểu mẫu để in!')
      return
    }

    // Ép khổ giấy in A4 Landscape (Ngang) - Không dùng !important trong @page vì vi phạm cú pháp CSS
    const oldStyle = document.getElementById('print-page-style')
    if (oldStyle) oldStyle.remove()
    const style = document.createElement('style')
    style.id = 'print-page-style'
    style.innerHTML = '@page { size: A4 landscape; margin: 4mm 3mm; }'
    document.head.appendChild(style)

    setTimeout(() => {
      window.print()
    }, 100)
  }

  // Xuất file Excel chuẩn A4 Landscape
  const handleExportExcel = () => {
    if (!period || employees.length === 0) {
      toast.error('Chưa có dữ liệu để xuất Excel!')
      return
    }
    try {
      exportTimesheetToExcel({ period, days, employees, entries })
      toast.success(`Đã xuất file Excel tháng ${selectedMonth}/${selectedYear} thành công!`)
    } catch (err) {
      toast.error('Lỗi khi xuất file Excel: ' + err.message)
    }
  }

  // Điền nhanh mặc định 8h cho toàn bộ ngày thường của nhân viên
  const handleFillDefault8h = async () => {
    if (!period || employees.length === 0) return
    if (!window.confirm('Bạn có muốn đặt mặc định 8h làm việc cho toàn bộ ngày thường (không tính Chủ Nhật) trong tháng này không?')) {
      return
    }

    try {
      const updates = []
      days.forEach((d) => {
        if (!d.isSunday) {
          employees.forEach((emp) => {
            const existing = entries.find(
              (e) => e.employee_id === emp.id && e.row_type === 'work' && e.day === d.day
            )
            // Chỉ điền 8h nếu ô hiện tại đang là 0 và không có mã phép
            if (!existing?.leave_code && (!existing?.value_hours || Number(existing.value_hours) === 0)) {
              updates.push({
                entryId: existing?.id,
                periodId: period.id,
                employeeId: emp.id,
                rowType: 'work',
                day: d.day,
                valueHours: 8,
                leaveCode: null,
                leaveHours: 0,
              })
            }
          })
        }
      })

      if (updates.length === 0) {
        toast('Tất cả các ô ngày thường đều đã có dữ liệu công!')
        return
      }

      for (const item of updates) {
        await updateTimesheetCell(item)
      }

      toast.success(`Đã điền mặc định 8h cho ${updates.length} ô ngày thường!`)
      loadPeriod()
    } catch (err) {
      toast.error('Lỗi: ' + err.message)
    }
  }

  return (
    <div className="space-y-4 max-w-[1700px] mx-auto">
      {/* THANH ĐIỀU HƯỚNG KỲ (CHỌN THÁNG / NĂM) - ẨN KHI IN */}
      <div className="no-print bg-card border border-border/70 rounded-2xl p-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Bộ chọn tháng năm */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <div className="flex items-center gap-1 bg-secondary/80 p-1 rounded-xl border border-border/60">
            <button
              onClick={handlePrevMonth}
              title="Tháng trước"
              className="p-1.5 rounded-lg hover:bg-card text-muted-foreground hover:text-foreground transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            {/* Dropdown chọn Tháng */}
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
              className="bg-transparent font-bold text-sm text-foreground px-2 py-1 outline-none cursor-pointer"
            >
              {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                <option key={m} value={m} className="bg-card text-foreground">
                  Tháng {m}
                </option>
              ))}
            </select>

            {/* Dropdown chọn Năm */}
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="bg-transparent font-bold text-sm text-foreground px-2 py-1 outline-none cursor-pointer border-l border-border/60"
            >
              {[2024, 2025, 2026, 2027, 2028, 2029, 2030].map((y) => (
                <option key={y} value={y} className="bg-card text-foreground">
                  Năm {y}
                </option>
              ))}
            </select>

            <button
              onClick={handleNextMonth}
              title="Tháng sau"
              className="p-1.5 rounded-lg hover:bg-card text-muted-foreground hover:text-foreground transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Nút về tháng hiện tại */}
          <button
            onClick={handleCurrentMonth}
            className="px-3 py-2 rounded-xl text-xs font-semibold bg-secondary/60 hover:bg-secondary text-muted-foreground hover:text-foreground border border-border/50 transition-colors"
          >
            Tháng hiện tại
          </button>
        </div>

        {/* Trạng thái kỳ & Các nút thao tác (In, Xuất Excel, Tạo kỳ) */}
        <div className="flex flex-wrap items-center gap-2">
          {period ? (
            <>
              {/* Nút In ấn trực tiếp web */}
              <button
                onClick={handlePrint}
                title="In biểu mẫu trực tiếp ra máy in hoặc lưu PDF khổ A4 ngang"
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-secondary/80 hover:bg-secondary text-foreground border border-border/60 hover:border-primary/50 transition-all shadow-sm"
              >
                <Printer className="w-4 h-4 text-blue-400" />
                <span>In Biểu Mẫu (A4)</span>
              </button>

              {/* Nút Xuất file Excel */}
              <button
                onClick={handleExportExcel}
                title="Xuất biểu chấm công ra file Excel (.xlsx) chuẩn khổ in A4 ngang"
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 hover:border-emerald-500/50 transition-all shadow-sm"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                <span>Xuất Excel (.xlsx)</span>
              </button>

              {/* Nút Điền 8h ngày thường (chỉ Admin/người có quyền) */}
              {canEdit && (
                <button
                  onClick={handleFillDefault8h}
                  title="Tự động điền 8h cho toàn bộ ngày thường của nhân viên"
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-secondary/60 border border-border/40 transition-all"
                >
                  <Wand2 className="w-3.5 h-3.5 text-amber-400" />
                  <span>Điền 8h Ngày Thường</span>
                </button>
              )}
            </>
          ) : (
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-semibold">
              <AlertCircle className="w-4 h-4" />
              <span>Chưa có biểu công tháng {selectedMonth}/{selectedYear}</span>
            </div>
          )}

          {/* Nút tạo kỳ mới (chỉ hiện khi chưa có kỳ và user là Admin) */}
          {!period && isAdmin && (
            <button
              onClick={handleCreatePeriod}
              disabled={creating}
              className="inline-flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-xl text-xs shadow-md shadow-primary/25 transition-all disabled:opacity-50"
            >
              {creating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Đang khởi tạo...</span>
                </>
              ) : (
                <>
                  <PlusCircle className="w-4 h-4" />
                  <span>Tạo Biểu Chấm Công Tháng {selectedMonth}/{selectedYear}</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* VÙNG HIỂN THỊ BẢNG HOẶC TRẠNG THÁI CHỜ */}
      {loading ? (
        <div className="bg-card border border-border/70 rounded-2xl p-16 flex flex-col items-center justify-center gap-3 text-muted-foreground">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <span className="text-sm font-medium">Đang tải dữ liệu chấm công...</span>
        </div>
      ) : period ? (
        <TimesheetGrid
          period={period}
          days={days}
          employees={employees}
          entries={entries}
          canEdit={canEdit}
          onSaveCell={handleSaveCell}
        />
      ) : (
        /* Màn hình khi chưa tạo kỳ */
        <div className="bg-card border border-border/70 rounded-2xl p-16 text-center shadow-sm">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500/10 to-indigo-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center mx-auto mb-4">
            <CalendarDays className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-foreground">
            Chưa có biểu chấm công cho Tháng {selectedMonth}/{selectedYear}
          </h3>
          <p className="text-xs text-muted-foreground mt-1 max-w-md mx-auto">
            {isAdmin 
              ? 'Bấm nút bên dưới để tạo kỳ chấm công mới. Hệ thống sẽ tự động đồng bộ tất cả nhân viên đang làm việc vào bảng.'
              : 'Kỳ chấm công tháng này chưa được mở bởi Quản trị viên. Vui lòng liên hệ Admin để tạo kỳ.'}
          </p>

          {isAdmin && (
            <button
              onClick={handleCreatePeriod}
              disabled={creating}
              className="mt-6 inline-flex items-center gap-2 px-5 py-3 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-xl text-sm shadow-lg shadow-primary/25 transition-all disabled:opacity-50"
            >
              {creating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Đang khởi tạo...</span>
                </>
              ) : (
                <>
                  <PlusCircle className="w-5 h-5" />
                  <span>Tạo Biểu Chấm Công Tháng {selectedMonth}/{selectedYear}</span>
                </>
              )}
            </button>
          )}
        </div>
      )}
    </div>
  )
}

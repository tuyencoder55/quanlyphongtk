import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { useAuthStore } from '@/store/useAuthStore'
import { getDaysForMonth } from '@/lib/dateUtils'
import { getTimesheetPeriod } from '@/features/timesheet/timesheetService'
import { 
  getEmployeeOvertimeEntries, 
  saveOvertimeEntry, 
  deleteOvertimeEntry,
  quickClockOutToday 
} from '@/features/overtime/overtimeService'
import OvertimeSheet from '@/features/overtime/OvertimeSheet'
import OvertimeModal from '@/features/overtime/OvertimeModal'
import { exportOvertimeToExcel } from '@/features/overtime/exportOvertimeExcel'
import { supabase } from '@/lib/supabase'
import { 
  Clock, 
  PlusCircle, 
  ChevronLeft, 
  ChevronRight, 
  ChevronDown,
  Printer, 
  FileSpreadsheet, 
  Loader2, 
  Users, 
  Sparkles,
  AlertCircle,
  CheckCircle2,
  CalendarDays
} from 'lucide-react'
import toast from 'react-hot-toast'

export default function OvertimePage() {
  const { profile } = useAuthStore()
  const isAdmin = profile?.role === 'admin'
  const canEdit = isAdmin || profile?.can_edit

  const now = new Date()
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1)
  const [selectedYear, setSelectedYear] = useState(now.getFullYear())

  const [period, setPeriod] = useState(null)
  const [employees, setEmployees] = useState([])
  const [deptFilter, setDeptFilter] = useState('ALL') // 'ALL' | 'TK' | 'CTP'
  const [selectedEmpId, setSelectedEmpId] = useState('')
  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingEntry, setEditingEntry] = useState(null)
  const [isBulkPrinting, setIsBulkPrinting] = useState(false)
  const [allEmployeesEntries, setAllEmployeesEntries] = useState(new Map())

  const days = useMemo(() => getDaysForMonth(selectedYear, selectedMonth), [selectedYear, selectedMonth])

  // 1. Tải danh sách nhân viên và kỳ chấm công
  const loadInitialData = useCallback(async () => {
    setLoading(true)
    try {
      // Lấy danh sách nhân viên đang làm việc
      const { data: emps, error: empErr } = await supabase
        .from('employees')
        .select('*')
        .eq('status', 'active')
        .order('employee_code', { ascending: true })

      if (empErr) throw empErr
      setEmployees(emps || [])

      // Nếu là Member có gắn hồ sơ nhân viên -> Tự động chọn đúng nhân viên đó
      if (!isAdmin && profile?.employee_id) {
        setSelectedEmpId(profile.employee_id)
      } else if (emps && emps.length > 0 && !selectedEmpId) {
        setSelectedEmpId(emps[0].id)
      }

      // Lấy kỳ chấm công
      const p = await getTimesheetPeriod(selectedMonth, selectedYear)
      setPeriod(p)
    } catch (err) {
      toast.error('Lỗi tải dữ liệu: ' + err.message)
    } finally {
      setLoading(false)
    }
  }, [selectedMonth, selectedYear, selectedEmpId])

  useEffect(() => {
    loadInitialData()
  }, [loadInitialData])

  // 2. Tải danh sách ca tăng ca của nhân viên đang chọn
  const loadEmployeeEntries = useCallback(async () => {
    if (!period || !selectedEmpId) {
      setEntries([])
      return
    }
    try {
      const data = await getEmployeeOvertimeEntries(
        period.id, 
        selectedEmpId, 
        period.month, 
        period.year, 
        days
      )
      setEntries(data)
    } catch (err) {
      console.error('Lỗi tải ca tăng ca:', err)
      toast.error('Lỗi tải ca tăng ca của nhân viên')
    }
  }, [period, selectedEmpId, days])

  useEffect(() => {
    loadEmployeeEntries()
  }, [loadEmployeeEntries])

  // Danh sách nhân viên sau khi lọc theo bộ phận
  const filteredEmployees = useMemo(() => {
    if (deptFilter === 'ALL') return employees
    return employees.filter((e) => (e.department || 'TK') === deptFilter)
  }, [employees, deptFilter])

  // Xử lý đổi bộ phận lọc
  const handleDeptFilterChange = (dept) => {
    setDeptFilter(dept)
    const list = dept === 'ALL' ? employees : employees.filter((e) => (e.department || 'TK') === dept)
    if (list.length > 0 && !list.some((e) => e.id === selectedEmpId)) {
      setSelectedEmpId(list[0].id)
    }
  }

  // Nhân viên đang chọn
  const currentEmployee = useMemo(() => {
    return filteredEmployees.find((e) => e.id === selectedEmpId) || filteredEmployees[0] || null
  }, [filteredEmployees, selectedEmpId])

  // Chuyển tháng
  const handlePrevMonth = () => {
    if (selectedMonth === 1) {
      setSelectedMonth(12)
      setSelectedYear(selectedYear - 1)
    } else {
      setSelectedMonth(selectedMonth - 1)
    }
  }

  const handleNextMonth = () => {
    if (selectedMonth === 12) {
      setSelectedMonth(1)
      setSelectedYear(selectedYear + 1)
    } else {
      setSelectedMonth(selectedMonth + 1)
    }
  }

  // 3. Chấm nhanh Xuống ca hôm nay (1 chạm)
  const handleQuickClockOut = async () => {
    if (!period) {
      toast.error('Chưa có kỳ chấm công tháng này!')
      return
    }
    if (!currentEmployee) {
      toast.error('Vui lòng chọn nhân viên!')
      return
    }

    const todayDate = new Date()
    const isTodaySunday = todayDate.getDay() === 0

    try {
      const res = await quickClockOutToday(period.id, currentEmployee.id, isTodaySunday)
      toast.success(`Đã ghi nhận ca tăng ca ngày ${res.day}: ${res.hours} giờ (${res.startTime} — ${res.endTime})!`)
      loadEmployeeEntries()
    } catch (err) {
      toast.error(err.message || 'Lỗi khi chấm xuống ca')
    }
  }

  // 4. Lưu ca tăng ca từ modal
  const handleSaveModal = async (payload) => {
    try {
      await saveOvertimeEntry(payload)
      toast.success(`Đã lưu ca tăng ca ngày ${payload.day}: ${payload.hours} giờ!`)
      setIsModalOpen(false)
      setEditingEntry(null)
      loadEmployeeEntries()
    } catch (err) {
      toast.error('Lỗi lưu ca tăng ca: ' + err.message)
    }
  }

  // 5. Xoá ca tăng ca
  const handleDeleteModal = async (day) => {
    if (!window.confirm(`Bạn có chắc muốn xoá ca tăng ca ngày ${day}?`)) return
    try {
      await deleteOvertimeEntry(period.id, currentEmployee.id, day)
      toast.success(`Đã xoá ca tăng ca ngày ${day}!`)
      setIsModalOpen(false)
      setEditingEntry(null)
      loadEmployeeEntries()
    } catch (err) {
      toast.error('Lỗi xoá ca: ' + err.message)
    }
  }

  // Luôn đảm bảo trang Tăng ca in ở khổ A4 Dọc (Portrait) dù bấm nút In hay bấm Ctrl+P
  useEffect(() => {
    const style = document.createElement('style')
    style.id = 'overtime-print-orientation'
    style.innerHTML = `
      @page {
        size: A4 portrait;
        margin: 5mm 5mm;
      }
    `
    document.head.appendChild(style)
    return () => {
      const el = document.getElementById('overtime-print-orientation')
      if (el) el.remove()
    }
  }, [])

  // 6. In biểu mẫu đơn lẻ của nhân viên đang chọn (A4 Dọc)
  const handlePrintSingle = () => {
    if (!period || !currentEmployee) {
      toast.error('Chưa có thông tin để in!')
      return
    }
    setIsBulkPrinting(false)

    // Ép khổ giấy in A4 Portrait (Dọc) - Tuyệt đối không dùng !important bên trong @page
    const oldStyle = document.getElementById('print-page-style')
    if (oldStyle) oldStyle.remove()
    const style = document.createElement('style')
    style.id = 'print-page-style'
    style.innerHTML = `
      @page { 
        size: A4 portrait; 
        margin: 5mm 5mm; 
      }
      @media print {
        html, body, #root, #root > div, .min-h-screen, .h-screen, main, [class*="overflow-"] {
          height: auto !important;
          min-height: 0 !important;
          overflow: visible !important;
        }
        .overtime-sheet {
          max-width: 100% !important;
          margin: 0 auto !important;
        }
      }
    `
    document.head.appendChild(style)

    setTimeout(() => {
      window.print()
    }, 100)
  }

  // 7. In hàng loạt tất cả nhân viên có tăng ca trong tháng (A4 Dọc từng người)
  const handlePrintBulk = async () => {
    if (!period || employees.length === 0) {
      toast.error('Chưa có nhân viên nào để in!')
      return
    }

    setLoading(true)
    try {
      const map = new Map()
      const listToPrint = filteredEmployees.length > 0 ? filteredEmployees : employees
      for (const emp of listToPrint) {
        const empEntries = await getEmployeeOvertimeEntries(
          period.id,
          emp.id,
          period.month,
          period.year,
          days
        )
        map.set(emp.id, empEntries)
      }

      setAllEmployeesEntries(map)
      setIsBulkPrinting(true)
      setLoading(false)

      // Ép khổ giấy in A4 Portrait (Dọc) - Tuyệt đối không dùng !important bên trong @page
      const oldStyle = document.getElementById('print-page-style')
      if (oldStyle) oldStyle.remove()
      const style = document.createElement('style')
      style.id = 'print-page-style'
      style.innerHTML = `
        @page { 
          size: A4 portrait; 
          margin: 5mm 5mm; 
        }
        @media print {
          html, body, #root, #root > div, .min-h-screen, .h-screen, main, [class*="overflow-"] {
            height: auto !important;
            min-height: 0 !important;
            overflow: visible !important;
          }
          .overtime-sheet {
            max-width: 100% !important;
            margin: 0 auto !important;
          }
        }
      `
      document.head.appendChild(style)

      setTimeout(() => {
        window.print()
        setIsBulkPrinting(false)
      }, 300)
    } catch (err) {
      setLoading(false)
      toast.error('Lỗi chuẩn bị in hàng loạt: ' + err.message)
    }
  }

  // 8. Xuất file Excel chuẩn A4 Dọc
  const handleExportExcel = () => {
    if (!period || !currentEmployee) {
      toast.error('Chưa có thông tin để xuất Excel!')
      return
    }
    try {
      exportOvertimeToExcel({
        period,
        employee: currentEmployee,
        entries,
        reason: 'Xử lý file / 处理档案'
      })
      toast.success(`Đã xuất file Excel tăng ca của ${currentEmployee.full_name}!`)
    } catch (err) {
      toast.error('Lỗi khi xuất file Excel: ' + err.message)
    }
  }

  return (
    <div className="space-y-4 max-w-[1700px] mx-auto">
      {/* THANH CÔNG CỤ ĐIỀU KHIỂN - TẤT CẢ NẰM TRÊN 1 HÀNG */}
      <div className="no-print bg-card border border-border/70 rounded-2xl px-4 py-2.5 shadow-sm flex items-center justify-between gap-3 overflow-x-auto flex-nowrap">
        {/* Bộ lọc Tháng / Năm, Nhân viên và Tổng giờ tháng */}
        <div className="flex items-center gap-2.5 shrink-0 flex-nowrap">
          {/* Bộ chọn Tháng / Năm */}
          <div className="flex items-center gap-1 bg-secondary/80 p-1 rounded-xl border border-border/60 shrink-0">
            <button
              onClick={handlePrevMonth}
              title="Tháng trước"
              className="p-1.5 rounded-lg hover:bg-card text-muted-foreground hover:text-foreground transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

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

          {/* Bộ lọc bộ phận (Admin) */}
          {isAdmin && (
            <div className="flex items-center bg-secondary/80 p-0.5 rounded-xl border border-border/60 shrink-0 text-xs font-semibold">
              <button
                type="button"
                onClick={() => handleDeptFilterChange('ALL')}
                className={`px-2 py-1 rounded-lg transition-all ${
                  deptFilter === 'ALL'
                    ? 'bg-card text-foreground shadow-sm font-bold'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Tất cả
              </button>
              <button
                type="button"
                onClick={() => handleDeptFilterChange('TK')}
                className={`px-2 py-1 rounded-lg transition-all ${
                  deptFilter === 'TK'
                    ? 'bg-blue-600 text-white shadow-sm font-bold'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Thiết Kế
              </button>
              <button
                type="button"
                onClick={() => handleDeptFilterChange('CTP')}
                className={`px-2 py-1 rounded-lg transition-all ${
                  deptFilter === 'CTP'
                    ? 'bg-amber-600 text-white shadow-sm font-bold'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                CTP
              </button>
            </div>
          )}

          {/* Chọn Nhân viên (Admin có thể chọn bất kỳ ai, Member hiển thị tên mình) */}
          <div className="flex items-center gap-2 bg-secondary/80 hover:bg-secondary/95 px-3 py-1.5 rounded-xl border border-border/70 shadow-sm transition-all shrink-0">
            <div className="w-5 h-5 rounded-lg bg-primary/15 text-primary flex items-center justify-center shrink-0">
              <Users className="w-3.5 h-3.5" />
            </div>
            <span className="text-xs text-muted-foreground font-medium shrink-0">Nhân viên:</span>
            {isAdmin ? (
              <div className="relative flex items-center">
                <select
                  value={selectedEmpId}
                  onChange={(e) => setSelectedEmpId(e.target.value)}
                  className="bg-transparent font-bold text-xs sm:text-sm text-foreground pr-5 outline-none cursor-pointer appearance-none shrink-0"
                >
                  {filteredEmployees.map((emp) => (
                    <option key={emp.id} value={emp.id} className="bg-card text-foreground font-medium py-1">
                      [{emp.department === 'CTP' ? 'CTP' : 'TK'}] {emp.employee_code} — {emp.full_name}
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-muted-foreground pointer-events-none absolute right-0" />
              </div>
            ) : (
              <span className="font-bold text-xs sm:text-sm text-foreground shrink-0">
                {currentEmployee ? `[${currentEmployee.department === 'CTP' ? 'CTP' : 'TK'}] ${currentEmployee.employee_code} — ${currentEmployee.full_name}` : 'Chưa liên kết'}
              </span>
            )}
            {currentEmployee && (
              <span className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded tracking-wide ${
                currentEmployee.department === 'CTP'
                  ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                  : 'bg-blue-500/20 text-blue-400 border border-blue-500/40'
              }`}>
                {currentEmployee.department === 'CTP' ? 'CTP' : 'Thiết Kế'}
              </span>
            )}
          </div>

          {/* Badge tổng số giờ tăng ca của nhân viên - NẰM CÙNG 1 HÀNG VỚI NHÂN VIÊN */}
          {entries.length > 0 && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-500/10 border border-blue-500/25 text-xs shrink-0 whitespace-nowrap shadow-sm">
              <Clock className="w-3.5 h-3.5 text-blue-400" />
              <span className="text-muted-foreground font-medium">Tổng giờ:</span>
              <span className="font-bold text-blue-400 font-mono text-sm">
                {entries.reduce((sum, e) => sum + Number(e.hours || 0), 0)}h
              </span>
            </div>
          )}
        </div>

        {/* Các nút hành động chính - TẤT CẢ NẰM TRÊN 1 HÀNG */}
        <div className="flex items-center gap-2 shrink-0 flex-nowrap">
          {period && currentEmployee && (
            <>
              {/* Nút 1 chạm Chấm Xuống Ca Hôm Nay */}
              <button
                onClick={handleQuickClockOut}
                title="Bấm để ghi nhận kết thúc ca làm việc hôm nay, tự động tính giờ tăng ca lùi 30 phút"
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white shadow-sm transition-all active:scale-95 shrink-0 whitespace-nowrap"
              >
                <Sparkles className="w-4 h-4" />
                <span>Chấm Xuống Ca Hôm Nay</span>
              </button>

              {/* Nút Thêm / Sửa ca tăng ca (Admin hoặc Nhân viên đang mở phiếu của chính mình) */}
              {(canEdit || (!isAdmin && profile?.employee_id === selectedEmpId)) && (
                <button
                  onClick={() => {
                    setEditingEntry(null)
                    setIsModalOpen(true)
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm transition-all shrink-0 whitespace-nowrap"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>Thêm Ca Tăng Ca</span>
                </button>
              )}

              {/* Nút In Biểu Này (A4 Dọc) */}
              <button
                onClick={handlePrintSingle}
                title="In Giấy đề nghị tăng ca của nhân viên đang chọn khổ A4 dọc"
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-secondary/80 hover:bg-secondary text-foreground border border-border/60 transition-all shadow-sm shrink-0 whitespace-nowrap"
              >
                <Printer className="w-4 h-4 text-blue-400" />
                <span>In Biểu Này (A4)</span>
              </button>

              {/* Nút In Hàng Loạt Toàn Phòng (Chỉ Admin) */}
              {isAdmin && employees.length > 1 && (
                <button
                  onClick={handlePrintBulk}
                  title="In hàng loạt phiếu tăng ca của tất cả nhân viên trong phòng, tự động ngắt trang A4"
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-blue-500/15 hover:bg-blue-500/25 text-blue-300 border border-blue-500/30 transition-all shadow-sm shrink-0 whitespace-nowrap"
                >
                  <Printer className="w-4 h-4 text-blue-400" />
                  <span>In Hàng Loạt ({employees.length} NV)</span>
                </button>
              )}

              {/* Nút Xuất Excel */}
              <button
                onClick={handleExportExcel}
                title="Xuất phiếu tăng ca ra file Excel (.xlsx) chuẩn A4 Dọc"
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 transition-all shadow-sm shrink-0 whitespace-nowrap"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                <span>Xuất Excel (.xlsx)</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* VÙNG NỘI DUNG CHÍNH: HIỂN THỊ BIỂU MẪU */}
      {loading ? (
        <div className="bg-card border border-border/70 rounded-2xl p-16 flex flex-col items-center justify-center gap-3 text-muted-foreground">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <span className="text-sm font-medium">Đang tải biểu tăng ca...</span>
        </div>
      ) : !period ? (
        <div className="bg-card border border-border/70 rounded-2xl p-16 text-center shadow-sm">
          <CalendarDays className="w-12 h-12 text-amber-400 mx-auto mb-3 opacity-80" />
          <h3 className="text-base font-bold text-foreground">
            Chưa có biểu chấm công cho Tháng {selectedMonth}/{selectedYear}
          </h3>
          <p className="text-xs text-muted-foreground mt-1 max-w-md mx-auto">
            Vui lòng vào mục <span className="font-semibold text-primary">Bảng Chấm Công</span> để tạo kỳ mới trước khi thực hiện chấm tăng ca.
          </p>
        </div>
      ) : !currentEmployee ? (
        <div className="bg-card border border-border/70 rounded-2xl p-16 text-center shadow-sm">
          <Users className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-60" />
          <h3 className="text-base font-bold text-foreground">
            Chưa có nhân viên nào trong phòng
          </h3>
          <p className="text-xs text-muted-foreground mt-1 max-w-md mx-auto">
            Vui lòng vào mục Quản Lý Nhân Viên để thêm nhân sự.
          </p>
        </div>
      ) : (
        <div>
          {/* Chế độ in hàng loạt (Render tất cả nhân viên có ngắt trang) */}
          {isBulkPrinting ? (
            <div className="space-y-8">
              {(filteredEmployees.length > 0 ? filteredEmployees : employees).map((emp) => {
                const empEntries = allEmployeesEntries.get(emp.id) || []
                return (
                  <OvertimeSheet
                    key={emp.id}
                    period={period}
                    employee={emp}
                    entries={empEntries}
                    reason="Xử lý file / 处理档案"
                    isBulkPrint={true}
                  />
                )
              })}
            </div>
          ) : (
            /* Chế độ xem & in đơn lẻ 1 nhân viên */
            <OvertimeSheet
              period={period}
              employee={currentEmployee}
              entries={entries}
              reason="Xử lý file / 处理档案"
              isBulkPrint={false}
              canEdit={canEdit || (!isAdmin && profile?.employee_id === selectedEmpId)}
              onEditEntry={(entry) => {
                setEditingEntry(entry)
                setIsModalOpen(true)
              }}
              onDeleteEntry={handleDeleteModal}
            />
          )}
        </div>
      )}

      {/* Modal Thêm / Sửa ca tăng ca */}
      {isModalOpen && (
        <OvertimeModal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false)
            setEditingEntry(null)
          }}
          onSave={handleSaveModal}
          onDelete={editingEntry ? handleDeleteModal : null}
          initialData={editingEntry}
          period={period}
          days={days}
          employee={currentEmployee}
        />
      )}
    </div>
  )
}

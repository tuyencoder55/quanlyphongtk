import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useAuthStore } from '@/store/useAuthStore'
import { supabase } from '@/lib/supabase'
import {
  getMealReport,
  saveMealReport,
  exportMealReportExcel
} from '@/features/meal-report/mealService'
import MealReportSheet from '@/features/meal-report/MealReportSheet'
import {
  UtensilsCrossed,
  Printer,
  FileSpreadsheet,
  ChevronLeft,
  ChevronRight,
  Zap,
  RotateCcw,
  Check,
  Calculator,
  Loader2
} from 'lucide-react'
import toast from 'react-hot-toast'

export default function MealReportPage() {
  const { profile } = useAuthStore()
  const isAdmin = profile?.role === 'admin'
  const canEdit = isAdmin || profile?.can_edit

  const now = new Date()
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1)
  const [selectedYear, setSelectedYear] = useState(now.getFullYear())
  const [department, setDepartment] = useState('TK') // 'TK' hoặc 'CTP'

  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(true)
  const [saveStatus, setSaveStatus] = useState('saved') // 'saved' | 'saving'
  const isLoadedRef = useRef(false)

  const [activeHeadcount, setActiveHeadcount] = useState(14)
  const [isQuickFillOpen, setIsQuickFillOpen] = useState(false)
  const [quickPeopleCount, setQuickPeopleCount] = useState(14)

  // 1. Tải số lượng nhân viên thực tế của bộ phận để gợi ý
  useEffect(() => {
    async function loadDepartmentCount() {
      try {
        const { data, error } = await supabase
          .from('employees')
          .select('id')
          .eq('status', 'active')
          .eq('department', department)

        if (!error && data) {
          const count = data.length || 14
          setActiveHeadcount(count)
          setQuickPeopleCount(count)
        }
      } catch (err) {
        console.warn('Không tải được danh sách nhân viên:', err)
      }
    }
    loadDepartmentCount()
  }, [department])

  // 2. Tải dữ liệu biểu báo cơm
  const loadData = useCallback(async () => {
    setLoading(true)
    isLoadedRef.current = false
    try {
      const data = await getMealReport(selectedMonth, selectedYear, department)
      setEntries(data)
      isLoadedRef.current = true
      setSaveStatus('saved')
    } catch (err) {
      toast.error('Lỗi tải biểu báo cơm: ' + err.message)
    } finally {
      setLoading(false)
    }
  }, [selectedMonth, selectedYear, department])

  useEffect(() => {
    loadData()
  }, [loadData])

  // 3. Tự Động Lưu (Auto-Save) ngầm như Google Sheets mỗi khi nhập liệu
  useEffect(() => {
    if (!isLoadedRef.current || !canEdit || entries.length === 0) return

    setSaveStatus('saving')
    const timer = setTimeout(async () => {
      try {
        await saveMealReport(selectedMonth, selectedYear, entries, department)
        setSaveStatus('saved')
      } catch (err) {
        console.warn('Lỗi tự động lưu biểu báo cơm:', err)
        setSaveStatus('saved')
      }
    }, 600)

    return () => clearTimeout(timer)
  }, [entries, selectedMonth, selectedYear, department, canEdit])

  // 4. Xử lý khi Admin nhập ô
  const handleChangeEntry = (day, field, value) => {
    const numVal = Math.max(0, parseInt(value, 10) || 0)

    setEntries((prev) =>
      prev.map((row) => {
        if (row.day !== day) return row

        const updated = { ...row, [field]: numVal }

        // Logic tự động tính thông minh:
        // Nếu sửa Tổng số người hoặc Vắng -> Tự cập nhật lại Trưa = max(0, Tổng - Vắng)
        if (field === 'total_people' || field === 'absent_count') {
          const total = field === 'total_people' ? numVal : (row.total_people || 0)
          const absent = field === 'absent_count' ? numVal : (row.absent_count || 0)
          updated.lunch_count = Math.max(0, total - absent)
        }

        return updated
      })
    )
  }

  // 5. Điền nhanh quân số cho cả tháng
  const handleApplyQuickFill = (applySundays = false) => {
    const targetPeople = Number(quickPeopleCount) || 14
    setEntries((prev) =>
      prev.map((row) => {
        if (row.isSunday && !applySundays) {
          return {
            ...row,
            total_people: 0,
            absent_count: 0,
            lunch_count: 0,
            dinner_count: 0
          }
        }
        const total = targetPeople
        const absent = row.absent_count || 0
        const lunch = Math.max(0, total - absent)
        return {
          ...row,
          total_people: total,
          lunch_count: lunch
        }
      })
    )
    setIsQuickFillOpen(false)
    toast.success(`Đã điền nhanh ${targetPeople} người (tự động lưu)!`)
  }

  // 6. Tự động tính lại cơm Trưa = Tổng số người - Vắng cho toàn bộ ngày
  const handleRecalculateLunch = () => {
    setEntries((prev) =>
      prev.map((row) => ({
        ...row,
        lunch_count: Math.max(0, (Number(row.total_people) || 0) - (Number(row.absent_count) || 0))
      }))
    )
    toast.success('Đã tính lại cột Cơm Trưa = Tổng số người - Vắng!')
  }

  // 7. Xuất file Excel
  const handleExportExcel = async () => {
    try {
      await exportMealReportExcel(selectedMonth, selectedYear, entries, department)
      toast.success('Đã xuất file Excel biểu báo cơm thành công!')
    } catch (err) {
      toast.error('Lỗi xuất Excel: ' + err.message)
    }
  }

  // 8. Chuyển tháng trước / sau
  const handlePrevMonth = () => {
    if (selectedMonth === 1) {
      setSelectedMonth(12)
      setSelectedYear((y) => y - 1)
    } else {
      setSelectedMonth((m) => m - 1)
    }
  }

  const handleNextMonth = () => {
    if (selectedMonth === 12) {
      setSelectedMonth(1)
      setSelectedYear((y) => y + 1)
    } else {
      setSelectedMonth((m) => m + 1)
    }
  }

  return (
    <div className="space-y-6 pb-16">
      {/* 1. THANH TIÊU ĐỀ TRANG (Ẩn khi in) */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 print:hidden">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-white shadow-lg shadow-orange-500/20 shrink-0">
            <UtensilsCrossed className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
              Biểu Báo Cơm Hàng Ngày
              <span className="text-xs px-2 py-0.5 rounded-md bg-secondary text-muted-foreground font-normal">
                每天报饭报表
              </span>
            </h1>
            <p className="text-xs text-muted-foreground">
              Theo dõi và lập phiếu báo cơm trưa & cơm ca chiều cho bộ phận
            </p>
          </div>
        </div>

        {/* Nút thao tác chính */}
        <div className="flex flex-wrap items-center gap-2">
          {canEdit && (
            <>
              <button
                type="button"
                onClick={() => setIsQuickFillOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-secondary hover:bg-secondary/80 text-foreground border border-border/70 shadow-xs transition-colors"
                title="Tự động điền nhanh quân số cho ngày thường"
              >
                <Zap className="w-3.5 h-3.5 text-amber-500" />
                <span>Điền nhanh quân số</span>
              </button>

              <button
                type="button"
                onClick={handleRecalculateLunch}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-secondary hover:bg-secondary/80 text-foreground border border-border/70 shadow-xs transition-colors"
                title="Tính lại Trưa = Tổng - Vắng"
              >
                <Calculator className="w-3.5 h-3.5 text-blue-500" />
                <span>Tính cơm trưa</span>
              </button>

              {/* Trạng thái Tự Động Lưu ngầm (như Google Docs / Google Sheets) */}
              <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-secondary/60 border border-border/60 text-xs">
                {saveStatus === 'saving' ? (
                  <span className="inline-flex items-center gap-1.5 text-muted-foreground animate-pulse">
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
                    <span>Đang lưu...</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 text-emerald-400 font-medium">
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Đã tự động lưu</span>
                  </span>
                )}
              </div>
            </>
          )}

          <button
            type="button"
            onClick={handleExportExcel}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-600/20 transition-colors"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Xuất Excel</span>
          </button>

          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-secondary hover:bg-secondary/80 text-foreground border border-border/70 shadow-xs transition-colors"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>In Biểu A4</span>
          </button>
        </div>
      </div>

      {/* 2. THANH ĐIỀU HƯỚNG KỲ THÁNG/NĂM & BỘ PHẬN (Ẩn khi in) */}
      <div className="bg-card border border-border/80 rounded-2xl p-4 shadow-sm flex flex-wrap items-center justify-between gap-4 print:hidden">
        {/* Bộ chọn tháng năm */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handlePrevMonth}
            className="p-2 rounded-xl bg-secondary/80 hover:bg-secondary text-muted-foreground hover:text-foreground border border-border/60 transition-colors"
            title="Tháng trước"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-2">
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
              className="px-3 py-2 bg-secondary/70 border border-border/80 rounded-xl text-xs font-bold text-foreground outline-none focus:ring-2 focus:ring-primary/50 cursor-pointer"
            >
              {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                <option key={m} value={m}>
                  Tháng {String(m).padStart(2, '0')}
                </option>
              ))}
            </select>

            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="px-3 py-2 bg-secondary/70 border border-border/80 rounded-xl text-xs font-bold text-foreground outline-none focus:ring-2 focus:ring-primary/50 cursor-pointer"
            >
              {[2024, 2025, 2026, 2027, 2028].map((y) => (
                <option key={y} value={y}>
                  Năm {y}
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            onClick={handleNextMonth}
            className="p-2 rounded-xl bg-secondary/80 hover:bg-secondary text-muted-foreground hover:text-foreground border border-border/60 transition-colors"
            title="Tháng sau"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Lọc bộ phận */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground font-medium">Bộ phận:</span>
          <div className="flex items-center gap-1 bg-secondary/60 p-1 rounded-xl border border-border/60">
            <button
              type="button"
              onClick={() => setDepartment('TK')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                department === 'TK'
                  ? 'bg-card text-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Thiết Kế (TK)
            </button>
            <button
              type="button"
              onClick={() => setDepartment('CTP')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                department === 'CTP'
                  ? 'bg-card text-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              CTP
            </button>
          </div>
        </div>

        {/* Ghi chú hướng dẫn nhỏ */}
        <div className="text-[11px] text-muted-foreground">
          {canEdit ? (
            <span>💡 Click trực tiếp vào các ô để nhập số lượng • Cơm trưa tự động tính bằng <b>Tổng - Vắng</b></span>
          ) : (
            <span>🔒 Chế độ chỉ xem (chỉ Quản trị viên mới được sửa)</span>
          )}
        </div>
      </div>

      {/* 3. MODAL ĐIỀN NHANH QUÂN SỐ */}
      {isQuickFillOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="bg-card border border-border rounded-2xl p-5 max-w-sm w-full shadow-2xl space-y-4">
            <div className="flex items-center gap-2 text-foreground font-bold text-sm">
              <Zap className="w-4 h-4 text-amber-500" />
              <span>Điền nhanh quân số hằng ngày</span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Tự động áp dụng quân số cho các ngày trong tháng để không phải nhập tay từng ô:
            </p>

            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                Số người đi làm mỗi ngày:
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="1"
                  max="99"
                  value={quickPeopleCount}
                  onChange={(e) => setQuickPeopleCount(Number(e.target.value))}
                  className="w-24 px-3 py-2 bg-secondary border border-border rounded-xl font-bold font-mono text-center text-sm outline-none focus:ring-2 focus:ring-primary"
                />
                <span className="text-xs text-muted-foreground">người (Hiện có {activeHeadcount} người active)</span>
              </div>
            </div>

            <div className="space-y-2 pt-2">
              <button
                type="button"
                onClick={() => handleApplyQuickFill(false)}
                className="w-full py-2 px-3 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold transition-all shadow-sm"
              >
                Áp dụng cho Ngày Thường (T2 — T7, Chủ Nhật = 0)
              </button>

              <button
                type="button"
                onClick={() => handleApplyQuickFill(true)}
                className="w-full py-2 px-3 rounded-xl bg-secondary hover:bg-secondary/80 text-foreground text-xs font-semibold transition-all border border-border/70"
              >
                Áp dụng cho Tất Cả Các Ngày (bao gồm CN)
              </button>

              <button
                type="button"
                onClick={() => setIsQuickFillOpen(false)}
                className="w-full py-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. SHEET BIỂU BÁO CƠM CHÍNH */}
      {loading ? (
        <div className="bg-card border border-border rounded-2xl p-16 flex flex-col items-center justify-center gap-3 text-muted-foreground">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <span className="text-sm">Đang tải dữ liệu biểu báo cơm...</span>
        </div>
      ) : (
        <div className="overflow-x-auto pb-4">
          <MealReportSheet
            month={selectedMonth}
            year={selectedYear}
            department={department}
            entries={entries}
            onChangeEntry={handleChangeEntry}
            canEdit={canEdit}
          />
        </div>
      )}
    </div>
  )
}

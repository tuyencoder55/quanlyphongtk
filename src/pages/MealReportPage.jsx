import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useAuthStore } from '@/store/useAuthStore'
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
  Check,
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
  const department = 'TK' // Cố định Bộ phận Thiết Kế theo biểu mẫu

  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(true)
  const [saveStatus, setSaveStatus] = useState('saved') // 'saved' | 'saving'
  const isLoadedRef = useRef(false)

  // 1. Tải dữ liệu biểu báo cơm
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

  // 2. Tự Động Lưu (Auto-Save) ngầm như Google Sheets mỗi khi nhập liệu
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

  // 3. Xử lý khi Admin nhập ô
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

  // 4. Xuất file Excel
  const handleExportExcel = async () => {
    try {
      await exportMealReportExcel(selectedMonth, selectedYear, entries, department)
      toast.success('Đã xuất file Excel biểu báo cơm thành công!')
    } catch (err) {
      toast.error('Lỗi xuất Excel: ' + err.message)
    }
  }

  // 5. Chuyển tháng trước / sau
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

        {/* Ghi chú hướng dẫn nhỏ */}
        <div className="text-[11px] text-muted-foreground">
          {canEdit ? (
            <span>💡 Click trực tiếp vào các ô để nhập số lượng • Cơm trưa tự động tính bằng <b>Tổng - Vắng</b></span>
          ) : (
            <span>🔒 Chế độ chỉ xem (chỉ Quản trị viên mới được sửa)</span>
          )}
        </div>
      </div>

      {/* 3. SHEET BIỂU BÁO CƠM CHÍNH */}
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

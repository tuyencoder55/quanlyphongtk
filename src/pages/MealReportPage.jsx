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
  Loader2,
  AlertTriangle,
  Copy
} from 'lucide-react'
import toast from 'react-hot-toast'

const MEAL_ENTRIES_SQL = `-- Chạy lệnh này trên Supabase SQL Editor:
create table if not exists meal_entries (
  id uuid primary key default gen_random_uuid(),
  month int not null check (month between 1 and 12),
  year int not null check (year >= 2000),
  day int not null check (day between 1 and 31),
  total_people int not null default 0,
  absent_count int not null default 0,
  lunch_count int not null default 0,
  dinner_count int not null default 0,
  department text not null default 'TK',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (month, year, day, department)
);

create index if not exists idx_meal_entries_month_year on meal_entries(month, year, department);
alter table meal_entries enable row level security;

create policy "Allow select meal_entries" on meal_entries
  for select using (auth.role() = 'authenticated');

create policy "Allow write meal_entries" on meal_entries
  for all using (
    exists (
      select 1 from profiles
      where profiles.id = auth.uid()
      and (profiles.role = 'admin' or profiles.can_edit = true)
    )
  );`

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
  const [isCloudSynced, setIsCloudSynced] = useState(true) // Trạng thái kết nối Supabase Cloud

  // Lưu vết các ngày người dùng THỰC SỰ vừa gõ/sửa để chỉ lưu đúng những ngày đó lên Cloud
  const dirtyDaysRef = useRef(new Set())
  const loadedPeriodRef = useRef({ month: null, year: null })
  const entriesRef = useRef([])
  const saveTimerRef = useRef(null)

  // Hàm lưu các ngày vừa sửa lên Supabase Cloud (không bao giờ ghi đè số 0 lên ngày khác)
  const flushSave = useCallback(async () => {
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current)
      saveTimerRef.current = null
    }

    if (!canEdit || dirtyDaysRef.current.size === 0) return

    const { month, year } = loadedPeriodRef.current
    if (!month || !year) return

    const daysToSave = new Set(dirtyDaysRef.current)
    dirtyDaysRef.current.clear()

    const changedRows = entriesRef.current.filter((row) => daysToSave.has(row.day))
    if (changedRows.length === 0) return

    setSaveStatus('saving')
    try {
      const res = await saveMealReport(month, year, changedRows, department)
      setSaveStatus('saved')
      if (res?.isLocalOnly) {
        setIsCloudSynced(false)
        if (res.error) {
          toast.error('Không thể lưu lên Cloud: ' + res.error)
        }
      } else {
        setIsCloudSynced(true)
      }
    } catch (err) {
      console.warn('Lỗi lưu biểu báo cơm:', err)
      setSaveStatus('saved')
      toast.error('Lỗi lưu biểu báo cơm: ' + err.message)
    }
  }, [canEdit, department])

  // 1. Tải dữ liệu biểu báo cơm theo tháng/năm đang chọn trực tiếp từ Supabase Cloud
  useEffect(() => {
    let isCancelled = false
    setLoading(true)

    async function loadData() {
      // Nếu kỳ trước đó còn ô chưa kịp lưu -> lưu nốt cho kỳ cũ trước khi chuyển tháng
      await flushSave()

      try {
        const data = await getMealReport(selectedMonth, selectedYear, department)
        if (!isCancelled) {
          setEntries(data)
          entriesRef.current = data
          loadedPeriodRef.current = { month: selectedMonth, year: selectedYear }
          dirtyDaysRef.current.clear()
          setIsCloudSynced(Boolean(data.isDbConnected))
          setSaveStatus('saved')
        }
      } catch (err) {
        if (!isCancelled) {
          toast.error('Lỗi tải biểu báo cơm: ' + err.message)
        }
      } finally {
        if (!isCancelled) {
          setLoading(false)
        }
      }
    }

    loadData()

    return () => {
      isCancelled = true
    }
  }, [selectedMonth, selectedYear, department, flushSave])

  // Lưu nốt dữ liệu nếu người dùng rời trang trước khi hết 400ms chờ
  useEffect(() => {
    return () => {
      flushSave()
    }
  }, [flushSave])

  // 2. Xử lý khi Admin nhập ô
  const handleChangeEntry = (day, field, value) => {
    if (!canEdit) return
    const numVal = Math.max(0, parseInt(value, 10) || 0)

    const nextEntries = entriesRef.current.map((row) => {
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

    entriesRef.current = nextEntries
    setEntries(nextEntries)

    // Đánh dấu đúng ngày này vừa được sửa và hẹn lưu sau 400ms
    dirtyDaysRef.current.add(day)
    setSaveStatus('saving')
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current)
    }
    saveTimerRef.current = setTimeout(() => {
      flushSave()
    }, 400)
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

  const handleCopySql = () => {
    navigator.clipboard.writeText(MEAL_ENTRIES_SQL)
    toast.success('Đã sao chép câu lệnh SQL tạo bảng meal_entries!')
  }

  return (
    <div className="space-y-6 pb-16 print:space-y-0 print:p-0 print:m-0">
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
              ) : isCloudSynced ? (
                <span className="inline-flex items-center gap-1.5 text-emerald-400 font-medium">
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Đã lưu lên Cloud</span>
                </span>
              ) : (
                <span
                  className="inline-flex items-center gap-1.5 text-amber-400 font-medium cursor-help"
                  title="Bảng meal_entries chưa có trên Supabase, dữ liệu đang tạm lưu ở máy này"
                >
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                  <span>Chỉ lưu trên máy</span>
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

      {/* CẢNH BÁO NẾU SUPABASE CHƯA TẠO BẢNG MEAL_ENTRIES */}
      {!loading && !isCloudSynced && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs print:hidden">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <span className="font-bold text-amber-400">
                Lưu ý: Bảng meal_entries chưa được khởi tạo trên Supabase Cloud!
              </span>
              <p className="text-muted-foreground leading-relaxed">
                Dữ liệu hiện tại chỉ lưu tạm trên bộ nhớ của trình duyệt này. Nếu bạn đổi máy tính khác hoặc xóa cache thì dữ liệu các tháng cũ sẽ không xem được. Hãy chạy câu lệnh SQL trên Supabase để lưu vĩnh viễn trên Cloud.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleCopySql}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 font-semibold border border-amber-500/30 transition-colors shrink-0"
          >
            <Copy className="w-3.5 h-3.5" />
            <span>Copy mã SQL</span>
          </button>
        </div>
      )}

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
        <div className="overflow-x-auto pb-4 print:p-0 print:m-0 print:overflow-visible">
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

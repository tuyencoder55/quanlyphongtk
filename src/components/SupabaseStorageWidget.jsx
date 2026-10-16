import React, { useState, useEffect } from 'react'
import { Database, HardDrive, Sparkles, RefreshCw } from 'lucide-react'
import { getSupabaseStorageStats } from '@/services/systemService'
import SupabaseStorageModal from './SupabaseStorageModal'

export default function SupabaseStorageWidget({ collapsed = false }) {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)

  const fetchStats = async () => {
    setLoading(true)
    try {
      const data = await getSupabaseStorageStats()
      setStats(data)
    } catch (err) {
      console.error('Lỗi khi lấy thông số dung lượng Supabase:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStats()
    // Tự động làm mới mỗi 10 phút một lần
    const timer = setInterval(fetchStats, 10 * 60 * 1000)
    return () => clearInterval(timer)
  }, [])

  const percentUsed = stats?.percentUsed || 0
  const sizePretty = stats?.sizePretty || (stats?.sizeMb ? `${stats.sizeMb} MB` : '18.5 MB')
  const maxMb = stats?.maxMb || 500

  // Màu sắc theo mức độ sử dụng
  let percentColor = 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20'
  let barGradient = 'from-blue-500 via-indigo-500 to-cyan-400'
  let iconGlow = 'text-cyan-400 shadow-cyan-500/20'

  if (percentUsed >= 85) {
    percentColor = 'text-rose-400 bg-rose-500/10 border-rose-500/20'
    barGradient = 'from-rose-500 to-red-500'
    iconGlow = 'text-rose-400 shadow-rose-500/20'
  } else if (percentUsed >= 70) {
    percentColor = 'text-amber-400 bg-amber-500/10 border-amber-500/20'
    barGradient = 'from-amber-500 to-orange-400'
    iconGlow = 'text-amber-400 shadow-amber-500/20'
  }

  // Khi sidebar bị thu nhỏ
  if (collapsed) {
    return (
      <>
        <div className="flex justify-center my-1 px-2">
          <button
            onClick={() => setModalOpen(true)}
            title={`Bộ nhớ Supabase: ${sizePretty} / ${maxMb} MB (${percentUsed}%). Bấm để xem chi tiết.`}
            className="w-12 h-12 rounded-xl bg-secondary/40 hover:bg-secondary/70 border border-border/70 hover:border-cyan-500/40 flex flex-col items-center justify-center gap-0.5 transition-all group"
          >
            <Database className={`w-4 h-4 transition-transform group-hover:scale-110 ${iconGlow}`} />
            <span className="text-[9px] font-bold text-slate-300 font-mono tracking-tighter">
              {percentUsed}%
            </span>
          </button>
        </div>

        <SupabaseStorageModal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          stats={stats}
          onRefresh={fetchStats}
          loading={loading}
        />
      </>
    )
  }

  // Khi sidebar mở rộng đầy đủ (đúng vị trí ô đỏ người dùng yêu cầu)
  return (
    <>
      <div className="px-3 py-2">
        <div
          onClick={() => setModalOpen(true)}
          role="button"
          tabIndex={0}
          title="Bấm để xem chi tiết dung lượng và danh sách bảng"
          className="group relative bg-secondary/35 hover:bg-secondary/60 border border-border/60 hover:border-cyan-500/30 rounded-xl p-2.5 transition-all duration-200 cursor-pointer shadow-sm"
        >
          {/* Hàng 1: Icon + Tên + Badge % */}
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shrink-0">
                <Database className="w-3.5 h-3.5" />
              </div>
              <span className="text-xs font-semibold text-foreground tracking-tight">
                Bộ Nhớ Supabase
              </span>
            </div>

            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border font-mono ${percentColor}`}>
              {percentUsed}%
            </span>
          </div>

          {/* Hàng 2: Thanh tiến trình */}
          <div className="w-full h-1.5 bg-slate-800/80 rounded-full overflow-hidden p-[1px] mb-2 border border-border/40">
            <div
              className={`h-full rounded-full bg-gradient-to-r ${barGradient} transition-all duration-700 ease-out`}
              style={{ width: `${Math.min(100, Math.max(1.5, percentUsed))}%` }}
            />
          </div>

          {/* Hàng 3: Chỉ số chi tiết */}
          <div className="flex items-center justify-between text-[11px] font-medium text-muted-foreground">
            <div className="flex items-baseline gap-1 font-mono">
              <span className="text-foreground font-semibold">
                {sizePretty}
              </span>
              <span>/ {maxMb} MB</span>
            </div>

            <span className="text-[10px] text-slate-400 group-hover:text-cyan-400 transition-colors">
              Gói Free
            </span>
          </div>
        </div>
      </div>

      <SupabaseStorageModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        stats={stats}
        onRefresh={fetchStats}
        loading={loading}
      />
    </>
  )
}

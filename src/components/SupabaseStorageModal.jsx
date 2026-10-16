import React, { useState } from 'react'
import { 
  Database, 
  X, 
  RefreshCw, 
  CheckCircle2, 
  AlertCircle, 
  Copy, 
  Check, 
  ExternalLink,
  Layers,
  HardDrive,
  Info,
  Table
} from 'lucide-react'
import toast from 'react-hot-toast'
import { SUPABASE_SQL_SCRIPT } from '@/services/systemService'

export default function SupabaseStorageModal({ 
  isOpen, 
  onClose, 
  stats, 
  onRefresh, 
  loading 
}) {
  const [copied, setCopied] = useState(false)
  const [showSql, setShowSql] = useState(false)

  if (!isOpen) return null

  const handleCopySql = async () => {
    try {
      await navigator.clipboard.writeText(SUPABASE_SQL_SCRIPT)
      setCopied(true)
      toast.success('Đã sao chép câu lệnh SQL vào bộ nhớ đệm!')
      setTimeout(() => setCopied(false), 2500)
    } catch (err) {
      toast.error('Không thể tự sao chép, bạn vui lòng copy thủ công')
    }
  }

  const percentUsed = stats?.percentUsed || 0
  const sizeMb = stats?.sizeMb || 0
  const maxMb = stats?.maxMb || 500
  const remainingMb = Math.max(0, Number((maxMb - sizeMb).toFixed(1)))
  const isRealRpc = stats?.isRealRpc

  // Xác định màu trạng thái
  let statusColor = 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
  let statusText = 'An toàn — Còn rất nhiều dung lượng'
  let barGradient = 'from-blue-500 via-indigo-500 to-cyan-400'

  if (percentUsed >= 85) {
    statusColor = 'text-rose-400 bg-rose-500/10 border-rose-500/20'
    statusText = 'Báo động — Sắp đầy giới hạn 500 MB'
    barGradient = 'from-rose-500 to-red-500'
  } else if (percentUsed >= 70) {
    statusColor = 'text-amber-400 bg-amber-500/10 border-amber-500/20'
    statusText = 'Lưu ý — Dung lượng đã trên 70%'
    barGradient = 'from-amber-500 to-orange-400'
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="w-full max-w-xl bg-card border border-border/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Modal */}
        <div className="px-6 py-4 border-b border-border/70 flex items-center justify-between bg-secondary/30">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shadow-sm">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-foreground flex items-center gap-2">
                Dung Lượng Bộ Nhớ Supabase
              </h3>
              <p className="text-xs text-muted-foreground">
                Theo dõi mức sử dụng dữ liệu PostgreSQL (Gói Free Tier: 500 MB)
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Nội dung chi tiết */}
        <div className="p-6 space-y-5 overflow-y-auto">
          {/* Card Tổng quan dung lượng */}
          <div className="bg-secondary/40 border border-border/60 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Mức Sử Dụng Hiện Tại
              </span>
              <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full border ${statusColor}`}>
                {statusText}
              </span>
            </div>

            {/* Thanh tiến trình to rõ ràng */}
            <div>
              <div className="flex items-baseline justify-between mb-1.5">
                <div className="flex items-baseline gap-1.5">
                  <span className="text-2xl font-extrabold text-foreground tracking-tight">
                    {stats?.sizePretty || `${sizeMb} MB`}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    / {maxMb} MB ({percentUsed}%)
                  </span>
                </div>
                <span className="text-xs font-medium text-slate-400">
                  Còn trống: <strong className="text-emerald-400 font-semibold">{remainingMb} MB</strong>
                </span>
              </div>

              <div className="w-full h-3 bg-slate-800/80 rounded-full overflow-hidden p-[2px] border border-border/40">
                <div 
                  className={`h-full rounded-full bg-gradient-to-r ${barGradient} transition-all duration-700 ease-out`}
                  style={{ width: `${Math.min(100, Math.max(1, percentUsed))}%` }}
                />
              </div>
            </div>

            {/* Trạng thái nguồn dữ liệu */}
            <div className="pt-2 border-t border-border/40 flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5">
                {isRealRpc ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span className="text-slate-300">
                      Chỉ số trực tiếp từ PostgreSQL Supabase
                    </span>
                  </>
                ) : (
                  <>
                    <Info className="w-4 h-4 text-cyan-400 shrink-0" />
                    <span className="text-slate-300">
                      Đang tính theo số lượng bản ghi thực tế ({stats?.totalRows || 0} dòng)
                    </span>
                  </>
                )}
              </div>

              <button
                onClick={onRefresh}
                disabled={loading}
                className="flex items-center gap-1 text-[11px] text-cyan-400 hover:text-cyan-300 transition-colors"
                title="Làm mới chỉ số"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                <span>{loading ? 'Đang cập nhật...' : 'Cập nhật lại'}</span>
              </button>
            </div>
          </div>

          {/* Danh sách các bảng dữ liệu */}
          {stats?.tableSizes && stats.tableSizes.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Table className="w-3.5 h-3.5" />
                  Dữ Liệu Trong Các Bảng
                </h4>
                <span className="text-[11px] text-muted-foreground">
                  {stats.tableSizes.length} bảng dữ liệu
                </span>
              </div>

              <div className="bg-secondary/20 border border-border/60 rounded-xl divide-y divide-border/40 overflow-hidden text-xs">
                {stats.tableSizes.map((t, idx) => (
                  <div key={idx} className="px-3.5 py-2.5 flex items-center justify-between hover:bg-secondary/40 transition-colors">
                    <div className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 shrink-0" />
                      <span className="font-mono font-medium text-foreground">
                        {t.table_name}
                      </span>
                      {t.note && (
                        <span className="text-[11px] text-muted-foreground hidden sm:inline">
                          ({t.note})
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-muted-foreground">
                        {t.row_count != null ? `${Number(t.row_count).toLocaleString()} dòng` : '--'}
                      </span>
                      {t.size_pretty && (
                        <span className="font-semibold text-cyan-400 font-mono text-[11px]">
                          {t.size_pretty}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Phần hướng dẫn cài đặt SQL nếu chưa kích hoạt RPC */}
          {!isRealRpc && (
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="p-1 rounded-lg bg-blue-500/20 text-blue-400">
                    <HardDrive className="w-4 h-4" />
                  </div>
                  <div>
                    <h5 className="text-xs font-bold text-foreground">
                      Kích hoạt đo chính xác 100% từ PostgreSQL
                    </h5>
                    <p className="text-[11px] text-muted-foreground">
                      Hiện tại hệ thống đang đếm số bản ghi để ước tính. Bạn có thể kích hoạt đo byte chính xác bằng 1 câu lệnh SQL.
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setShowSql(!showSql)}
                  className="text-xs font-medium text-blue-400 hover:text-blue-300 shrink-0 underline"
                >
                  {showSql ? 'Ẩn mã SQL' : 'Xem mã SQL'}
                </button>
              </div>

              {showSql && (
                <div className="space-y-2 pt-2 border-t border-blue-500/20 animate-in fade-in duration-200">
                  <div className="text-[11px] text-slate-300 space-y-1">
                    <p>1. Vào trang quản trị <strong>Supabase Dashboard</strong> dự án của bạn.</p>
                    <p>2. Chọn mục <strong>SQL Editor</strong> ở thanh menu trái rồi nhấn <strong>New query</strong>.</p>
                    <p>3. Dán đoạn mã dưới đây vào rồi bấm <strong>Run</strong>.</p>
                  </div>

                  <div className="relative">
                    <pre className="p-3 bg-slate-950/80 border border-slate-800 rounded-lg text-[10px] text-slate-300 font-mono overflow-x-auto max-h-36">
                      {SUPABASE_SQL_SCRIPT}
                    </pre>
                    <button
                      onClick={handleCopySql}
                      className="absolute top-2 right-2 px-2.5 py-1 rounded bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium flex items-center gap-1.5 shadow-md transition-colors"
                    >
                      {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copied ? 'Đã sao chép' : 'Sao chép SQL'}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-border/70 flex items-center justify-between bg-secondary/20">
          <span className="text-[11px] text-muted-foreground">
            Lần đo gần nhất: {stats?.updatedAt ? new Date(stats.updatedAt).toLocaleTimeString('vi-VN') : '--:--'}
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-secondary hover:bg-secondary/80 text-foreground text-xs font-medium transition-colors"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  )
}

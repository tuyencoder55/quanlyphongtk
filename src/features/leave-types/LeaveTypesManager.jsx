import React, { useState, useEffect } from 'react'
import { 
  Sparkles, 
  PlusCircle, 
  Edit, 
  Trash2, 
  CheckCircle2, 
  XCircle, 
  Loader2, 
  FileText,
  AlertCircle,
  HelpCircle
} from 'lucide-react'
import toast from 'react-hot-toast'
import { getLeaveTypes, deleteLeaveType } from './leaveTypeService'
import LeaveTypeModal from './LeaveTypeModal'

export default function LeaveTypesManager() {
  const [leaveTypes, setLeaveTypes] = useState([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [selectedLeaveType, setSelectedLeaveType] = useState(null)

  const loadData = async () => {
    setLoading(true)
    try {
      const data = await getLeaveTypes()
      setLeaveTypes(data)
    } catch (err) {
      toast.error('Lỗi tải danh mục phép: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleDelete = async (item) => {
    if (['PN', 'PT', 'KP'].includes(item.code)) {
      toast.error(`Mã "${item.code}" là mã mặc định hệ thống, không thể xoá!`)
      return
    }

    if (!window.confirm(`Bạn có chắc muốn xoá loại phép "${item.name}" (${item.code}) không?`)) {
      return
    }

    try {
      await deleteLeaveType(item.id, item.code)
      toast.success(`Đã xoá loại phép ${item.code}!`)
      loadData()
    } catch (err) {
      toast.error('Lỗi xoá phép: ' + err.message)
    }
  }

  return (
    <div className="space-y-4">
      {/* Thanh tiêu đề quản lý phép */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-card border border-border/70 p-4 rounded-xl shadow-sm">
        <div>
          <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
            <FileText className="w-4 h-4 text-primary" />
            <span>Danh Mục & Quy Tắc Tính Công Các Loại Phép</span>
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Cấu hình mã nghỉ hiển thị trên bảng chấm công, quy định loại phép nào được tính full 8h công (hưởng lương)
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setSelectedLeaveType(null)
              setModalOpen(true)
            }}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm shadow-primary/25 transition-all"
          >
            <PlusCircle className="w-4 h-4" />
            <span>+ Thêm Loại Phép Mới</span>
          </button>
        </div>
      </div>

      {/* Bảng Danh Sách Loại Phép */}
      <div className="bg-card border border-border/70 rounded-xl overflow-hidden shadow-sm">
        {loading ? (
          <div className="py-12 flex flex-col items-center justify-center gap-2 text-muted-foreground">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
            <span className="text-xs">Đang tải danh mục phép...</span>
          </div>
        ) : leaveTypes.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground text-xs">
            Chưa có loại phép nào. Bấm nút "+ Thêm Loại Phép Mới" để tạo.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-border/70 bg-secondary/40 text-muted-foreground font-semibold">
                  <th className="py-3 px-4 w-12 text-center">STT</th>
                  <th className="py-3 px-4 w-28 text-center">MÃ PHÉP</th>
                  <th className="py-3 px-5">TÊN LOẠI PHÉP</th>
                  <th className="py-3 px-5 w-60 text-center">QUY TẮC TÍNH CÔNG</th>
                  <th className="py-3 px-5">MÔ TẢ / GHI CHÚ</th>
                  <th className="py-3 px-4 w-28 text-center">THAO TÁC</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {leaveTypes.map((item, index) => {
                  const isDefault = ['PN', 'PT', 'KP'].includes(item.code)

                  return (
                    <tr key={item.id || item.code} className="hover:bg-secondary/30 transition-colors">
                      {/* STT */}
                      <td className="py-3 px-4 text-center text-muted-foreground font-medium">
                        {index + 1}
                      </td>

                      {/* Mã Phép (Badge hiển thị thực tế) */}
                      <td className="py-3 px-4 text-center">
                        <span
                          className="inline-flex items-center justify-center px-2.5 py-1 rounded text-xs font-bold text-white shadow-sm font-mono"
                          style={{ backgroundColor: item.color || '#f43f5e' }}
                        >
                          {item.code}
                        </span>
                      </td>

                      {/* Tên loại phép */}
                      <td className="py-3 px-5 font-semibold text-foreground text-sm">
                        {item.name}
                      </td>

                      {/* Quy tắc tính công */}
                      <td className="py-3 px-5 text-center">
                        {item.is_paid ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Tính full 8h công (Hưởng lương)</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium bg-secondary text-muted-foreground border border-border">
                            <XCircle className="w-3.5 h-3.5" />
                            <span>Không tính công (Nghỉ việc riêng)</span>
                          </span>
                        )}
                      </td>

                      {/* Ghi chú */}
                      <td className="py-3 px-5 text-muted-foreground text-xs">
                        {item.description || <span className="italic text-muted-foreground/50">—</span>}
                      </td>

                      {/* Thao tác */}
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => {
                              setSelectedLeaveType(item)
                              setModalOpen(true)
                            }}
                            title="Chỉnh sửa loại phép"
                            className="p-1.5 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                          >
                            <Edit className="w-4 h-4" />
                          </button>

                          {!isDefault && (
                            <button
                              onClick={() => handleDelete(item)}
                              title="Xoá loại phép này"
                              className="p-1.5 rounded-lg text-muted-foreground hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Thêm/Sửa Phép */}
      <LeaveTypeModal
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false)
          setSelectedLeaveType(null)
        }}
        leaveType={selectedLeaveType}
        onSuccess={loadData}
      />
    </div>
  )
}

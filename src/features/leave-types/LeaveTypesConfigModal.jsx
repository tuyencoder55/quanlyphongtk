import React from 'react'
import { X, SlidersHorizontal } from 'lucide-react'
import LeaveTypesManager from './LeaveTypesManager'

export default function LeaveTypesConfigModal({ isOpen, onClose }) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-md animate-in fade-in duration-150">
      <div className="bg-card border border-border/90 w-full max-w-4xl max-h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-150">
        {/* Header Modal */}
        <div className="p-4 sm:p-5 border-b border-border/80 flex items-center justify-between bg-secondary/30">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-primary/15 border border-primary/30 flex items-center justify-center text-primary">
              <SlidersHorizontal className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-foreground">
                Cấu Hình Danh Mục Loại Phép & Tính Công
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Thêm loại phép mới, quy định mã nào được tính 8h công hay nghỉ không lương
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-muted-foreground hover:text-foreground rounded-xl hover:bg-secondary transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Nội dung quản lý phép (cuộn bên trong) */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1">
          <LeaveTypesManager />
        </div>

        {/* Footer */}
        <div className="p-3.5 sm:px-6 border-t border-border/80 bg-secondary/20 flex items-center justify-between text-xs">
          <span className="text-muted-foreground">
            Các thay đổi sẽ được cập nhật ngay lập tức trên Biểu Chấm Công
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-xl text-xs transition-all shadow-sm"
          >
            Hoàn Tất & Đóng
          </button>
        </div>
      </div>
    </div>
  )
}

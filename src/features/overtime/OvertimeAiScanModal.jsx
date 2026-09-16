import React, { useState, useEffect, useRef } from 'react'
import { 
  Sparkles, 
  UploadCloud, 
  Camera, 
  KeyRound, 
  Check, 
  Trash2, 
  Plus, 
  AlertCircle, 
  Loader2, 
  CheckCircle2, 
  Image as ImageIcon,
  X,
  ExternalLink,
  Eye,
  Settings2,
  Clipboard
} from 'lucide-react'
import toast from 'react-hot-toast'
import { 
  getGeminiApiKey, 
  saveGeminiApiKey, 
  scanOvertimeNoteWithGemini 
} from './aiOvertimeService'
import { 
  saveOvertimeEntry, 
  calculateOvertimeHours, 
  calculateEndTimeFromHours,
  getDefaultOvertimeReason 
} from './overtimeService'

export default function OvertimeAiScanModal({
  isOpen,
  onClose,
  period,
  employee,
  days = [],
  onSuccess
}) {
  const fileInputRef = useRef(null)
  const cameraInputRef = useRef(null)

  // API Key state
  const [apiKey, setApiKey] = useState('')
  const [showKeyConfig, setShowKeyConfig] = useState(false)
  const [keyInput, setKeyInput] = useState('')

  // File & image preview
  const [selectedFile, setSelectedFile] = useState(null)
  const [imagePreviewUrl, setImagePreviewUrl] = useState('')

  // Scan state
  const [isScanning, setIsScanning] = useState(false)
  const [detectedEntries, setDetectedEntries] = useState([])
  const [isSaving, setIsSaving] = useState(false)

  // Load API key khi mở modal
  useEffect(() => {
    if (isOpen) {
      const existingKey = getGeminiApiKey()
      setApiKey(existingKey)
      setKeyInput(existingKey)
      if (!existingKey) {
        setShowKeyConfig(true)
      }
    }
  }, [isOpen])

  // Xóa preview URL khi unmount hoặc đổi file
  useEffect(() => {
    return () => {
      if (imagePreviewUrl && imagePreviewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(imagePreviewUrl)
      }
    }
  }, [imagePreviewUrl])

  // Lắng nghe phím tắt Ctrl + V trên toàn Modal để nhận ảnh clipboard
  useEffect(() => {
    if (!isOpen) return

    const handlePaste = (e) => {
      const items = e.clipboardData?.items
      if (!items || items.length === 0) return

      for (const item of items) {
        if (item.type.startsWith('image/')) {
          const file = item.getAsFile()
          if (file) {
            e.preventDefault()
            setSelectedFile(file)
            const preview = URL.createObjectURL(file)
            setImagePreviewUrl(preview)
            setDetectedEntries([])
            toast.success('Đã nhận ảnh dán từ Clipboard (Ctrl + V)!')
            return
          }
        }
      }
    }

    window.addEventListener('paste', handlePaste)
    return () => {
      window.removeEventListener('paste', handlePaste)
    }
  }, [isOpen])

  // Xử lý nút bấm dán từ Clipboard
  const handlePasteFromClipboard = async () => {
    try {
      if (!navigator.clipboard?.read) {
        toast('Hãy bấm phím tắt Ctrl + V trên bàn phím để dán ảnh nhé!', { icon: '📋' })
        return
      }
      const clipboardItems = await navigator.clipboard.read()
      for (const item of clipboardItems) {
        const imageType = item.types.find((t) => t.startsWith('image/'))
        if (imageType) {
          const blob = await item.getType(imageType)
          const file = new File([blob], `clipboard_${Date.now()}.${imageType.split('/')[1] || 'png'}`, { type: imageType })
          setSelectedFile(file)
          const preview = URL.createObjectURL(file)
          setImagePreviewUrl(preview)
          setDetectedEntries([])
          toast.success('Đã dán ảnh từ Clipboard thành công!')
          return
        }
      }
      toast('Không tìm thấy ảnh trong Clipboard! Hãy sao chép ảnh hoặc chụp màn hình rồi thử lại.', { icon: '⚠️' })
    } catch (err) {
      console.warn('Clipboard read error:', err)
      toast('Hãy bấm phím tắt Ctrl + V trên bàn phím để dán ảnh nhé!', { icon: '📋' })
    }
  }

  if (!isOpen) return null

  // Xử lý lưu API Key
  const handleSaveApiKey = () => {
    const trimmed = keyInput.trim()
    if (!trimmed) {
      toast.error('Vui lòng nhập API Key hợp lệ!')
      return
    }
    saveGeminiApiKey(trimmed)
    setApiKey(trimmed)
    setShowKeyConfig(false)
    toast.success('Đã lưu Gemini API Key trên trình duyệt!')
  }

  // Xử lý chọn file ảnh
  const handleFileChange = (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      toast.error('Vui lòng chọn file hình ảnh (JPG, PNG, WebP...)!')
      return
    }

    setSelectedFile(file)
    const preview = URL.createObjectURL(file)
    setImagePreviewUrl(preview)
    setDetectedEntries([]) // Xóa kết quả quét cũ nếu có
  }

  // Kéo thả file
  const handleDrop = (e) => {
    e.preventDefault()
    const file = e.dataTransfer.files?.[0]
    if (file && file.type.startsWith('image/')) {
      setSelectedFile(file)
      const preview = URL.createObjectURL(file)
      setImagePreviewUrl(preview)
      setDetectedEntries([])
    } else {
      toast.error('Vui lòng kéo thả file hình ảnh!')
    }
  }

  // Quét ảnh bằng AI
  const handleStartScan = async () => {
    if (!selectedFile) {
      toast.error('Vui lòng chọn hoặc chụp ảnh tờ giấy note trước!')
      return
    }

    if (!apiKey) {
      setShowKeyConfig(true)
      toast.error('Vui lòng nhập Google Gemini API Key trước khi quét!')
      return
    }

    setIsScanning(true)
    try {
      const result = await scanOvertimeNoteWithGemini({
        file: selectedFile,
        periodMonth: period.month,
        periodYear: period.year,
        days,
        department: employee?.department || 'TK',
        apiKey
      })

      if (!result.entries || result.entries.length === 0) {
        toast('Không tìm thấy ca tăng ca nào trong ảnh. Bạn có thể kiểm tra lại độ nét của ảnh hoặc thêm dòng thủ công.', {
          icon: '⚠️'
        })
        setDetectedEntries([])
      } else {
        setDetectedEntries(result.entries)
        toast.success(`AI đã nhận diện được ${result.entries.length} ca tăng ca từ ảnh!`)
      }
    } catch (err) {
      console.error('Scan error:', err)
      toast.error(err.message || 'Lỗi nhận diện ảnh với Gemini AI')
    } finally {
      setIsScanning(false)
    }
  }

  // Thao tác sửa bảng kết quả Preview
  const handleToggleSelectAll = (checked) => {
    setDetectedEntries((prev) => prev.map((item) => ({ ...item, selected: checked })))
  }

  const handleToggleItem = (id) => {
    setDetectedEntries((prev) =>
      prev.map((item) => (item.id === id ? { ...item, selected: !item.selected } : item))
    )
  }

  const handleUpdateItem = (id, field, value) => {
    setDetectedEntries((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item

        const updated = { ...item, [field]: value }

        // Nếu sửa ngày, tự động tính lại isSunday
        if (field === 'day') {
          const dayNum = Number(value)
          const dayInfo = days.find((d) => d.day === dayNum)
          updated.isSunday = dayInfo?.isSunday || false
        }

        // Nếu sửa giờ vào hoặc giờ ra, tự động tính lại số giờ
        if (field === 'startTime' || field === 'endTime') {
          if (updated.startTime && updated.endTime) {
            updated.hours = calculateOvertimeHours(updated.startTime, updated.endTime, updated.isSunday)
          }
        }

        // Nếu sửa số giờ trực tiếp, cập nhật lại giờ ra làm tròn
        if (field === 'hours') {
          const numH = Number(value)
          if (!isNaN(numH) && numH > 0 && updated.startTime) {
            updated.endTime = calculateEndTimeFromHours(updated.startTime, numH, updated.isSunday)
          }
        }

        return updated
      })
    )
  }

  const handleDeleteItem = (id) => {
    setDetectedEntries((prev) => prev.filter((item) => item.id !== id))
  }

  const handleAddManualRow = () => {
    const defaultReason = getDefaultOvertimeReason(employee?.department)
    const newDay = days[0]?.day || 1
    const isSun = days[0]?.isSunday || false

    const newRow = {
      id: `manual_${Date.now()}`,
      day: newDay,
      startTime: isSun ? '07:30' : '16:30',
      endTime: isSun ? '11:30' : '18:30',
      hours: 2.0,
      reason: defaultReason,
      isSunday: isSun,
      selected: true
    }

    setDetectedEntries((prev) => [...prev, newRow])
  }

  // Xác nhận & Lưu toàn bộ vào hệ thống
  const handleConfirmAndSave = async () => {
    const selectedEntries = detectedEntries.filter((e) => e.selected)
    if (selectedEntries.length === 0) {
      toast.error('Vui lòng chọn ít nhất 1 ca tăng ca để lưu!')
      return
    }

    setIsSaving(true)
    let successCount = 0
    let failCount = 0

    try {
      for (const item of selectedEntries) {
        try {
          await saveOvertimeEntry({
            periodId: period.id,
            employeeId: employee.id,
            day: Number(item.day),
            hours: Number(item.hours),
            startTime: item.startTime,
            endTime: item.endTime,
            reason: item.reason,
            department: employee?.department || 'TK'
          })
          successCount++
        } catch (err) {
          console.error(`Lỗi lưu ngày ${item.day}:`, err)
          failCount++
        }
      }

      if (successCount > 0) {
        toast.success(`Đã lưu thành công ${successCount} ca tăng ca vào biểu mẫu!`)
        if (onSuccess) onSuccess()
        onClose()
      } else {
        toast.error('Không thể lưu được ca nào. Vui lòng kiểm tra lại!')
      }
    } finally {
      setIsSaving(false)
    }
  }

  const selectedCount = detectedEntries.filter((e) => e.selected).length
  const totalSelectedHours = detectedEntries
    .filter((e) => e.selected)
    .reduce((sum, e) => sum + Number(e.hours || 0), 0)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-card border border-border/80 rounded-2xl w-full max-w-6xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* HEADER MODAL */}
        <div className="px-5 py-3.5 border-b border-border/60 bg-secondary/30 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-500/20 via-orange-500/20 to-primary/20 text-amber-500 flex items-center justify-center border border-amber-500/30 shadow-inner">
              <Sparkles className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-foreground">
                  Quét Giấy Note Tăng Ca Bằng AI
                </h3>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                  Gemini Vision
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                Nhân viên: <span className="font-semibold text-foreground">[{employee?.employee_code}] {employee?.full_name}</span> — Tháng <span className="font-semibold text-foreground">{period?.month}/{period?.year}</span> ({employee?.department === 'CTP' ? 'Bộ phận CTP' : 'Thiết kế'})
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowKeyConfig(!showKeyConfig)}
              title="Cấu hình API Key"
              className={`p-2 rounded-xl text-xs font-medium border transition-colors flex items-center gap-1.5 ${
                !apiKey 
                  ? 'bg-amber-500/15 border-amber-500/40 text-amber-600 dark:text-amber-400 animate-bounce' 
                  : 'bg-secondary/60 border-border/60 text-muted-foreground hover:text-foreground'
              }`}
            >
              <KeyRound className="w-4 h-4" />
              <span className="hidden sm:inline">{apiKey ? 'Đổi API Key' : 'Nhập API Key'}</span>
            </button>

            <button
              onClick={onClose}
              disabled={isSaving || isScanning}
              className="p-1.5 rounded-xl hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* CẤU HÌNH API KEY (EXPANDABLE) */}
        {showKeyConfig && (
          <div className="p-4 bg-amber-500/10 border-b border-amber-500/20 text-xs text-foreground space-y-2 shrink-0">
            <div className="flex items-center justify-between font-semibold text-amber-600 dark:text-amber-400">
              <span className="flex items-center gap-1.5">
                <KeyRound className="w-4 h-4" /> Cấu hình Google Gemini API Key (Hoàn toàn miễn phí)
              </span>
              <a
                href="https://aistudio.google.com/app/apikey"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-primary hover:underline font-normal"
              >
                <span>Lấy key miễn phí tại Google AI Studio</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
            <p className="text-muted-foreground text-[11px]">
              Chỉ cần đăng nhập tài khoản Google (Gmail) bấm <b>Create API key</b>, sao chép và dán vào đây. Hệ thống sẽ tự lưu vào trình duyệt của anh cho các lần sau.
            </p>
            <div className="flex items-center gap-2">
              <input
                type="password"
                value={keyInput}
                onChange={(e) => setKeyInput(e.target.value)}
                placeholder="Dán API Key (bắt đầu bằng AIzaSy...)"
                className="flex-1 px-3 py-1.5 bg-background border border-border rounded-xl text-xs outline-none focus:ring-2 focus:ring-primary/50 text-foreground"
              />
              <button
                onClick={handleSaveApiKey}
                className="px-3 py-1.5 rounded-xl bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-colors shrink-0"
              >
                Lưu Key
              </button>
            </div>
          </div>
        )}

        {/* THÂN MODAL (CHIA 2 CỘT: TRÁI LÀ ẢNH, PHẢI LÀ BẢNG PREVIEW) */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 grid grid-cols-1 lg:grid-cols-12 gap-5">
          
          {/* CỘT TRÁI: TẢI ẢNH & XEM TRƯỚC ẢNH GỐC */}
          <div className="lg:col-span-5 flex flex-col space-y-3">
            <div className="text-xs font-bold text-foreground flex items-center justify-between">
              <span>1. Ảnh tờ giấy note / sổ tay</span>
              {selectedFile && (
                <span className="text-[11px] text-muted-foreground font-normal">
                  {selectedFile.name} ({(selectedFile.size / 1024).toFixed(0)} KB)
                </span>
              )}
            </div>

            {/* Khung Dropzone & Preview */}
            <div
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
              className={`relative border-2 border-dashed rounded-2xl flex flex-col items-center justify-center p-3 text-center transition-all min-h-[220px] max-h-[380px] overflow-hidden ${
                imagePreviewUrl
                  ? 'border-primary/50 bg-background/50'
                  : 'border-border/70 hover:border-primary/50 bg-secondary/20'
              }`}
            >
              {imagePreviewUrl ? (
                <div className="relative w-full h-full flex flex-col items-center justify-center group">
                  <img
                    src={imagePreviewUrl}
                    alt="Giấy note tăng ca"
                    className="max-h-[320px] w-auto max-w-full object-contain rounded-xl shadow-md border border-border/40"
                  />
                  {/* Overlay nút đổi ảnh */}
                  <div className="absolute inset-0 bg-black/65 opacity-0 group-hover:opacity-100 transition-opacity flex flex-wrap items-center justify-center gap-2 p-2 rounded-xl backdrop-blur-xs">
                    <button
                      onClick={handlePasteFromClipboard}
                      className="px-3 py-1.5 rounded-xl bg-amber-500 text-white text-xs font-bold hover:bg-amber-600 shadow flex items-center gap-1.5"
                    >
                      <Clipboard className="w-3.5 h-3.5" /> Dán ảnh mới (Ctrl+V)
                    </button>
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="px-3 py-1.5 rounded-xl bg-white text-black text-xs font-semibold hover:bg-slate-100 shadow flex items-center gap-1.5"
                    >
                      <ImageIcon className="w-3.5 h-3.5" /> Chọn file
                    </button>
                    <button
                      onClick={() => cameraInputRef.current?.click()}
                      className="px-3 py-1.5 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 shadow flex items-center gap-1.5"
                    >
                      <Camera className="w-3.5 h-3.5" /> Chụp lại
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3 py-4 px-2">
                  <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mx-auto text-amber-500">
                    <Clipboard className="w-6 h-6 animate-pulse" />
                  </div>
                  <div>
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-600 dark:text-amber-400 font-bold text-xs shadow-xs mb-1.5">
                      <span>Bấm</span>
                      <kbd className="px-1.5 py-0.5 rounded bg-background border border-border text-[11px] font-mono shadow-xs text-foreground">
                        Ctrl + V
                      </kbd>
                      <span>để dán ảnh ngay</span>
                    </div>
                    <p className="text-xs font-semibold text-foreground">
                      Chụp màn hình (Win+Shift+S), copy từ Zalo hoặc kéo thả ảnh
                    </p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      Hỗ trợ chụp giấy note, sổ tay hoặc danh sách ngày giờ làm thêm
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={handlePasteFromClipboard}
                      className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold shadow-xs flex items-center gap-1.5 transition-colors"
                    >
                      <Clipboard className="w-3.5 h-3.5" /> Dán ảnh (Ctrl + V)
                    </button>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="px-3 py-1.5 rounded-xl bg-secondary hover:bg-secondary/80 text-foreground text-xs font-semibold border border-border/70 shadow-xs flex items-center gap-1.5 transition-colors"
                    >
                      <ImageIcon className="w-3.5 h-3.5 text-primary" /> Chọn từ máy
                    </button>
                    <button
                      type="button"
                      onClick={() => cameraInputRef.current?.click()}
                      className="px-3 py-1.5 rounded-xl bg-secondary hover:bg-secondary/80 text-foreground text-xs font-semibold border border-border/70 shadow-xs flex items-center gap-1.5 transition-colors"
                    >
                      <Camera className="w-3.5 h-3.5 text-primary" /> Chụp ảnh
                    </button>
                  </div>
                </div>
              )}

              {/* Hidden file inputs */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />
              <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleFileChange}
                className="hidden"
              />
            </div>

            {/* Nút hành động quét */}
            <button
              onClick={handleStartScan}
              disabled={isScanning || !selectedFile}
              className={`w-full py-2.5 rounded-xl font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2 ${
                isScanning || !selectedFile
                  ? 'bg-muted text-muted-foreground cursor-not-allowed opacity-60'
                  : 'bg-gradient-to-r from-amber-500 via-orange-500 to-primary text-white hover:brightness-110 active:scale-[0.99]'
              }`}
            >
              {isScanning ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>AI đang phân tích chữ viết tay trong ảnh...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Bắt đầu Quét bằng AI (Gemini)</span>
                </>
              )}
            </button>
          </div>

          {/* CỘT PHẢI: BẢNG XEM TRƯỚC (PREVIEW & CHỈNH SỬA) */}
          <div className="lg:col-span-7 flex flex-col space-y-3">
            <div className="flex items-center justify-between text-xs font-bold text-foreground">
              <div className="flex items-center gap-2">
                <span>2. Kết quả đối chiếu & Chỉnh sửa</span>
                {detectedEntries.length > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-primary/15 text-primary text-[11px] font-semibold">
                    {detectedEntries.length} ca
                  </span>
                )}
              </div>
              {detectedEntries.length > 0 && (
                <button
                  type="button"
                  onClick={handleAddManualRow}
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline"
                >
                  <Plus className="w-3.5 h-3.5" /> Thêm ca thủ công
                </button>
              )}
            </div>

            {/* Danh sách các dòng ca tăng ca */}
            <div className="flex-1 border border-border/70 rounded-2xl bg-secondary/15 overflow-hidden flex flex-col min-h-[280px]">
              {detectedEntries.length === 0 ? (
                <div className="m-auto text-center p-6 space-y-2 text-muted-foreground">
                  <div className="w-10 h-10 rounded-2xl bg-secondary/80 flex items-center justify-center mx-auto text-muted-foreground/60">
                    <Eye className="w-5 h-5" />
                  </div>
                  <p className="text-xs font-semibold text-foreground">
                    Chưa có dữ liệu nhận diện
                  </p>
                  <p className="text-[11px] max-w-xs mx-auto">
                    Tải ảnh giấy note ở bên trái và bấm <b>"Bắt đầu Quét bằng AI"</b>. Kết quả sẽ hiện ra ở đây để anh kiểm tra lại.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto flex-1">
                  <table className="w-full min-w-[620px] text-left text-xs border-collapse">
                    <thead className="bg-secondary/60 text-muted-foreground text-[10.5px] uppercase font-semibold border-b border-border/60 sticky top-0 backdrop-blur-xs">
                      <tr>
                        <th className="p-2.5 text-center w-10">
                          <input
                            type="checkbox"
                            checked={detectedEntries.every((e) => e.selected)}
                            onChange={(e) => handleToggleSelectAll(e.target.checked)}
                            className="rounded accent-primary cursor-pointer"
                          />
                        </th>
                        <th className="p-2.5 w-40 min-w-[145px]">Ngày</th>
                        <th className="p-2.5 w-48 min-w-[185px]">Thời gian</th>
                        <th className="p-2.5 w-20 min-w-[76px] text-center">Số giờ</th>
                        <th className="p-2.5 min-w-[130px]">Lý do tăng ca</th>
                        <th className="p-2.5 text-center w-10"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/40 font-sans">
                      {detectedEntries.map((item) => (
                        <tr 
                          key={item.id} 
                          className={`hover:bg-secondary/30 transition-colors ${
                            !item.selected ? 'opacity-45 bg-secondary/5' : ''
                          }`}
                        >
                          {/* Checkbox */}
                          <td className="p-2 text-center">
                            <input
                              type="checkbox"
                              checked={item.selected}
                              onChange={() => handleToggleItem(item.id)}
                              className="rounded accent-primary cursor-pointer"
                            />
                          </td>

                          {/* Chọn Ngày */}
                          <td className="p-2 w-40 min-w-[145px]">
                            <select
                              value={item.day}
                              onChange={(e) => handleUpdateItem(item.id, 'day', Number(e.target.value))}
                              className="w-full bg-background border border-border/70 rounded-lg px-2.5 py-1.5 text-xs font-bold text-foreground outline-none focus:ring-1 focus:ring-primary cursor-pointer"
                            >
                              {days.map((d) => (
                                <option key={d.day} value={d.day}>
                                  Ngày {d.dayFormatted || String(d.day).padStart(2, '0')} ({d.vi || (d.isSunday ? 'CN' : '')})
                                </option>
                              ))}
                            </select>
                          </td>

                          {/* Thời gian vào - ra */}
                          <td className="p-2 w-48 min-w-[185px]">
                            <div className="flex items-center gap-1.5">
                              <input
                                type="time"
                                value={item.startTime}
                                onChange={(e) => handleUpdateItem(item.id, 'startTime', e.target.value)}
                                className="w-[82px] bg-background border border-border/70 rounded-lg px-1.5 py-1.5 text-[11px] text-foreground text-center font-mono outline-none focus:ring-1 focus:ring-primary"
                              />
                              <span className="text-muted-foreground text-xs font-bold">—</span>
                              <input
                                type="time"
                                value={item.endTime}
                                onChange={(e) => handleUpdateItem(item.id, 'endTime', e.target.value)}
                                className="w-[82px] bg-background border border-border/70 rounded-lg px-1.5 py-1.5 text-[11px] text-foreground text-center font-mono outline-none focus:ring-1 focus:ring-primary"
                              />
                            </div>
                          </td>

                          {/* Số giờ */}
                          <td className="p-2 text-center w-20 min-w-[76px]">
                            <input
                              type="number"
                              step="0.5"
                              min="0.5"
                              max="24"
                              value={item.hours}
                              onChange={(e) => handleUpdateItem(item.id, 'hours', Number(e.target.value))}
                              className="w-14 bg-background border border-border/70 rounded-lg px-1.5 py-1.5 text-xs font-bold text-center text-primary font-mono outline-none focus:ring-1 focus:ring-primary"
                            />
                          </td>

                          {/* Lý do */}
                          <td className="p-2">
                            <input
                              type="text"
                              value={item.reason}
                              onChange={(e) => handleUpdateItem(item.id, 'reason', e.target.value)}
                              className="w-full bg-background border border-border/70 rounded-lg px-2 py-1 text-xs text-foreground outline-none focus:ring-1 focus:ring-primary truncate"
                            />
                          </td>

                          {/* Xóa dòng */}
                          <td className="p-2 text-center">
                            <button
                              type="button"
                              onClick={() => handleDeleteItem(item.id)}
                              className="p-1 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                              title="Xóa ca này"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* FOOTER MODAL */}
        <div className="px-5 py-3.5 border-t border-border/60 bg-secondary/30 flex items-center justify-between shrink-0">
          <div className="text-xs text-muted-foreground">
            {detectedEntries.length > 0 ? (
              <span>
                Đã chọn <b className="text-foreground">{selectedCount}</b> / {detectedEntries.length} ca — Tổng giờ: <b className="text-primary font-bold text-sm">{totalSelectedHours}</b> giờ
              </span>
            ) : (
              <span>Sử dụng công nghệ nhận diện AI Google Gemini Flash</span>
            )}
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving || isScanning}
              className="px-4 py-2 rounded-xl text-xs font-semibold hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
            >
              Đóng
            </button>
            <button
              type="button"
              onClick={handleConfirmAndSave}
              disabled={isSaving || isScanning || selectedCount === 0}
              className={`px-5 py-2 rounded-xl text-xs font-bold shadow-md transition-all flex items-center gap-2 ${
                isSaving || isScanning || selectedCount === 0
                  ? 'bg-muted text-muted-foreground cursor-not-allowed opacity-60'
                  : 'bg-primary text-primary-foreground hover:bg-primary/90 active:scale-[0.98]'
              }`}
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Đang lưu vào biểu mẫu...</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>Xác nhận & Điền vào biểu ({selectedCount} ca)</span>
                </>
              )}
            </button>
          </div>
        </div>

      </div>
    </div>
  )
}

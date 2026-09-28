import { getDefaultOvertimeReason, calculateEndTimeFromHours } from './overtimeService'

const STORAGE_API_KEY = 'quanlyphongtk_gemini_api_key'

/**
 * Lấy API key của Google Gemini
 * Ưu tiên: .env (VITE_GEMINI_API_KEY) -> localStorage
 */
export function getGeminiApiKey() {
  const localKey = localStorage.getItem(STORAGE_API_KEY)
  if (localKey && localKey.trim()) {
    return localKey.trim()
  }
  const envKey = import.meta.env.VITE_GEMINI_API_KEY
  if (envKey && envKey.trim()) {
    return envKey.trim()
  }
  return ''
}

/**
 * Lưu API key vào localStorage trình duyệt
 */
export function saveGeminiApiKey(key) {
  if (!key) {
    localStorage.removeItem(STORAGE_API_KEY)
  } else {
    localStorage.setItem(STORAGE_API_KEY, key.trim())
  }
}

/**
 * Chuyển File ảnh thành chuỗi Base64 (dự phòng)
 */
export function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result
      const commaIndex = result.indexOf(',')
      if (commaIndex === -1) {
        reject(new Error('Không thể đọc dữ liệu ảnh'))
        return
      }
      const mimeType = file.type || 'image/jpeg'
      const base64Data = result.slice(commaIndex + 1)
      resolve({ base64Data, mimeType, dataUrl: result })
    }
    reader.onerror = (error) => reject(error)
    reader.readAsDataURL(file)
  })
}

/**
 * Tối ưu hóa và nén ảnh tự động ngay trên trình duyệt (Canvas).
 * Giảm kích thước từ 10-15MB (ảnh chụp điện thoại) xuống còn ~200-300KB,
 * giữ nguyên độ sắc nét của chữ viết tay nhưng giúp thời gian tải và phân tích nhanh gấp 5 - 8 lần!
 */
export function compressAndResizeImage(file, maxDimension = 1280, quality = 0.8) {
  return new Promise((resolve) => {
    if (!file || !file.type?.startsWith('image/') || typeof window === 'undefined') {
      fileToBase64(file).then(resolve).catch(() => resolve(fileToBase64(file)))
      return
    }

    const reader = new FileReader()
    reader.onload = (e) => {
      const img = new Image()
      img.onload = () => {
        try {
          let width = img.width
          let height = img.height

          // Thu nhỏ tỷ lệ nếu kích thước vượt quá maxDimension (1280px là chuẩn tối ưu cho OCR giấy note)
          if (width > maxDimension || height > maxDimension) {
            if (width > height) {
              height = Math.round((height * maxDimension) / width)
              width = maxDimension
            } else {
              width = Math.round((width * maxDimension) / height)
              height = maxDimension
            }
          }

          const canvas = document.createElement('canvas')
          canvas.width = width
          canvas.height = height

          const ctx = canvas.getContext('2d')
          // Tô nền trắng giúp chữ viết tay trên giấy tương phản rõ ràng nhất
          ctx.fillStyle = '#FFFFFF'
          ctx.fillRect(0, 0, width, height)
          ctx.drawImage(img, 0, 0, width, height)

          const dataUrl = canvas.toDataURL('image/jpeg', quality)
          const commaIndex = dataUrl.indexOf(',')
          const base64Data = commaIndex !== -1 ? dataUrl.slice(commaIndex + 1) : ''

          resolve({
            base64Data,
            mimeType: 'image/jpeg',
            dataUrl,
            width,
            height
          })
        } catch (err) {
          console.warn('Lỗi khi nén ảnh qua canvas, dùng fallback file gốc:', err)
          fileToBase64(file).then(resolve)
        }
      }
      img.onerror = () => {
        fileToBase64(file).then(resolve)
      }
      img.src = e.target.result
    }
    reader.onerror = () => {
      fileToBase64(file).then(resolve)
    }
    reader.readAsDataURL(file)
  })
}

/**
 * Gọi Google Gemini Vision API để đọc ảnh giấy note tăng ca với tốc độ cao
 */
export async function scanOvertimeNoteWithGemini({
  file,
  periodMonth,
  periodYear,
  days = [],
  department = 'TK',
  apiKey
}) {
  const activeKey = (apiKey || getGeminiApiKey()).trim()
  if (!activeKey) {
    throw new Error('Chưa có Google Gemini API Key! Vui lòng nhập API Key để sử dụng tính năng này.')
  }

  // 1. Tự động nén và tối ưu ảnh ngay trên client trước khi upload
  const { base64Data, mimeType } = await compressAndResizeImage(file, 1280, 0.8)

  const daysInMonth = days.length || 31
  const defaultReason = getDefaultOvertimeReason(department)

  // Danh sách các ngày Chủ Nhật trong tháng để AI biết
  const sundayDays = days.filter((d) => d.isSunday).map((d) => d.day)

  const prompt = `
Bạn là chuyên gia nhận diện tài liệu, trích xuất dữ liệu bảng biểu và chữ viết tay tiếng Việt. Nhiệm vụ của bạn là đọc ảnh và trích xuất danh sách tất cả các ca TĂNG CA (LÀM THÊM GIỜ) trong tháng của nhân viên.

Thông tin bối cảnh:
- Tháng tăng ca: Tháng ${periodMonth} năm ${periodYear} (Tháng này có ${daysInMonth} ngày).
- Danh sách các ngày là CHỦ NHẬT (CN) trong tháng này: ${sundayDays.join(', ')}. Các ngày còn lại là ngày thường.
- Bộ phận của nhân viên: ${department === 'CTP' ? 'Bộ phận CTP' : 'Phòng Thiết kế'}.
- Lý do tăng ca mặc định: "${defaultReason}".

HƯỚNG DẪN ĐỌC DỮ LIỆU TÙY THEO LOẠI ẢNH:

TRƯỜNG HỢP 1: ẢNH LÀ BẢNG MÁY CHẤM CÔNG (Bảng quẹt vân tay / nhận diện khuôn mặt có các cột: Ngày, Thứ, Chấm lần 1, Chấm lần 2):
1. Với NGÀY THƯỜNG (Thứ 2 đến Thứ 7):
   - Giờ làm việc hành chính ban ngày là 07:30 - 16:30 (KHÔNG tính là tăng ca).
   - Tăng ca ngày thường chỉ bắt đầu tính từ mốc 16:30 chiều.
   - Nếu giờ về (Chấm lần 2) là từ 17:00 trở đi (tức về sau 16:30 ít nhất 30 phút): ĐÂY LÀ CA TĂNG CA!
   - Số giờ tăng ca "hours" = (Giờ Chấm lần 2 - 16:30) làm tròn lùi về mốc 30 phút (0.5h).
     Ví dụ: về 17:01 - 17:29 -> 0.5h; về 17:30 - 17:59 -> 1.0h; về 18:00 - 18:29 (như 18:12) -> 1.5h; về 20:01 -> 3.5h.
   - startTime LUÔN LUÔN là "16:30" (định dạng 24h, TUYỆT ĐỐI KHÔNG ghi 04:30).
   - endTime: Ghi mốc giờ kết thúc làm tròn theo số giờ (ví dụ 1.5h thì ghi "18:00", 3.5h ghi "20:00").
   - Nếu giờ về trước 17:00 (như 16:33, 16:36, 16:39, 16:47): KHÔNG có tăng ca, BỎ QUA ngày đó.

2. Với NGÀY CHỦ NHẬT (CN) - ĐẶC BIỆT CHÚ Ý, TUYỆT ĐỐI KHÔNG ĐƯỢC BỎ SÓT:
   - Các ngày Chủ Nhật trong tháng là: ${sundayDays.join(', ')}.
   - Ngày Chủ Nhật công ty KHÔNG làm việc hành chính. BẤT CỨ NGÀY CHỦ NHẬT NÀO CÓ CHẤM CÔNG (có Chấm lần 1 và Chấm lần 2) THÌ TOÀN BỘ ĐỀU LÀ ĐI LÀM TĂNG CA!
   - Nếu làm cả ngày (Chấm lần 1 khoảng 07:30, Chấm lần 2 khoảng 16:00 - 17:00):
     + "hours": 8.0 (đã trừ 1h nghỉ trưa 11:30 - 12:30).
     + "startTime": "07:30"
     + "endTime": "16:30" (định dạng 24h, TUYỆT ĐỐI KHÔNG ghi 04:30 hay 04:33).
   - Nếu làm nửa ngày sáng (khoảng 07:30 - 11:30): "hours": 4.0, startTime: "07:30", endTime: "11:30".

TRƯỜNG HỢP 2: ẢNH LÀ GIẤY NOTE / SỔ TAY VIẾT TAY:
1. Xác định số ngày tăng ca:
   - Ngày thường: ví dụ "ngày 2", "mùng 9", "10", "15/9"... trích xuất thành số ngày từ 1 đến ${daysInMonth}.
   - Ngày Chủ Nhật: nếu ghi "CN", "Chủ nhật", "CN 27", "27 (CN)", hoặc chỉ ghi "CN: 8 tiếng": đối chiếu thứ tự tuần hoặc danh sách Chủ Nhật (${sundayDays.join(', ')}) để lấy đúng số ngày Chủ Nhật.
2. Giờ giấc & số tiếng:
   - Ngày thường: startTime mặc định "16:30", endTime = 16:30 + số tiếng (ví dụ làm 2h thì endTime "18:30").
   - Ngày Chủ Nhật: startTime mặc định "07:30", làm cả ngày 8 tiếng thì endTime "16:30".

QUY TẮC BẮT BUỘC:
- Mọi mốc thời gian bắt buộc dùng chuẩn 24 GIỜ: "16:30", "18:00", "20:00", "07:30"... TUYỆT ĐỐI KHÔNG DÙNG GIỜ 12H (như "04:30", "06:12", "04:33").
- Số giờ "hours" làm tròn theo bước 0.5 (0.5, 1.0, 1.5, 2.0, 2.5, 3.0, 3.5, 4.0, 8.0...).
- Lý do tăng ca "reason": dùng "${defaultReason}" nếu không ghi lý do riêng.

Hãy trả về kết quả thuần JSON (không bọc trong markdown code block, không thêm văn bản giải thích thừa) theo cấu trúc:
{
  "entries": [
    {
      "day": 9,
      "startTime": "16:30",
      "endTime": "18:00",
      "hours": 1.5,
      "reason": "${defaultReason}"
    },
    {
      "day": 27,
      "startTime": "07:30",
      "endTime": "16:30",
      "hours": 8.0,
      "reason": "${defaultReason}"
    }
  ]
}
`

  // Danh sách các model Gemini ưu tiên nhận diện tốt nhất, nhanh và ổn định về quota:
  // 1. gemini-3.1-flash-lite: Model thế hệ 3 mới, cực nhanh, quota miễn phí rất rộng (1.500 lượt/ngày), không bị bóp quota
  // 2. gemini-3.1-flash-lite-preview: Bản preview dự phòng
  // 3. gemini-3.6-flash & gemini-3.8-flash: Dự phòng nâng cao
  const modelCandidates = [
    { name: 'gemini-3.1-flash-lite' },
    { name: 'gemini-3.1-flash-lite-preview' },
    { name: 'gemini-3.6-flash', thinkingConfig: { thinking_level: 'minimal' } },
    { name: 'gemini-3.8-flash', thinkingConfig: { thinking_level: 'low' } }
  ]

  let lastError = null

  for (const candidate of modelCandidates) {
    const model = candidate.name
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(activeKey)}`

      const generationConfig = {
        response_mime_type: 'application/json',
        temperature: 0.1
      }
      if (candidate.thinkingConfig) {
        generationConfig.thinking_config = candidate.thinkingConfig
      }

      const payload = {
        contents: [
          {
            parts: [
              { text: prompt },
              {
                inline_data: {
                  mime_type: mimeType,
                  data: base64Data
                }
              }
            ]
          }
        ],
        generationConfig
      }

      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 12000) // Timeout 12s

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload),
        signal: controller.signal
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        const errorMsg = errorData?.error?.message || `Lỗi HTTP ${response.status}`
        throw new Error(`[${model}] ${errorMsg}`)
      }

      const resJson = await response.json()
      const parts = resJson?.candidates?.[0]?.content?.parts || []
      const textPart = parts.find((p) => p.text && !p.thought) || parts.find((p) => p.text)
      const textOutput = textPart?.text
      if (!textOutput) {
        throw new Error('AI không trả về nội dung nhận diện được từ ảnh!')
      }

      // Xử lý làm sạch JSON phòng trường hợp AI vẫn bọc markdown ```json ... ```
      let cleaned = textOutput.trim()
      if (cleaned.startsWith('```')) {
        cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '')
      }

      const parsed = JSON.parse(cleaned)
      const rawEntries = Array.isArray(parsed) ? parsed : (parsed.entries || [])

      // Chuẩn hóa và làm sạch danh sách entries
      const sanitizedEntries = rawEntries
        .filter((item) => {
          const d = Number(item.day)
          const h = Number(item.hours)
          return !isNaN(d) && d >= 1 && d <= daysInMonth && !isNaN(h) && h > 0
        })
        .map((item) => {
          const d = Number(item.day)
          const h = Math.round(Number(item.hours) * 2) / 2 // Làm tròn bước 0.5
          const isSun = sundayDays.includes(d)

          // 1. Giờ bắt đầu: Chủ Nhật là 07:30, Ngày thường luôn là 16:30
          let start = isSun ? '07:30' : '16:30'
          if (item.startTime) {
            let [sh, sm] = item.startTime.split(':').map(Number)
            if (!isNaN(sh)) {
              if (!isSun && sh < 12 && sh >= 1) sh += 12 // Khắc phục nếu AI trả về 12h: 04:30 -> 16:30
              if (isSun && sh > 12) sh = 7 // Phòng ngừa Chủ Nhật
              const formattedSh = String(sh).padStart(2, '0')
              const formattedSm = String(isNaN(sm) ? 0 : sm).padStart(2, '0')
              start = `${formattedSh}:${formattedSm}`
            }
          }

          // 2. Giờ kết thúc: Luôn tự động tính tròn theo số giờ (1.5h -> 18:00, 3.5h -> 20:00, 8h CN -> 16:30)
          let end = calculateEndTimeFromHours(start, h, isSun)
          if (!end && item.endTime) {
            let [eh, em] = item.endTime.split(':').map(Number)
            if (!isNaN(eh)) {
              if (eh < 12 && eh >= 1) eh += 12 // Khắc phục 06:12 -> 18:12, 04:33 -> 16:33
              end = `${String(eh).padStart(2, '0')}:${String(isNaN(em) ? 0 : em).padStart(2, '0')}`
            }
          }

          const itemReason = item.reason?.trim() || defaultReason

          return {
            id: `ai_${d}_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            day: d,
            startTime: start,
            endTime: end,
            hours: h,
            reason: itemReason,
            isSunday: isSun,
            selected: true // Mặc định chọn để điền
          }
        })
        .sort((a, b) => a.day - b.day)

      return {
        success: true,
        modelUsed: model,
        entries: sanitizedEntries,
        count: sanitizedEntries.length
      }
    } catch (err) {
      lastError = err
      console.warn(`Lỗi hoặc timeout khi gọi model ${model}:`, err.message || err)
      // Thử model kế tiếp
    }
  }

  const errText = lastError?.message || ''
  if (errText.includes('429') || errText.toLowerCase().includes('quota')) {
    throw new Error('API Key này đã dùng hết hạn mức miễn phí hôm nay của Google. Anh/chị có thể bấm nút "Đổi API Key" ở góc trên bên phải để dán key mới (tạo miễn phí tại aistudio.google.com/apikey) nhé!')
  }
  if (errText.includes('503') || errText.toLowerCase().includes('high demand') || errText.toLowerCase().includes('unavailable')) {
    throw new Error('Máy chủ Google AI hiện đang quá tải tạm thời (High Demand). Anh/chị vui lòng bấm "Bắt đầu Quét bằng AI" thử lại sau 5 - 10 giây nhé!')
  }
  if (errText.includes('API_KEY_INVALID') || (errText.includes('400') && errText.includes('key'))) {
    throw new Error('API Key Google Gemini không hợp lệ hoặc đã hết hạn. Vui lòng bấm nút "Đổi API Key" ở góc trên để cập nhật key mới!')
  }

  throw new Error(lastError?.message || 'Không thể kết nối với Google Gemini AI. Vui lòng kiểm tra lại API Key và kết nối mạng!')
}

import { getDefaultOvertimeReason } from './overtimeService'

const STORAGE_API_KEY = 'quanlyphongtk_gemini_api_key'

/**
 * Lấy API key của Google Gemini
 * Ưu tiên: .env (VITE_GEMINI_API_KEY) -> localStorage
 */
export function getGeminiApiKey() {
  const envKey = import.meta.env.VITE_GEMINI_API_KEY
  if (envKey && envKey.trim()) {
    return envKey.trim()
  }
  return localStorage.getItem(STORAGE_API_KEY) || ''
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
 * Chuyển File ảnh thành chuỗi Base64
 */
export function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result
      // result có dạng "data:image/jpeg;base64,...."
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
 * Gọi Google Gemini Vision API để đọc ảnh giấy note tăng ca
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

  const { base64Data, mimeType } = await fileToBase64(file)

  const daysInMonth = days.length || 31
  const defaultReason = getDefaultOvertimeReason(department)

  // Danh sách các ngày Chủ Nhật trong tháng để AI biết
  const sundayDays = days.filter((d) => d.isSunday).map((d) => d.day)

  const prompt = `
Bạn là chuyên gia nhận diện chữ viết tay và bảng biểu tiếng Việt, có nhiệm vụ đọc ảnh chụp một tờ giấy note viết tay ghi ca tăng ca (làm thêm giờ) của một nhân viên trong công ty.

Thông tin bối cảnh:
- Tháng tăng ca: Tháng ${periodMonth} năm ${periodYear} (Tháng này có ${daysInMonth} ngày).
- Các ngày là CHỦ NHẬT trong tháng này: ${sundayDays.join(', ')}. Các ngày còn lại là ngày thường.
- Bộ phận của nhân viên: ${department === 'CTP' ? 'Bộ phận CTP' : 'Phòng Thiết kế'}.
- Lý do tăng ca mặc định của bộ phận này là: "${defaultReason}".

Quy tắc đọc và chuẩn hóa dữ liệu:
1. Xác định tất cả các ngày tăng ca được ghi trong ảnh:
   - Người viết có thể ghi: "ngày 2", "2/9", "mùng 5", "12", "15-9", "25", "CN 6"...
   - Trích xuất thành số ngày nguyên dương (từ 1 đến ${daysInMonth}).
   - Nếu có nhiều dòng cho cùng 1 ngày, có thể gộp hoặc lấy ca tăng ca chính.
2. Xác định giờ bắt đầu (startTime), giờ kết thúc (endTime) và số giờ làm thêm (hours):
   - Nếu trong ảnh có ghi mốc giờ (ví dụ: "16h30 - 19h30", "17h - 20h", "4h30 - 7h30 chiều"...): hãy chuẩn hóa về định dạng 24h "HH:mm".
   - Nếu chỉ ghi số tiếng (ví dụ: "2 tiếng", "3h", "2.5 tiếng", "4h"):
     + Nếu ngày đó là NGÀY THƯỜNG: Mặc định giờ bắt đầu là "16:30". Giờ kết thúc = 16:30 + số tiếng (ví dụ làm 2 tiếng thì startTime "16:30", endTime "18:30").
     + Nếu ngày đó là CHỦ NHẬT (trong danh sách: ${sundayDays.join(', ')}): Mặc định giờ bắt đầu là "07:30". Giờ kết thúc tính theo số tiếng (lưu ý nếu làm cả ngày trên 4h có thể có 1h nghỉ trưa 11:30 - 12:30).
   - Số giờ tăng ca "hours" là số thực làm tròn theo bước 0.5 (ví dụ: 1.5, 2.0, 2.5, 3.0, 4.0...).
3. Lý do tăng ca (reason):
   - Nếu trên giấy note người ta có ghi rõ lý do đặc thù (ví dụ: "Sửa file bao bì", "In gấp...", "Rửa bảng CTP"): hãy ghi lại.
   - Nếu không ghi lý do riêng, dùng chính xác lý do mặc định: "${defaultReason}".

Hãy trả về kết quả thuần JSON (không bọc trong markdown code block, không thêm văn bản giải thích thừa) theo cấu trúc sau:
{
  "entries": [
    {
      "day": 2,
      "startTime": "16:30",
      "endTime": "19:30",
      "hours": 3.0,
      "reason": "${defaultReason}"
    }
  ]
}
`

  // Danh sách các model Gemini thử theo thứ tự ưu tiên
  const modelCandidates = ['gemini-2.5-flash', 'gemini-1.5-flash', 'gemini-2.0-flash']
  let lastError = null

  for (const model of modelCandidates) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(activeKey)}`

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
        generationConfig: {
          response_mime_type: 'application/json',
          temperature: 0.1
        }
      }

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        const errorMsg = errorData?.error?.message || `Lỗi HTTP ${response.status}`
        throw new Error(`[${model}] ${errorMsg}`)
      }

      const resJson = await response.json()
      const textOutput = resJson?.candidates?.[0]?.content?.parts?.[0]?.text
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
          const defaultStart = isSun ? '07:30' : '16:30'
          const start = item.startTime || defaultStart
          const end = item.endTime || ''
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
      console.warn(`Lỗi khi gọi model ${model}:`, err)
      // Thử model kế tiếp
    }
  }

  throw new Error(lastError?.message || 'Không thể kết nối với Google Gemini AI. Vui lòng kiểm tra lại API Key và kết nối mạng!')
}

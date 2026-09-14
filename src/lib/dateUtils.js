import { getDaysInMonth, getDay } from 'date-fns'

// Bảng ánh xạ thứ sang tiếng Việt và tiếng Trung
// getDay trả về: 0 = Chủ nhật, 1 = Thứ 2, ..., 6 = Thứ 7
export const DAY_NAMES = {
  0: { vi: 'CN', zh: '星期日', isSunday: true },
  1: { vi: 'T2', zh: '星期一', isSunday: false },
  2: { vi: 'T3', zh: '星期二', isSunday: false },
  3: { vi: 'T4', zh: '星期三', isSunday: false },
  4: { vi: 'T5', zh: '星期四', isSunday: false },
  5: { vi: 'T6', zh: '星期五', isSunday: false },
  6: { vi: 'T7', zh: '星期六', isSunday: false },
}

/**
 * Sinh danh sách thông tin từng ngày trong 1 tháng/năm cụ thể
 * @param {number} year - Năm (vd: 2026)
 * @param {number} month - Tháng từ 1 đến 12
 * @returns {Array<{ day: number, dayFormatted: string, vi: string, zh: string, isSunday: boolean }>}
 */
export function getDaysForMonth(year, month) {
  // JavaScript Date: tháng tính từ 0 đến 11
  const date = new Date(year, month - 1, 1)
  const totalDays = getDaysInMonth(date)
  const days = []

  for (let d = 1; d <= totalDays; d++) {
    const dayDate = new Date(year, month - 1, d)
    const dayOfWeek = getDay(dayDate)
    const info = DAY_NAMES[dayOfWeek]

    days.push({
      day: d,
      dayFormatted: String(d).padStart(2, '0'),
      vi: info.vi,
      zh: info.zh,
      isSunday: info.isSunday,
    })
  }

  return days
}

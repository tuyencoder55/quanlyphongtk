import { supabase, supabaseAdmin } from '@/lib/supabase'

// Danh mục mặc định dùng khi database chưa tạo bảng leave_types
export const DEFAULT_LEAVE_TYPES = [
  {
    id: 'def-pn',
    code: 'PN',
    name: 'Phép năm (hưởng lương)',
    is_paid: true,
    color: '#e11d48',
    description: 'Nghỉ phép năm tính 8h công',
  },
  {
    id: 'def-pt',
    code: 'PT',
    name: 'Phép thường (việc riêng)',
    is_paid: false,
    color: '#f59e0b',
    description: 'Nghỉ việc riêng không hưởng lương',
  },
  {
    id: 'def-kp',
    code: 'KP',
    name: 'Không phép',
    is_paid: false,
    color: '#64748b',
    description: 'Nghỉ không phép / không lý do',
  },
  {
    id: 'def-tang',
    code: 'TANG',
    name: 'Phép tang (hưởng lương)',
    is_paid: true,
    color: '#0284c7',
    description: 'Nghỉ việc hiếu tính 8h công',
  },
  {
    id: 'def-pb',
    code: 'PB',
    name: 'Phép bệnh (hưởng lương)',
    is_paid: true,
    color: '#10b981',
    description: 'Nghỉ ốm có giấy duyệt tính 8h công',
  },
  {
    id: 'def-pb-ko',
    code: 'PB_KO',
    name: 'Phép bệnh (không lương)',
    is_paid: false,
    color: '#8b5cf6',
    description: 'Nghỉ ốm sếp duyệt nghỉ không hưởng lương',
  },
]

const LOCAL_STORAGE_KEY = 'quanlyphongtk_custom_leave_types'

function getLocalLeaveTypes() {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function saveLocalLeaveTypes(types) {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(types))
  } catch (err) {
    console.warn('Lỗi lưu local storage:', err)
  }
}

/**
 * Lấy danh sách toàn bộ các loại phép trong hệ thống
 */
export async function getLeaveTypes() {
  try {
    const { data, error } = await supabase
      .from('leave_types')
      .select('*')
      .order('created_at', { ascending: true })

    if (error) {
      // Nếu bảng chưa được tạo trên Supabase (mã lỗi PGRST205) -> Dùng cache local hoặc danh mục mặc định
      console.warn('Bảng leave_types chưa có trên DB, dùng danh mục fallback:', error.message)
      const local = getLocalLeaveTypes()
      return local || DEFAULT_LEAVE_TYPES
    }

    if (data && data.length > 0) {
      saveLocalLeaveTypes(data)
      return data
    }

    // Nếu bảng có nhưng rỗng, khởi tạo danh mục ban đầu
    for (const item of DEFAULT_LEAVE_TYPES) {
      await supabaseAdmin.from('leave_types').upsert({
        code: item.code,
        name: item.name,
        is_paid: item.is_paid,
        color: item.color,
        description: item.description,
      }, { onConflict: 'code' }).catch(() => {})
    }

    return DEFAULT_LEAVE_TYPES
  } catch (err) {
    console.error('getLeaveTypes error:', err)
    const local = getLocalLeaveTypes()
    return local || DEFAULT_LEAVE_TYPES
  }
}

/**
 * Thêm loại phép mới
 */
export async function createLeaveType({ code, name, is_paid, color, description }) {
  const cleanCode = String(code).trim().toUpperCase().replace(/\s+/g, '_')
  const cleanName = String(name).trim()

  if (!cleanCode) throw new Error('Mã phép không được để trống')
  if (!cleanName) throw new Error('Tên loại phép không được để trống')

  const payload = {
    code: cleanCode,
    name: cleanName,
    is_paid: Boolean(is_paid),
    color: color || '#f43f5e',
    description: description?.trim() || null,
  }

  const { data, error } = await supabaseAdmin
    .from('leave_types')
    .insert([payload])
    .select()
    .single()

  if (error) {
    if (error.code === '23505') {
      throw new Error(`Mã phép "${cleanCode}" đã tồn tại! Vui lòng chọn mã khác.`)
    }
    // Nếu bảng chưa tạo trên DB -> lưu tạm vào localStorage
    if (error.code === 'PGRST205' || error.message?.includes('not find the table')) {
      const local = getLocalLeaveTypes() || [...DEFAULT_LEAVE_TYPES]
      if (local.some(t => t.code === cleanCode)) {
        throw new Error(`Mã phép "${cleanCode}" đã tồn tại!`)
      }
      const newItem = { id: `local_${Date.now()}`, ...payload }
      local.push(newItem)
      saveLocalLeaveTypes(local)
      return newItem
    }
    throw error
  }

  return data
}

/**
 * Cập nhật loại phép
 */
export async function updateLeaveType(id, { name, is_paid, color, description }) {
  const payload = {
    name: String(name).trim(),
    is_paid: Boolean(is_paid),
    color: color || '#f43f5e',
    description: description?.trim() || null,
  }

  const { data, error } = await supabaseAdmin
    .from('leave_types')
    .update(payload)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    // Fallback local
    const local = getLocalLeaveTypes() || [...DEFAULT_LEAVE_TYPES]
    const idx = local.findIndex(t => t.id === id)
    if (idx >= 0) {
      local[idx] = { ...local[idx], ...payload }
      saveLocalLeaveTypes(local)
      return local[idx]
    }
    throw error
  }

  return data
}

/**
 * Xoá loại phép
 */
export async function deleteLeaveType(id, code) {
  // Không cho xoá các mã mặc định cơ bản
  if (['PN', 'PT', 'KP'].includes(code)) {
    throw new Error(`Không thể xoá mã phép mặc định "${code}"!`)
  }

  const { error } = await supabaseAdmin
    .from('leave_types')
    .delete()
    .eq('id', id)

  if (error) {
    // Fallback local
    const local = getLocalLeaveTypes() || [...DEFAULT_LEAVE_TYPES]
    const updated = local.filter(t => t.id !== id && t.code !== code)
    saveLocalLeaveTypes(updated)
    return { success: true }
  }

  return { success: true }
}

import { createClient } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const serviceRoleKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY

// Tạo client quản trị riêng biệt với quyền service_role (không làm ảnh hưởng session của user)
function getAdminClient() {
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Chưa cấu hình Service Role Key trong .env!')
  }
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })
}

// Chuyển username thành email nội bộ cho Supabase Auth
export function toInternalEmail(username) {
  const clean = String(username).trim().toLowerCase()
  if (clean.includes('@')) return clean
  return `${clean}@lapthinh.com`
}

/**
 * Lấy toàn bộ danh sách tài khoản đã cấp kèm trạng thái khoá và nhân viên liên kết
 */
export async function fetchUserAccounts() {
  const adminClient = getAdminClient()

  // 1. Lấy danh sách Auth Users
  const { data: authData, error: authErr } = await adminClient.auth.admin.listUsers()
  if (authErr) throw new Error('Lỗi lấy danh sách Auth: ' + authErr.message)

  const authUsers = authData?.users || []

  // 2. Lấy thông tin profiles
  const { data: profiles, error: profErr } = await adminClient
    .from('profiles')
    .select('*')
  if (profErr) throw new Error('Lỗi lấy profiles: ' + profErr.message)

  // 3. Lấy thông tin nhân viên để map liên kết
  const { data: employees, error: empErr } = await adminClient
    .from('employees')
    .select('id, employee_code, full_name, chinese_name, status')
  if (empErr) throw new Error('Lỗi lấy danh sách nhân viên: ' + empErr.message)

  const profileMap = new Map((profiles || []).map((p) => [p.id, p]))
  const empMap = new Map((employees || []).map((e) => [e.id, e]))

  // 4. Ghép nối dữ liệu
  const accounts = authUsers.map((user) => {
    const prof = profileMap.get(user.id) || {}
    const emp = prof.employee_id ? empMap.get(prof.employee_id) : null

    // Kiểm tra xem tài khoản có bị ban / khoá không
    const isLocked = !!user.banned_until && new Date(user.banned_until) > new Date()

    return {
      id: user.id,
      email: user.email,
      username: prof.username || user.user_metadata?.username || user.email?.split('@')[0],
      fullName: prof.full_name || user.user_metadata?.full_name || emp?.full_name || 'Chưa đặt tên',
      role: prof.role || 'member',
      canEdit: prof.can_edit ?? (prof.role === 'admin'),
      canDelete: prof.can_delete ?? (prof.role === 'admin'),
      employeeId: prof.employee_id || null,
      employee: emp,
      isLocked,
      bannedUntil: user.banned_until,
      createdAt: user.created_at,
    }
  })

  // Sắp xếp admin lên trước, sau đó theo username
  accounts.sort((a, b) => {
    if (a.role === 'admin' && b.role !== 'admin') return -1
    if (a.role !== 'admin' && b.role === 'admin') return 1
    return a.username.localeCompare(b.username)
  })

  return accounts
}

/**
 * Thêm tài khoản mới cho nhân viên
 */
export async function createUserAccount({
  username,
  password = '123456',
  fullName,
  role = 'member',
  canEdit = false,
  canDelete = false,
  employeeId = null,
}) {
  const cleanUsername = String(username).trim().toLowerCase()
  if (!cleanUsername) throw new Error('Tên đăng nhập không được để trống')
  if (cleanUsername.length < 3) throw new Error('Tên đăng nhập phải có ít nhất 3 ký tự')
  const finalPassword = (password && String(password).trim()) ? String(password).trim() : '123456'
  if (finalPassword.length < 6) throw new Error('Mật khẩu phải có ít nhất 6 ký tự')

  const adminClient = getAdminClient()
  const email = toInternalEmail(cleanUsername)

  // 1. Tạo Auth User trên Supabase
  const { data: authUser, error: authErr } = await adminClient.auth.admin.createUser({
    email,
    password: finalPassword,
    email_confirm: true, // Kích hoạt ngay không cần email xác nhận
    user_metadata: {
      username: cleanUsername,
      full_name: fullName?.trim() || cleanUsername,
    },
  })

  if (authErr) {
    if (authErr.message.includes('already registered')) {
      throw new Error(`Tên đăng nhập "${cleanUsername}" đã tồn tại! Vui lòng chọn tên khác.`)
    }
    throw new Error('Lỗi tạo tài khoản: ' + authErr.message)
  }

  const userId = authUser.user.id

  // 2. Ghi nhận profile người dùng
  const { error: profErr } = await adminClient.from('profiles').upsert({
    id: userId,
    username: cleanUsername,
    full_name: fullName?.trim() || cleanUsername,
    role: role || 'member',
    can_edit: role === 'admin' ? true : Boolean(canEdit),
    can_delete: role === 'admin' ? true : Boolean(canDelete),
    employee_id: employeeId || null,
  })

  if (profErr) {
    console.error('Lỗi khi lưu profile:', profErr)
  }

  return { success: true, userId }
}

/**
 * Đổi mật khẩu tài khoản bất kỳ (Admin thực hiện)
 */
export async function updateUserPassword(userId, newPassword) {
  if (!newPassword || newPassword.length < 6) {
    throw new Error('Mật khẩu mới phải có ít nhất 6 ký tự!')
  }

  const adminClient = getAdminClient()
  const { data, error } = await adminClient.auth.admin.updateUserById(userId, {
    password: newPassword,
  })

  if (error) throw new Error('Lỗi khi đổi mật khẩu: ' + error.message)
  return data
}

/**
 * Đặt lại mật khẩu về mặc định "123456"
 */
export async function resetUserPasswordToDefault(userId) {
  return updateUserPassword(userId, '123456')
}

/**
 * Khoá hoặc Mở khoá tài khoản
 * @param {string} userId
 * @param {boolean} shouldLock - true: Khoá tài khoản, false: Mở khoá
 */
export async function toggleUserLock(userId, shouldLock) {
  const adminClient = getAdminClient()

  const { data, error } = await adminClient.auth.admin.updateUserById(userId, {
    ban_duration: shouldLock ? '876000h' : 'none', // 100 năm hoặc gỡ bỏ
  })

  if (error) throw new Error('Lỗi khi cập nhật trạng thái khoá: ' + error.message)
  return data
}

/**
 * Cập nhật vai trò, quyền hạn và nhân viên liên kết
 */
export async function updateUserPermissions(userId, {
  fullName,
  role,
  canEdit,
  canDelete,
  employeeId,
}) {
  const adminClient = getAdminClient()

  const payload = {
    role,
    can_edit: role === 'admin' ? true : Boolean(canEdit),
    can_delete: role === 'admin' ? true : Boolean(canDelete),
    employee_id: employeeId || null,
  }

  if (fullName) {
    payload.full_name = fullName.trim()
  }

  const { data, error } = await adminClient
    .from('profiles')
    .update(payload)
    .eq('id', userId)
    .select()

  if (error) throw new Error('Lỗi cập nhật quyền: ' + error.message)
  return data
}

/**
 * Xoá vĩnh viễn tài khoản
 */
export async function deleteUserAccount(userId) {
  const adminClient = getAdminClient()
  const { data, error } = await adminClient.auth.admin.deleteUser(userId)
  if (error) throw new Error('Lỗi khi xoá tài khoản: ' + error.message)
  return data
}

/**
 * Thành viên tự đổi mật khẩu cho chính mình (dùng Supabase Auth)
 */
export async function changeMyPassword(newPassword) {
  if (!newPassword || newPassword.length < 6) {
    throw new Error('Mật khẩu mới phải có ít nhất 6 ký tự!')
  }

  // 1. Cập nhật qua auth.updateUser của Supabase (dành cho user đang đăng nhập)
  const { data, error } = await supabase.auth.updateUser({
    password: newPassword,
  })

  if (error) {
    // 2. Dự phòng: dùng getAdminClient nếu có service_role
    try {
      const { data: sessionData } = await supabase.auth.getSession()
      const currentUserId = sessionData?.session?.user?.id
      if (currentUserId) {
        const adminClient = getAdminClient()
        const { error: adminErr } = await adminClient.auth.admin.updateUserById(currentUserId, {
          password: newPassword,
        })
        if (!adminErr) return { success: true }
      }
    } catch (fallbackErr) {
      console.warn('Fallback admin change password failed:', fallbackErr)
    }
    throw new Error('Lỗi khi đổi mật khẩu: ' + error.message)
  }

  return data
}


import { create } from 'zustand'
import { supabase } from '@/lib/supabase'

export const useAuthStore = create((set, get) => ({
  user: null,
  profile: null,
  loading: true,
  error: null,

  // Lấy profile chi tiết từ bảng profiles (bao gồm role, can_edit, can_delete)
  fetchProfile: async (userId) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()

      if (error && error.code !== 'PGRST116') {
        console.error('Lỗi lấy profile:', error.message)
      }

      set({ profile: data || null })
      return data
    } catch (err) {
      console.error('fetchProfile error:', err)
      return null
    }
  },

  // Khởi tạo và lắng nghe phiên đăng nhập Supabase
  initAuth: async () => {
    set({ loading: true })
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.user) {
        set({ user: session.user })
        await get().fetchProfile(session.user.id)
      } else {
        set({ user: null, profile: null })
      }
    } catch (err) {
      console.error('initAuth error:', err)
    } finally {
      set({ loading: false })
    }

    // Lắng nghe thay đổi trạng thái Auth (đăng nhập / đăng xuất)
    supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        set({ user: session.user })
        await get().fetchProfile(session.user.id)
      } else {
        set({ user: null, profile: null })
      }
      set({ loading: false })
    })
  },

  // Đăng nhập bằng Email và Password
  signIn: async (email, password) => {
    set({ loading: true, error: null })
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        set({ error: error.message, loading: false })
        return { success: false, error: error.message }
      }

      set({ user: data.user })
      await get().fetchProfile(data.user.id)
      set({ loading: false })
      return { success: true }
    } catch (err) {
      set({ error: err.message, loading: false })
      return { success: false, error: err.message }
    }
  },

  // Đăng xuất
  signOut: async () => {
    await supabase.auth.signOut()
    set({ user: null, profile: null, error: null })
  },
}))

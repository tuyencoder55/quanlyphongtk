import React, { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { useAuthStore } from '@/store/useAuthStore'
import Layout from '@/components/Layout'
import LoginPage from '@/pages/LoginPage'
import DashboardPage from '@/pages/DashboardPage'
import EmployeesPage from '@/pages/EmployeesPage'
import TimesheetPage from '@/pages/TimesheetPage'
import OvertimePage from '@/pages/OvertimePage'
import UsersPage from '@/pages/UsersPage'
import { Loader2 } from 'lucide-react'

// Component bảo vệ Route: Chỉ cho phép vào khi đã đăng nhập
function ProtectedRoute({ children }) {
  const { user, loading } = useAuthStore()

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-3 text-muted-foreground">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <span className="text-sm">Đang tải thông tin tài khoản...</span>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  return children
}

export default function App() {
  const { initAuth } = useAuthStore()

  useEffect(() => {
    initAuth()
  }, [])

  return (
    <BrowserRouter>
      {/* Toast thông báo toàn cục với phong cách dark mode */}
      <Toaster
        position="top-right"
        toastOptions={{
          className: '!bg-card !text-foreground !border !border-border !shadow-xl',
          duration: 3500,
        }}
      />

      <Routes>
        {/* Trang Đăng nhập */}
        <Route path="/login" element={<LoginPage />} />

        {/* Các trang yêu cầu đăng nhập */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Layout>
                <DashboardPage />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/timesheet"
          element={
            <ProtectedRoute>
              <Layout>
                <TimesheetPage />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/overtime"
          element={
            <ProtectedRoute>
              <Layout>
                <OvertimePage />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/employees"
          element={
            <ProtectedRoute>
              <Layout>
                <EmployeesPage />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/users"
          element={
            <ProtectedRoute>
              <Layout>
                <UsersPage />
              </Layout>
            </ProtectedRoute>
          }
        />

        {/* Chuyển hướng các đường dẫn khác về trang chủ */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

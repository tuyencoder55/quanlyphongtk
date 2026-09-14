import React, { useState, useEffect } from 'react'
import { useAuthStore } from '@/store/useAuthStore'
import { 
  ShieldCheck, 
  UserPlus, 
  Search, 
  KeyRound, 
  Lock, 
  Unlock, 
  Edit, 
  Trash2, 
  Loader2, 
  Shield, 
  User, 
  CheckCircle2, 
  AlertCircle,
  AlertTriangle,
  RotateCcw
} from 'lucide-react'
import toast from 'react-hot-toast'
import { 
  fetchUserAccounts, 
  toggleUserLock, 
  deleteUserAccount 
} from '@/features/users/userAdminService'
import { getEmployees } from '@/features/employees/employeeService'
import UserModal from '@/features/users/UserModal'
import ChangePasswordModal from '@/features/users/ChangePasswordModal'
import LeaveTypesManager from '@/features/leave-types/LeaveTypesManager'
import { FileText } from 'lucide-react'

export default function UsersPage() {
  const { user: currentUser, profile } = useAuthStore()
  const isAdmin = profile?.role === 'admin'

  const [accounts, setAccounts] = useState([])
  const [employees, setEmployees] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all') // 'all', 'active', 'locked'
  const [activeTab, setActiveTab] = useState('users') // 'users', 'leave_types'

  // Modals state
  const [userModalOpen, setUserModalOpen] = useState(false)
  const [selectedAccount, setSelectedAccount] = useState(null)
  const [passwordModalOpen, setPasswordModalOpen] = useState(false)
  const [accountForPassword, setAccountForPassword] = useState(null)

  const loadData = async () => {
    setLoading(true)
    try {
      const [accs, emps] = await Promise.all([
        fetchUserAccounts(),
        getEmployees().catch(() => []),
      ])
      setAccounts(accs)
      setEmployees(emps)
    } catch (err) {
      toast.error('Lỗi khi tải danh sách tài khoản: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  // Xử lý khoá / mở khoá tài khoản
  const handleToggleLock = async (account) => {
    if (account.id === currentUser?.id) {
      toast.error('Bạn không thể tự khoá tài khoản Admin đang đăng nhập của mình!')
      return
    }

    const actionText = account.isLocked ? 'MỞ KHOÁ' : 'KHOÁ'
    const confirmMsg = account.isLocked
      ? `Bạn có chắc muốn mở khoá cho tài khoản "${account.username}" không? Nhân viên sẽ có thể đăng nhập lại.`
      : `Bạn có chắc muốn KHOÁ tài khoản "${account.username}" không? Nhân viên sẽ bị chặn đăng nhập ngay lập tức.`

    if (!window.confirm(confirmMsg)) return

    try {
      await toggleUserLock(account.id, !account.isLocked)
      toast.success(`Đã ${actionText.toLowerCase()} tài khoản "${account.username}" thành công!`)
      loadData()
    } catch (err) {
      toast.error('Lỗi: ' + err.message)
    }
  }

  // Xử lý xoá tài khoản
  const handleDeleteAccount = async (account) => {
    if (account.id === currentUser?.id) {
      toast.error('Bạn không thể xoá tài khoản Admin đang đăng nhập của mình!')
      return
    }

    if (!window.confirm(`CẢNH BÁO: Bạn có chắc chắn muốn XOÁ VĨNH VIỄN tài khoản "${account.username}" (${account.fullName}) không? Hành động này không thể hoàn tác.`)) {
      return
    }

    try {
      await deleteUserAccount(account.id)
      toast.success(`Đã xoá tài khoản "${account.username}" thành công!`)
      loadData()
    } catch (err) {
      toast.error('Lỗi khi xoá tài khoản: ' + err.message)
    }
  }

  // Lọc tài khoản theo từ khoá và trạng thái
  const filteredAccounts = accounts.filter((acc) => {
    const matchesSearch =
      acc.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      acc.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (acc.employee && (
        acc.employee.employee_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        acc.employee.full_name.toLowerCase().includes(searchTerm.toLowerCase())
      ))

    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'active' && !acc.isLocked) ||
      (statusFilter === 'locked' && acc.isLocked)

    return matchesSearch && matchesStatus
  })

  // Nếu không phải Admin thì hiển thị thông báo chặn
  if (!isAdmin) {
    return (
      <div className="py-20 text-center px-4 max-w-md mx-auto">
        <div className="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-400 flex items-center justify-center mx-auto mb-3">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h3 className="text-base font-bold text-foreground">Không có quyền truy cập</h3>
        <p className="text-xs text-muted-foreground mt-1">
          Chỉ Quản trị viên (Admin) mới có quyền truy cập trang quản lý tài khoản và phân quyền.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-5 max-w-6xl mx-auto">
      {/* Header khu vực Quản Trị */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-primary" />
            <span>Khu Vực Quản Trị Hệ Thống</span>
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Quản lý tài khoản đăng nhập, phân quyền và danh mục các loại phép chấm công
          </p>
        </div>
      </div>

      {/* Tabs chuyển đổi: Tài khoản vs Danh mục loại phép */}
      <div className="flex items-center gap-2 border-b border-border/70 pb-3">
        <button
          onClick={() => setActiveTab('users')}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'users'
              ? 'bg-primary text-primary-foreground shadow-md shadow-primary/20'
              : 'bg-secondary/60 text-muted-foreground hover:text-foreground hover:bg-secondary'
          }`}
        >
          <ShieldCheck className="w-4 h-4" />
          <span>Tài Khoản Đăng Nhập ({accounts.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('leave_types')}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'leave_types'
              ? 'bg-primary text-primary-foreground shadow-md shadow-primary/20'
              : 'bg-secondary/60 text-muted-foreground hover:text-foreground hover:bg-secondary'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Danh Mục Loại Phép & Tính Công</span>
        </button>
      </div>

      {activeTab === 'leave_types' ? (
        <LeaveTypesManager />
      ) : (
        <>
          <div className="flex justify-end">
            <button
              onClick={() => {
                setSelectedAccount(null)
                setUserModalOpen(true)
              }}
              className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold rounded-xl shadow-md shadow-primary/25 transition-all"
            >
              <UserPlus className="w-4 h-4" />
              <span>Cấp Tài Khoản Mới</span>
            </button>
          </div>

      {/* Thanh công cụ: Tìm kiếm & Lọc trạng thái */}
      <div className="bg-card border border-border/70 rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
        {/* Ô Tìm kiếm */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Tìm theo tên đăng nhập, họ tên hoặc mã nhân viên..."
            className="w-full pl-9 pr-4 py-2 bg-secondary/50 border border-border rounded-lg text-xs text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
          />
        </div>

        {/* Bộ lọc trạng thái */}
        <div className="flex items-center gap-2 text-xs">
          <span className="text-muted-foreground hidden md:inline">Trạng thái:</span>
          <div className="flex items-center bg-secondary/70 p-1 rounded-lg border border-border/60">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1 rounded-md transition-all font-medium ${
                statusFilter === 'all'
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Tất cả ({accounts.length})
            </button>
            <button
              onClick={() => setStatusFilter('active')}
              className={`px-3 py-1 rounded-md transition-all font-medium ${
                statusFilter === 'active'
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Hoạt động ({accounts.filter((a) => !a.isLocked).length})
            </button>
            <button
              onClick={() => setStatusFilter('locked')}
              className={`px-3 py-1 rounded-md transition-all font-medium ${
                statusFilter === 'locked'
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Đã khoá ({accounts.filter((a) => a.isLocked).length})
            </button>
          </div>
        </div>
      </div>

      {/* Bảng Danh Sách Tài Khoản */}
      <div className="bg-card border border-border/70 rounded-xl overflow-hidden shadow-sm">
        {loading ? (
          <div className="py-16 flex flex-col items-center justify-center gap-3 text-muted-foreground">
            <Loader2 className="w-7 h-7 animate-spin text-primary" />
            <span className="text-xs">Đang tải danh sách tài khoản...</span>
          </div>
        ) : filteredAccounts.length === 0 ? (
          <div className="py-16 text-center px-4">
            <div className="w-12 h-12 rounded-2xl bg-secondary/80 flex items-center justify-center text-muted-foreground mx-auto mb-3">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h4 className="text-sm font-semibold text-foreground">Không tìm thấy tài khoản nào</h4>
            <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
              {searchTerm
                ? 'Không có kết quả khớp với từ khoá tìm kiếm của bạn.'
                : 'Chưa có tài khoản nhân viên nào. Hãy bấm nút "Cấp Tài Khoản Mới" để tạo tài khoản đầu tiên.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-border/70 bg-secondary/40 text-muted-foreground font-semibold">
                  <th className="py-3 px-4 w-14 text-center">STT</th>
                  <th className="py-3 px-4 w-40">TÊN ĐĂNG NHẬP</th>
                  <th className="py-3 px-5">HỌ TÊN & NHÂN VIÊN LIÊN KẾT</th>
                  <th className="py-3 px-4 w-32 text-center">VAI TRÒ</th>
                  <th className="py-3 px-4 w-32 text-center">QUYỀN SỬA CÔNG</th>
                  <th className="py-3 px-4 w-32 text-center">TRẠNG THÁI</th>
                  <th className="py-3 px-4 w-44 text-center">THAO TÁC</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {filteredAccounts.map((acc, index) => {
                  const isCurrent = acc.id === currentUser?.id
                  const isLocked = acc.isLocked
                  const isAdminRole = acc.role === 'admin'

                  return (
                    <tr
                      key={acc.id}
                      className={`hover:bg-secondary/30 transition-colors ${
                        isLocked ? 'opacity-65 bg-rose-500/5' : ''
                      }`}
                    >
                      {/* STT */}
                      <td className="py-3.5 px-4 text-center text-muted-foreground font-medium">
                        {index + 1}
                      </td>

                      {/* Tên đăng nhập */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono font-bold px-2 py-1 rounded bg-secondary border border-border text-blue-400">
                            {acc.username}
                          </span>
                          {isCurrent && (
                            <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-500/15 border border-emerald-500/30 px-1.5 py-0.5 rounded">
                              Bạn
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Họ và tên & Nhân viên liên kết */}
                      <td className="py-3.5 px-5">
                        <div className="flex flex-col">
                          <span className="font-bold text-foreground text-sm">
                            {acc.fullName}
                          </span>
                          {acc.employee ? (
                            <span className="text-[11px] text-muted-foreground mt-0.5 flex items-center gap-1">
                              <span>Nhân sự:</span>
                              <span className="font-mono font-semibold text-foreground/80">
                                {acc.employee.employee_code}
                              </span>
                              <span>- {acc.employee.full_name}</span>
                            </span>
                          ) : (
                            <span className="text-[11px] text-muted-foreground/50 italic mt-0.5">
                              (Chưa liên kết hồ sơ nhân sự)
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Vai trò */}
                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold ${
                            isAdminRole
                              ? 'bg-indigo-500/15 text-indigo-400 border border-indigo-500/30'
                              : 'bg-secondary text-muted-foreground border border-border'
                          }`}
                        >
                          {isAdminRole ? (
                            <>
                              <Shield className="w-3 h-3 text-indigo-400" />
                              <span>Admin</span>
                            </>
                          ) : (
                            <>
                              <User className="w-3 h-3 text-muted-foreground" />
                              <span>Thành Viên</span>
                            </>
                          )}
                        </span>
                      </td>

                      {/* Quyền sửa công */}
                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold ${
                            acc.canEdit || isAdminRole
                              ? 'bg-emerald-500/15 text-emerald-400'
                              : 'bg-secondary text-muted-foreground/60'
                          }`}
                        >
                          {acc.canEdit || isAdminRole ? 'Được phép' : 'Chỉ xem'}
                        </span>
                      </td>

                      {/* Trạng thái khoá */}
                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold ${
                            !isLocked
                              ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                              : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              !isLocked ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'
                            }`}
                          />
                          {!isLocked ? 'Hoạt động' : 'Đã bị khoá'}
                        </span>
                      </td>

                      {/* Thao tác */}
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-1">
                          {/* Nút Đổi mật khẩu */}
                          <button
                            onClick={() => {
                              setAccountForPassword(acc)
                              setPasswordModalOpen(true)
                            }}
                            title="Đổi mật khẩu cho tài khoản này"
                            className="p-1.5 rounded-lg text-amber-400 hover:bg-amber-500/10 transition-colors"
                          >
                            <KeyRound className="w-4 h-4" />
                          </button>

                          {/* Nút Khoá / Mở khoá */}
                          {!isCurrent && (
                            <button
                              onClick={() => handleToggleLock(acc)}
                              title={isLocked ? 'Mở khoá tài khoản' : 'Khoá tài khoản (Chặn đăng nhập)'}
                              className={`p-1.5 rounded-lg transition-colors ${
                                isLocked
                                  ? 'text-emerald-400 hover:bg-emerald-500/10'
                                  : 'text-rose-400 hover:bg-rose-500/10'
                              }`}
                            >
                              {isLocked ? <Unlock className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                            </button>
                          )}

                          {/* Nút Sửa phân quyền */}
                          <button
                            onClick={() => {
                              setSelectedAccount(acc)
                              setUserModalOpen(true)
                            }}
                            title="Chỉnh sửa phân quyền & thông tin"
                            className="p-1.5 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                          >
                            <Edit className="w-4 h-4" />
                          </button>

                          {/* Nút Xoá */}
                          {!isCurrent && (
                            <button
                              onClick={() => handleDeleteAccount(acc)}
                              title="Xoá tài khoản này"
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
      </>
      )}

      {/* Modal Cấp / Sửa Tài Khoản */}
      <UserModal
        isOpen={userModalOpen}
        onClose={() => setUserModalOpen(false)}
        account={selectedAccount}
        employees={employees}
        onSuccess={loadData}
      />

      {/* Modal Đổi Mật Khẩu */}
      <ChangePasswordModal
        isOpen={passwordModalOpen}
        onClose={() => setPasswordModalOpen(false)}
        account={accountForPassword}
        onSuccess={loadData}
      />
    </div>
  )
}

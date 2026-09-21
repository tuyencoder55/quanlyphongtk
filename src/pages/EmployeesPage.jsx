import React, { useState, useEffect } from 'react'
import { useAuthStore } from '@/store/useAuthStore'
import { 
  Users, 
  UserPlus, 
  Search, 
  Edit, 
  UserX, 
  RotateCcw, 
  Loader2, 
  CheckCircle2, 
  AlertCircle,
  Hash,
  Languages,
  KeyRound,
  ShieldCheck
} from 'lucide-react'
import toast from 'react-hot-toast'
import { getEmployees, deleteEmployee, restoreEmployee } from '@/features/employees/employeeService'
import { fetchUserAccounts, resetUserPasswordToDefault } from '@/features/users/userAdminService'
import EmployeeModal from '@/features/employees/EmployeeModal'
import UserModal from '@/features/users/UserModal'
import ChangePasswordModal from '@/features/users/ChangePasswordModal'

export default function EmployeesPage() {
  const { profile } = useAuthStore()
  const isAdmin = profile?.role === 'admin'
  const canEdit = isAdmin || profile?.can_edit
  const canDelete = isAdmin || profile?.can_delete

  const [employees, setEmployees] = useState([])
  const [accounts, setAccounts] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all') // 'all', 'active', 'inactive'
  const [departmentFilter, setDepartmentFilter] = useState('all') // 'all', 'TK', 'CTP'

  // Modal state
  const [modalOpen, setModalOpen] = useState(false)
  const [selectedEmployee, setSelectedEmployee] = useState(null)
  const [userModalOpen, setUserModalOpen] = useState(false)
  const [empForUserModal, setEmpForUserModal] = useState(null)
  const [passwordModalOpen, setPasswordModalOpen] = useState(false)
  const [accountForPassword, setAccountForPassword] = useState(null)

  const loadData = async () => {
    setLoading(true)
    try {
      const data = await getEmployees()
      setEmployees(data)

      if (isAdmin) {
        const accs = await fetchUserAccounts().catch(() => [])
        setAccounts(accs)
      }
    } catch (err) {
      toast.error('Lỗi khi tải danh sách nhân viên: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  // Xử lý ngưng hoạt động (xoá mềm)
  const handleDeactivate = async (employee) => {
    if (!window.confirm(`Bạn có chắc muốn ngưng hoạt động nhân viên "${employee.full_name}" không?`)) {
      return
    }

    try {
      await deleteEmployee(employee.id)
      toast.success(`Đã chuyển trạng thái nhân viên ${employee.employee_code} sang Ngưng hoạt động`)
      loadData()
    } catch (err) {
      toast.error('Lỗi: ' + err.message)
    }
  }

  // Xử lý khôi phục lại nhân viên
  const handleRestore = async (employee) => {
    try {
      await restoreEmployee(employee.id)
      toast.success(`Đã kích hoạt lại nhân viên ${employee.employee_code}`)
      loadData()
    } catch (err) {
      toast.error('Lỗi: ' + err.message)
    }
  }

  // Xử lý Reset mật khẩu về mặc định 123456
  const handleResetPasswordDefault = async (account) => {
    const confirmMsg = `Bạn có chắc muốn RESET mật khẩu của tài khoản "${account.username}" (${account.fullName || ''}) về mặc định "123456" không?\n\nNhân viên sẽ đăng nhập bằng mật khẩu 123456 sau khi reset.`
    if (!window.confirm(confirmMsg)) return

    const toastId = toast.loading(`Đang reset mật khẩu cho "${account.username}"...`)
    try {
      await resetUserPasswordToDefault(account.id)
      toast.success(`Đã reset mật khẩu tài khoản "${account.username}" về mặc định 123456 thành công!`, { id: toastId })
    } catch (err) {
      toast.error('Lỗi khi reset mật khẩu: ' + err.message, { id: toastId })
    }
  }

  // Lọc dữ liệu theo từ khoá, trạng thái và bộ phận
  const filteredEmployees = employees.filter((emp) => {
    const matchesSearch = 
      emp.employee_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (emp.chinese_name && emp.chinese_name.toLowerCase().includes(searchTerm.toLowerCase()))

    const matchesStatus = 
      statusFilter === 'all' || emp.status === statusFilter

    const empDept = emp.department || 'TK'
    const matchesDept = 
      departmentFilter === 'all' || empDept === departmentFilter

    return matchesSearch && matchesStatus && matchesDept
  })

  return (
    <div className="space-y-5 max-w-6xl mx-auto">
      {/* Thanh tiêu đề và nút Thêm */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Users className="w-6 h-6 text-primary" />
            <span>Quản Lý Nhân Viên</span>
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Danh sách nhân sự phòng thiết kế • Hỗ trợ song ngữ và tự động đồng bộ chấm công
          </p>
        </div>

        {canEdit && (
          <button
            onClick={() => {
              setSelectedEmployee(null)
              setModalOpen(true)
            }}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-semibold rounded-xl shadow-md shadow-primary/25 transition-all"
          >
            <UserPlus className="w-4 h-4" />
            <span>Thêm Nhân Viên Mới</span>
          </button>
        )}
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
            placeholder="Tìm theo mã số, tên tiếng Việt hoặc chữ Hán..."
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
              Tất cả ({employees.length})
            </button>
            <button
              onClick={() => setStatusFilter('active')}
              className={`px-3 py-1 rounded-md transition-all font-medium ${
                statusFilter === 'active'
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Đang làm ({employees.filter(e => e.status === 'active').length})
            </button>
            <button
              onClick={() => setStatusFilter('inactive')}
              className={`px-3 py-1 rounded-md transition-all font-medium ${
                statusFilter === 'inactive'
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Đã nghỉ ({employees.filter(e => e.status === 'inactive').length})
            </button>
          </div>
        </div>
      </div>

      {/* Tabs Lọc Theo Bộ Phận (Thiết Kế / CTP) */}
      <div className="flex items-center gap-2 border-b border-border/60 pb-1">
        <button
          onClick={() => setDepartmentFilter('all')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
            departmentFilter === 'all'
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'bg-secondary/60 text-muted-foreground hover:text-foreground hover:bg-secondary'
          }`}
        >
          Tất Cả ({employees.length})
        </button>
        <button
          onClick={() => setDepartmentFilter('TK')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
            departmentFilter === 'TK'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'bg-secondary/60 text-muted-foreground hover:text-foreground hover:bg-secondary'
          }`}
        >
          <span>🎨 Phòng Thiết Kế</span>
          <span className="text-[11px] opacity-80">({employees.filter(e => (e.department || 'TK') === 'TK').length})</span>
        </button>
        <button
          onClick={() => setDepartmentFilter('CTP')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
            departmentFilter === 'CTP'
              ? 'bg-purple-600 text-white shadow-sm'
              : 'bg-secondary/60 text-muted-foreground hover:text-foreground hover:bg-secondary'
          }`}
        >
          <span>🖨️ Bộ Phận CTP</span>
          <span className="text-[11px] opacity-80">({employees.filter(e => e.department === 'CTP').length})</span>
        </button>
      </div>

      {/* Bảng Danh Sách Nhân Viên */}
      <div className="bg-card border border-border/70 rounded-xl overflow-hidden shadow-sm">
        {loading ? (
          <div className="py-16 flex flex-col items-center justify-center gap-3 text-muted-foreground">
            <Loader2 className="w-7 h-7 animate-spin text-primary" />
            <span className="text-xs">Đang tải danh sách nhân sự...</span>
          </div>
        ) : filteredEmployees.length === 0 ? (
          <div className="py-16 text-center px-4">
            <div className="w-12 h-12 rounded-2xl bg-secondary/80 flex items-center justify-center text-muted-foreground mx-auto mb-3">
              <Users className="w-6 h-6" />
            </div>
            <h4 className="text-sm font-semibold text-foreground">Không tìm thấy nhân viên nào</h4>
            <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
              {searchTerm 
                ? 'Không có kết quả khớp với từ khoá tìm kiếm của bạn.' 
                : 'Chưa có nhân viên nào trong danh sách. Hãy bấm nút Thêm Nhân Viên Mới để bắt đầu.'}
            </p>
            {canEdit && !searchTerm && (
              <button
                onClick={() => {
                  setSelectedEmployee(null)
                  setModalOpen(true)
                }}
                className="mt-4 px-4 py-2 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/30 rounded-xl text-xs font-medium transition-colors"
              >
                + Thêm nhân viên đầu tiên
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-border/70 bg-secondary/40 text-muted-foreground font-semibold">
                  <th className="py-3 px-4 w-14 text-center">STT</th>
                  <th className="py-3 px-4 w-28">MÃ SỐ</th>
                  <th className="py-3 px-5">HỌ VÀ TÊN (VIỆT - TRUNG)</th>
                  <th className="py-3 px-4 w-32 text-center">BỘ PHẬN</th>
                  {isAdmin && (
                    <th className="py-3 px-4 w-40 text-center">TÀI KHOẢN ĐĂNG NHẬP</th>
                  )}
                  <th className="py-3 px-4 w-28 text-center">TRẠNG THÁI</th>
                  <th className="py-3 px-4 w-28 text-right">NGÀY TẠO</th>
                  {(canEdit || canDelete) && (
                    <th className="py-3 px-4 w-24 text-center">THAO TÁC</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {filteredEmployees.map((emp, index) => {
                  const isActive = emp.status === 'active'
                  const linkedAccount = accounts.find((a) => a.employeeId === emp.id)

                  return (
                    <tr 
                      key={emp.id} 
                      className={`hover:bg-secondary/30 transition-colors ${
                        !isActive ? 'opacity-65' : ''
                      }`}
                    >
                      {/* STT */}
                      <td className="py-3.5 px-4 text-center text-muted-foreground font-medium">
                        {index + 1}
                      </td>

                      {/* Mã số */}
                      <td className="py-3.5 px-4">
                        <span className="font-mono font-semibold px-2 py-1 rounded bg-secondary border border-border text-blue-400">
                          {emp.employee_code}
                        </span>
                      </td>

                      {/* Họ và tên: Tiếng Việt trên, Chữ Hán dưới */}
                      <td className="py-3.5 px-5">
                        <div className="flex flex-col">
                          <span className="font-bold text-foreground text-sm tracking-wide">
                            {emp.full_name}
                          </span>
                          {emp.chinese_name ? (
                            <span className="text-xs text-muted-foreground font-medium mt-0.5">
                              {emp.chinese_name}
                            </span>
                          ) : (
                            <span className="text-[11px] text-muted-foreground/40 italic mt-0.5">
                              (Chưa có tên chữ Hán)
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Bộ phận */}
                      <td className="py-3.5 px-4 text-center">
                        {(emp.department || 'TK') === 'CTP' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-purple-500/15 text-purple-300 border border-purple-500/30">
                            <span>🖨️ CTP</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-blue-500/15 text-blue-300 border border-blue-500/30">
                            <span>🎨 Thiết Kế</span>
                          </span>
                        )}
                      </td>

                      {/* Cột Tài khoản (chỉ Admin thấy) */}
                      {isAdmin && (
                        <td className="py-3.5 px-4 text-center">
                          {linkedAccount ? (
                            <div className="inline-flex items-center justify-center gap-1">
                              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-500/10 border border-blue-500/20 text-xs">
                                <span
                                  className={`w-1.5 h-1.5 rounded-full ${
                                    !linkedAccount.isLocked ? 'bg-emerald-400' : 'bg-rose-400'
                                  }`}
                                />
                                <span className="font-mono font-semibold text-blue-400">
                                  {linkedAccount.username}
                                </span>
                                {linkedAccount.isLocked && (
                                  <span className="text-[10px] text-rose-400 font-bold">(Khoá)</span>
                                )}
                              </div>

                              {/* Nút Reset mật khẩu về mặc định 123456 */}
                              <button
                                onClick={() => handleResetPasswordDefault(linkedAccount)}
                                title="Reset mật khẩu tài khoản về mặc định (123456)"
                                className="p-1.5 rounded-lg text-cyan-400 hover:bg-cyan-500/10 transition-colors"
                              >
                                <RotateCcw className="w-3.5 h-3.5" />
                              </button>

                              {/* Nút Đổi mật khẩu tùy chọn */}
                              <button
                                onClick={() => {
                                  setAccountForPassword(linkedAccount)
                                  setPasswordModalOpen(true)
                                }}
                                title="Đổi mật khẩu tài khoản này"
                                className="p-1.5 rounded-lg text-amber-400 hover:bg-amber-500/10 transition-colors"
                              >
                                <KeyRound className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => {
                                setEmpForUserModal(emp)
                                setUserModalOpen(true)
                              }}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-secondary hover:bg-primary/15 hover:text-primary border border-border text-[11px] text-muted-foreground font-medium transition-colors"
                            >
                              <KeyRound className="w-3 h-3" />
                              <span>+ Cấp TK</span>
                            </button>
                          )}
                        </td>
                      )}

                      {/* Trạng thái */}
                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold ${
                            isActive
                              ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                              : 'bg-slate-700/40 text-slate-400 border border-slate-600/40'
                          }`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-emerald-400' : 'bg-slate-400'}`} />
                          {isActive ? 'Đang làm việc' : 'Đã nghỉ việc'}
                        </span>
                      </td>

                      {/* Ngày tạo */}
                      <td className="py-3.5 px-4 text-right text-muted-foreground text-[11px]">
                        {new Date(emp.created_at).toLocaleDateString('vi-VN')}
                      </td>

                      {/* Thao tác */}
                      {(canEdit || canDelete) && (
                        <td className="py-3.5 px-4 text-center">
                          <div className="flex items-center justify-center gap-1">
                            {/* Nút sửa */}
                            {canEdit && (
                              <button
                                onClick={() => {
                                  setSelectedEmployee(emp)
                                  setModalOpen(true)
                                }}
                                title="Chỉnh sửa thông tin"
                                className="p-1.5 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                            )}

                            {/* Nút ngưng hoạt động / khôi phục */}
                            {canDelete && (
                              isActive ? (
                                <button
                                  onClick={() => handleDeactivate(emp)}
                                  title="Ngưng hoạt động (Nhân viên nghỉ việc)"
                                  className="p-1.5 rounded-lg text-muted-foreground hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                                >
                                  <UserX className="w-4 h-4" />
                                </button>
                              ) : (
                                <button
                                  onClick={() => handleRestore(emp)}
                                  title="Kích hoạt lại nhân viên"
                                  className="p-1.5 rounded-lg text-muted-foreground hover:text-emerald-400 hover:bg-emerald-500/10 transition-colors"
                                >
                                  <RotateCcw className="w-4 h-4" />
                                </button>
                              )
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Thêm/Sửa Nhân Viên */}
      <EmployeeModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        employee={selectedEmployee}
        onSuccess={loadData}
      />

      {/* Modal Cấp Tài Khoản Nhanh Cho Nhân Viên */}
      <UserModal
        isOpen={userModalOpen}
        onClose={() => {
          setUserModalOpen(false)
          setEmpForUserModal(null)
        }}
        preselectedEmployee={empForUserModal}
        employees={employees}
        onSuccess={loadData}
      />

      {/* Modal Đổi Mật Khẩu Nhanh Cho Tài Khoản Nhân Viên */}
      <ChangePasswordModal
        isOpen={passwordModalOpen}
        onClose={() => {
          setPasswordModalOpen(false)
          setAccountForPassword(null)
        }}
        account={accountForPassword}
        onSuccess={loadData}
      />
    </div>
  )
}

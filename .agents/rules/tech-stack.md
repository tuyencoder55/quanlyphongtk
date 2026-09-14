# Rule: Tech Stack

Dự án kế thừa đúng stack đã dùng ở dự án "Workspace" trước đây — giữ nhất quán, không đổi mà không hỏi.

## Bắt buộc dùng
- **Frontend**: React 18 + Vite. Dùng **JavaScript thuần** (không TypeScript) để giữ đơn giản, dễ đọc cho non-dev.
- **UI**: TailwindCSS + shadcn/ui. Dark mode mặc định (theo thói quen dự án Workspace) trừ khi được yêu cầu khác.
- **Backend/DB**: Supabase (Postgres + Auth + Storage nếu cần đính kèm file sau này).
- **Routing**: react-router-dom.
- **Deploy**: Vercel (frontend) — Supabase tự host phần backend.

## Thư viện đề xuất thêm (đặc thù bài toán chấm công) — dùng khi cần, không cài sẵn hết
| Nhu cầu | Thư viện | Vì sao |
|---|---|---|
| Tính thứ/ngày trong tuần, số ngày trong tháng, tạo lưới lịch | `date-fns` | Nhẹ, đủ dùng, không cần moment.js |
| Gọi/cache dữ liệu Supabase (bảng chấm công load nhiều, đổi tháng liên tục) | `@tanstack/react-query` | Tránh tự viết loading/refetch tay, cache theo kỳ (period) rất hợp bài toán đổi tháng |
| State nhỏ dùng chung (kỳ đang chọn, role user hiện tại) | `zustand` | Đơn giản hơn Redux, đúng tinh thần "tránh Redux" đã thống nhất trước đây |
| Thông báo (lưu thành công, lỗi...) | `react-hot-toast` | Nhẹ, dễ dùng |
| Xuất Excel giống file gốc (khi làm tới module export, chưa phải MVP) | `sheetjs (xlsx)` | Xuất được định dạng gần giống file Excel cũ |

## Tuyệt đối tránh (giữ nguyên nguyên tắc từ dự án Workspace)
- Express / NestJS riêng — Supabase đã đủ làm backend.
- Docker.
- Redux.
- Socket.io / realtime phức tạp (Supabase Realtime chỉ bật khi thực sự cần nhiều người sửa cùng lúc — không phải MVP).
- Microservices, monorepo phức tạp.

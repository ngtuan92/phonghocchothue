# Danh sách file đã chỉnh sửa / tạo cho chức năng Redirect URL

## Backend (`backend`)

- **Tạo mới**
  - `src/app/models/redirectModel.js`
  - `src/app/controllers/redirectController.js`
  - `src/routes/redirect/index.js`

- **Chỉnh sửa**
  - `src/routes/index.js` – thêm route `redirect`
  - `src/migrations/sync-database.js` – import thêm `redirectModel` để sync DB

## Frontend (`frontend`)

- **Tạo mới**
  - `src/views/admin/Redirect.jsx` – trang Admin quản lý CRUD Redirect URL
  - `src/app/admin/redirect/page.tsx` – route Next.js cho trang `/admin/redirect`

- **Chỉnh sửa**
  - `next.config.js` – (trước đó) thêm cấu hình redirect tĩnh ví dụ `/phong/san-pham-1` → `/phong/san-pham-new`
  - `src/middleware.ts` – thêm logic gọi backend `/api/redirect?path=...` để redirect động theo cấu hình trong DB
  - `src/routes.tsx` – thêm mục menu `Redirect URL` trong sidebar admin
  - `src/views/admin/Redirect.jsx` – cập nhật xử lý lấy dữ liệu list redirect (sử dụng `fetchData` trả về trực tiếp `response.data`)



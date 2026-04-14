# Hướng dẫn chuyển đổi sang Next.js với TypeScript

Dự án đã được chuyển đổi từ React + Vite sang Next.js 15 với TypeScript.

## Những thay đổi chính

### 1. Cấu trúc thư mục
- Routing: Từ `react-router-dom` sang Next.js App Router (`src/app/`)
- Components: Giữ nguyên trong `src/components/` nhưng chuyển sang `.tsx`
- Pages: Chuyển từ `src/pages/` sang `src/app/` với cấu trúc routing của Next.js

### 2. Environment Variables
- Thay đổi từ `import.meta.env.VITE_URL_API` sang `process.env.NEXT_PUBLIC_URL_API`
- Tạo file `.env.local` với nội dung:
```
NEXT_PUBLIC_URL_API=http://localhost:3000/
```

### 3. Routing
- Thay `useNavigate()` từ react-router-dom bằng `useRouter()` từ `next/navigation`
- Thay `useParams()` từ react-router-dom bằng `useParams()` từ `next/navigation`
- Thay `<Link>` từ react-router-dom bằng `<Link>` từ `next/link`

### 4. Components cần chuyển đổi
Các components còn lại cần được chuyển đổi từ `.jsx` sang `.tsx`:

1. Thêm `"use client"` ở đầu file nếu component sử dụng hooks hoặc browser APIs
2. Thay `import.meta.env` bằng `process.env.NEXT_PUBLIC_*`
3. Thay `useNavigate()` bằng `useRouter()` từ `next/navigation`
4. Thêm type annotations cho props và state

### 5. Scripts
```bash
# Development
npm run dev

# Build
npm run build

# Start production server
npm start

# Lint
npm run lint
```

### 6. Các file đã chuyển đổi
- ✅ `src/app/layout.tsx` - Root layout
- ✅ `src/app/page.tsx` - Home page
- ✅ `src/app/detail/[id]/page.tsx` - Detail page
- ✅ `src/app/admin/*` - Admin pages
- ✅ `src/axios/index.ts` - API client
- ✅ `src/context/ConfigProvider.tsx` - Context provider
- ✅ `src/hooks/*.ts` - Custom hooks
- ✅ `src/utils/helpers.ts` - Utilities
- ✅ `src/components/Header.tsx` - Header component
- ✅ `src/components/ProductCard.tsx` - ProductCard component
- ✅ `src/components/admin/Layout.tsx` - Admin layout

### 7. Các file cần chuyển đổi thủ công
Các components còn lại trong `src/components/` cần được chuyển đổi:
- Footer.jsx → Footer.tsx
- Describe.jsx → Describe.tsx
- Contact.jsx → Contact.tsx
- Backdrop.jsx → Backdrop.tsx
- NurseryHeader.jsx → NurseryHeader.tsx
- Rooms.jsx → Rooms.tsx
- Navbar.jsx → Navbar.tsx
- Và các components trong `src/components/admin/`

### 8. Các pages admin cần chuyển đổi
- `src/pages/admin/Dashboard.jsx` → Giữ nguyên (đã được import trong app router)
- `src/pages/admin/Product.jsx` → Giữ nguyên
- `src/pages/admin/Config.jsx` → Giữ nguyên
- `src/pages/admin/Order.jsx` → Giữ nguyên

Lưu ý: Các pages admin này vẫn có thể sử dụng React Router hooks, cần chuyển đổi sang Next.js hooks nếu cần.

### 9. Middleware
Đã tạo `src/middleware.ts` để xử lý authentication cho admin routes.

### 10. Cài đặt dependencies
Chạy lệnh sau để cài đặt dependencies mới:
```bash
npm install
```

## Lưu ý quan trọng

1. **Client Components**: Tất cả components sử dụng hooks, state, hoặc browser APIs cần có `"use client"` directive ở đầu file.

2. **Server Components**: Components không cần `"use client"` có thể là Server Components (mặc định trong Next.js App Router).

3. **Images**: Sử dụng `next/image` thay vì thẻ `<img>` thông thường để tối ưu hiệu suất.

4. **Metadata**: Sử dụng `metadata` export trong layout và page files thay vì `react-helmet-async`.

5. **API Routes**: Nếu cần tạo API routes, đặt trong `src/app/api/`.

## Bước tiếp theo

1. Chuyển đổi các components còn lại sang TypeScript
2. Kiểm tra và sửa các lỗi TypeScript
3. Test toàn bộ ứng dụng
4. Tối ưu hiệu suất với Next.js Image component
5. Cập nhật SEO metadata

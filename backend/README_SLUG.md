# Hướng dẫn thêm Slug cho Products

## Tổng quan

Backend đã được cập nhật để hỗ trợ slug cho products. Slug cho phép truy cập sản phẩm bằng URL thân thiện như `/phong/phong-hoc-1` thay vì `/phong/1`.

## Các thay đổi đã thực hiện

### 1. Model (`src/app/models/productModel.js`)
- Thêm field `slug` vào model Product
- Slug là unique và có thể null

### 2. Controller (`src/app/controllers/productController.js`)
- `getById()`: Hỗ trợ query bằng slug hoặc id
  - Nếu param là số → query theo id
  - Nếu param là string → query theo slug
- `index()`: Trả về slug trong danh sách products
- `save()`: Tự động tạo slug từ name nếu không có slug được cung cấp
- `update()`: Tự động tạo slug từ name nếu name thay đổi và không có slug

### 3. Utility (`src/util/slug.js`)
- `createSlug()`: Chuyển đổi text thành slug (hỗ trợ tiếng Việt)
- `createUniqueSlug()`: Tạo slug unique bằng cách thêm số nếu slug đã tồn tại

## Cách chạy Migration

### Bước 1: Thêm column slug vào database

Chạy migration script:

```bash
cd backend
node src/migrations/add-slug-to-products.js
```

Script này sẽ:
- Thêm column `slug` vào bảng `products`
- Tự động tạo slug cho các sản phẩm đã có (dựa trên name)

### Bước 2: Kiểm tra

Sau khi chạy migration, kiểm tra:
- Column `slug` đã được thêm vào bảng `products`
- Các sản phẩm đã có slug được tạo tự động

## Cách sử dụng

### API Endpoints

1. **Get product by slug hoặc id:**
   ```
   GET /api/product/detail/:slugOrId
   ```
   - Nếu `:slugOrId` là số → tìm theo id
   - Nếu `:slugOrId` là string → tìm theo slug

2. **Create product:**
   ```
   POST /api/product/insert
   ```
   - Có thể gửi `slug` trong body, nếu không sẽ tự động tạo từ `name`

3. **Update product:**
   ```
   PUT /api/product/update/:id
   ```
   - Có thể gửi `slug` trong body để cập nhật
   - Nếu không có slug và name thay đổi, sẽ tự động tạo slug mới

## Lưu ý

1. **Slug tự động:** Nếu không cung cấp slug khi tạo/cập nhật, hệ thống sẽ tự động tạo từ `name`
2. **Slug unique:** Slug phải là unique, nếu trùng sẽ tự động thêm số phía sau
3. **Fallback:** Nếu không có slug, frontend sẽ sử dụng id làm fallback
4. **Tiếng Việt:** Slug hỗ trợ chuyển đổi tiếng Việt có dấu thành không dấu

## Ví dụ

### Tạo sản phẩm mới:
```json
POST /api/product/insert
{
  "name": "Phòng học số 1",
  "price": "500000",
  ...
}
```
→ Slug tự động: `phong-hoc-so-1`

### Truy cập sản phẩm:
- `/phong/phong-hoc-so-1` (nếu có slug)
- `/phong/1` (fallback về id nếu không có slug)


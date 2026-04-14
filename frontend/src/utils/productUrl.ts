/**
 * Tạo URL cho product detail page
 * Ưu tiên slug, nếu không có thì dùng id
 */
export const getProductUrl = (product: { slug?: string; id?: string | number; _id?: string | number }): string => {
  const slug = product.slug;
  const id = product.id || product._id;
  
  if (slug) {
    return `/phong/${slug}`;
  }
  
  if (id) {
    return `/phong/${id}`;
  }
  
  return "/";
};


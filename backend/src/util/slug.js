/**
 * Tạo slug từ string
 * @param {string} text - Text cần chuyển thành slug
 * @returns {string} - Slug đã được format
 */
function createSlug(text) {
  if (!text) return '';
  
  return text
    .toString()
    .toLowerCase()
    .trim()
    .normalize('NFD') // Chuyển đổi ký tự có dấu thành không dấu
    .replace(/[\u0300-\u036f]/g, '') // Xóa các dấu phụ
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .replace(/[^a-z0-9\s-]/g, '') // Xóa các ký tự đặc biệt
    .replace(/\s+/g, '-') // Thay khoảng trắng bằng dấu gạch ngang
    .replace(/-+/g, '-') // Xóa các dấu gạch ngang liên tiếp
    .replace(/^-+|-+$/g, ''); // Xóa dấu gạch ngang ở đầu và cuối
}

/**
 * Tạo slug unique bằng cách thêm số nếu slug đã tồn tại
 * @param {string} text - Text cần chuyển thành slug
 * @param {Function} checkExists - Function kiểm tra slug đã tồn tại chưa
 * @returns {Promise<string>} - Slug unique
 */
async function createUniqueSlug(text, checkExists) {
  let baseSlug = createSlug(text);
  let slug = baseSlug;
  let counter = 1;

  while (await checkExists(slug)) {
    slug = `${baseSlug}-${counter}`;
    counter++;
  }

  return slug;
}

module.exports = {
  createSlug,
  createUniqueSlug,
};


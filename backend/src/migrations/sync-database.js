/**
 * Script đồng bộ database với các Sequelize models.
 * - Nếu bảng chưa tồn tại -> tạo mới.
 * - Nếu bảng đã có nhưng thiếu cột -> thêm cột.
 *
 * Cách chạy:
 * ```bash
 * cd backend
 * node src/migrations/sync-database.js
 * ```
 */

const db = require("../config/db");

// Import toàn bộ models để Sequelize đăng ký định nghĩa bảng
require("../app/models/productModel");
require("../app/models/productImageModel");
require("../app/models/configModel");
require("../app/models/orderModel");
require("../app/models/sliderModel");
require("../app/models/userModel");
require("../app/models/visitsModel");
require("../app/models/redirectModel");

// eslint-disable-next-line prefer-const
(async () => {
  try {
    console.log("Đang đồng bộ database với các models...");
    // alter: true => tự động thêm cột/điều chỉnh schema nếu cần, không xóa dữ liệu
    await db.sequelize.sync({ alter: true });
    console.log("Đồng bộ database thành công!");
    process.exit(0);
  } catch (error) {
    console.error("Đồng bộ database thất bại:", error);
    process.exit(1);
  }
})();


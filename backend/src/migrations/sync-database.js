const db = require("../config/db");

require("../app/models/productModel");
require("../app/models/productImageModel");
require("../app/models/configModel");
require("../app/models/orderModel");
require("../app/models/sliderModel");
require("../app/models/userModel");
require("../app/models/visitsModel");
require("../app/models/redirectModel");
require("../app/models/blogModel");
require("../app/models/productDetailModel");
require("../app/models/fontModel");
require("../app/models/customFontModel");

(async () => {
  try {
    console.log("Đang đồng bộ database với các models...");
    await db.sequelize.sync({ alter: true });
    console.log("Đồng bộ database thành công!");
    process.exit(0);
  } catch (error) {
    console.error("Đồng bộ database thất bại:", error);
    process.exit(1);
  }
})();

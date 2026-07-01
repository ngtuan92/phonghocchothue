const db = require("../config/db");
const redis = require("../config/redis");

(async () => {
  try {
    const queryInterface = db.sequelize.getQueryInterface();
    const tableDescription = await queryInterface.describeTable("configs");

    if (!tableDescription.line_height_mobile) {
      await queryInterface.addColumn("configs", "line_height_mobile", {
        type: db.Sequelize.STRING(50),
        allowNull: true,
      });
      console.log("Added configs.line_height_mobile");
    } else {
      console.log("configs.line_height_mobile already exists");
    }

    await redis.del("configs:v2");
    process.exit(0);
  } catch (error) {
    console.error("Failed to add configs.line_height_mobile:", error);
    process.exit(1);
  }
})();

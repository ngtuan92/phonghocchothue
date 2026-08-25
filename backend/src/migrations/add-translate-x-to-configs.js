const db = require("../config/db");
const redis = require("../config/redis");

(async () => {
  try {
    const queryInterface = db.sequelize.getQueryInterface();
    const tableDescription = await queryInterface.describeTable("configs");

    if (!tableDescription.translate_x) {
      await queryInterface.addColumn("configs", "translate_x", {
        type: db.Sequelize.STRING(50),
        allowNull: true,
      });
      console.log("Added configs.translate_x");
    } else {
      console.log("configs.translate_x already exists");
    }

    if (!tableDescription.translate_x_mobile) {
      await queryInterface.addColumn("configs", "translate_x_mobile", {
        type: db.Sequelize.STRING(50),
        allowNull: true,
      });
      console.log("Added configs.translate_x_mobile");
    } else {
      console.log("configs.translate_x_mobile already exists");
    }

    await redis.del("configs:v2");
    console.log("Migration completed successfully");
    process.exit(0);
  } catch (error) {
    console.error("Failed to add translate_x columns to configs:", error);
    process.exit(1);
  }
})();

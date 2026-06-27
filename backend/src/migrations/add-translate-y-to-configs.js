const db = require("../config/db");
const redis = require("../config/redis");

(async () => {
  try {
    const queryInterface = db.sequelize.getQueryInterface();
    const tableDescription = await queryInterface.describeTable("configs");

    if (!tableDescription.translate_y) {
      await queryInterface.addColumn("configs", "translate_y", {
        type: db.Sequelize.STRING(50),
        allowNull: true,
      });
      console.log("Added configs.translate_y");
    } else {
      console.log("configs.translate_y already exists");
    }

    if (!tableDescription.translate_y_mobile) {
      await queryInterface.addColumn("configs", "translate_y_mobile", {
        type: db.Sequelize.STRING(50),
        allowNull: true,
      });
      console.log("Added configs.translate_y_mobile");
    } else {
      console.log("configs.translate_y_mobile already exists");
    }

    await redis.del("configs:v2");
    process.exit(0);
  } catch (error) {
    console.error("Failed to add translate_y columns to configs:", error);
    process.exit(1);
  }
})();

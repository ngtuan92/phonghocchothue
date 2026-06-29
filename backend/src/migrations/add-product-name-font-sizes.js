const db = require("../config/db");
const redis = require("../config/redis");

(async () => {
  try {
    const queryInterface = db.sequelize.getQueryInterface();
    const productsDescription = await queryInterface.describeTable("products");
    const columnsToAdd = [
      { name: "name_font_size", type: db.Sequelize.STRING(50) },
      { name: "name_font_size_mobile", type: db.Sequelize.STRING(50) },
    ];

    for (const col of columnsToAdd) {
      if (!productsDescription[col.name]) {
        await queryInterface.addColumn("products", col.name, {
          type: col.type,
          allowNull: true,
        });
        console.log(`Added products.${col.name}`);
      } else {
        console.log(`products.${col.name} already exists`);
      }
    }

    await redis.del("products:all");
    await redis.del("products:light:all");
    console.log("Product name font-size migration completed successfully!");
    process.exit(0);
  } catch (error) {
    console.error("Failed to run product name font-size migration:", error);
    process.exit(1);
  }
})();

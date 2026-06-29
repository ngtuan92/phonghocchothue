const db = require("../config/db");
const redis = require("../config/redis");

(async () => {
  try {
    const queryInterface = db.sequelize.getQueryInterface();
    const columnsToAdd = [
      { name: "font_size", type: db.Sequelize.STRING(50) },
      { name: "font_size_mobile", type: db.Sequelize.STRING(50) },
      { name: "line_height", type: db.Sequelize.STRING(50) },
      { name: "line_height_mobile", type: db.Sequelize.STRING(50) },
      { name: "translate_y", type: db.Sequelize.STRING(50) },
      { name: "translate_y_mobile", type: db.Sequelize.STRING(50) }
    ];

    // 1. Add to products table
    const productsDescription = await queryInterface.describeTable("products");
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

    // 2. Add to blogs table
    const blogsDescription = await queryInterface.describeTable("blogs");
    for (const col of columnsToAdd) {
      if (!blogsDescription[col.name]) {
        await queryInterface.addColumn("blogs", col.name, {
          type: col.type,
          allowNull: true,
        });
        console.log(`Added blogs.${col.name}`);
      } else {
        console.log(`blogs.${col.name} already exists`);
      }
    }

    // 3. Clear relevant redis caches
    await redis.del("products:all");
    await redis.del("products:light:all");
    await redis.incr("blogs:version");

    console.log("Migration completed successfully!");
    process.exit(0);
  } catch (error) {
    console.error("Failed to run migration:", error);
    process.exit(1);
  }
})();

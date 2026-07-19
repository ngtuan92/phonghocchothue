const db = require("../config/db");
const redis = require("../config/redis");

(async () => {
  try {
    const queryInterface = db.sequelize.getQueryInterface();
    const tableDescription = await queryInterface.describeTable("products");

    if (!tableDescription.position) {
      await queryInterface.addColumn("products", "position", {
        type: db.Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
      });
      console.log("Added products.position");
    } else {
      console.log("products.position already exists");
    }

    const [{ totalWithPosition }] = await db.sequelize.query(
      "SELECT COUNT(*) AS totalWithPosition FROM products WHERE position > 0",
      { type: db.Sequelize.QueryTypes.SELECT }
    );

    if (Number(totalWithPosition) > 0) {
      console.log("products.position already has ordering data, skipping backfill");
      await redis.del("products:all");
      await redis.del("products:light:all");

      const limitKeys = await redis.keys("products:limit:*");
      if (limitKeys.length > 0) await redis.del(limitKeys);

      const lightKeys = await redis.keys("products:light:*");
      if (lightKeys.length > 0) await redis.del(lightKeys);

      process.exit(0);
    }

    const products = await db.sequelize.query(
      "SELECT id FROM products ORDER BY id DESC",
      { type: db.Sequelize.QueryTypes.SELECT }
    );

    for (let index = 0; index < products.length; index += 1) {
      await db.sequelize.query(
        "UPDATE products SET position = :position WHERE id = :id",
        {
          replacements: {
            id: products[index].id,
            position: index + 1,
          },
        }
      );
    }

    await redis.del("products:all");
    await redis.del("products:light:all");

    const limitKeys = await redis.keys("products:limit:*");
    if (limitKeys.length > 0) await redis.del(limitKeys);

    const lightKeys = await redis.keys("products:light:*");
    if (lightKeys.length > 0) await redis.del(lightKeys);

    console.log("Product position migration completed successfully!");
    process.exit(0);
  } catch (error) {
    console.error("Failed to run product position migration:", error);
    process.exit(1);
  }
})();

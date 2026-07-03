const db = require("../config/db");
const redis = require("../config/redis");

(async () => {
  try {
    const queryInterface = db.sequelize.getQueryInterface();
    const blogsDescription = await queryInterface.describeTable("blogs");
    const columnsToAdd = [
      { name: "excerpt_line_height", type: db.Sequelize.STRING(50) },
      { name: "excerpt_line_height_mobile", type: db.Sequelize.STRING(50) },
      { name: "excerpt_translate_y", type: db.Sequelize.STRING(50) },
      { name: "excerpt_translate_y_mobile", type: db.Sequelize.STRING(50) },
    ];

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

    await redis.incr("blogs:version");
    console.log("Blog excerpt controls migration completed successfully!");
    process.exit(0);
  } catch (error) {
    console.error("Failed to run blog excerpt controls migration:", error);
    process.exit(1);
  }
})();

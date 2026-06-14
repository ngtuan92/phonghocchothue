const db = require("../config/db");
const ConfigModel = require("../app/models/configModel");
const redis = require("../config/redis");

(async () => {
  try {
    console.log("Starting DB Config Migration to Rich Text...");

    const targetKeys = ["nurseryTitle", "nameBrand", "address", "phone"];

    for (const key of targetKeys) {
      const config = await ConfigModel.findOne({ where: { key } });
      if (config) {
        console.log(`Updating key "${key}":`);
        console.log(`  Before: type="${config.type}", content="${config.content}"`);

        let newContent = config.content || "";
        if (newContent && !newContent.trim().startsWith("<")) {
          newContent = `<p>${newContent}</p>`;
        }

        await config.update({
          type: "richtext",
          content: newContent
        });

        console.log(`  After:  type="richtext", content="${newContent}"`);
      } else {
        console.log(`Key "${key}" not found in database.`);
      }
    }

    // Clear Redis Cache
    console.log("Clearing Redis Cache...");
    await redis.del("configs:v2");

    console.log("DB Config Migration completed successfully!");
    process.exit(0);
  } catch (error) {
    console.error("DB Config Migration failed:", error);
    process.exit(1);
  }
})();

const db = require("../config/db");
const ConfigModel = require("../app/models/configModel");
const redis = require("../config/redis");

(async () => {
  try {
    console.log("Starting DB Config Update for textBtnNotication...");

    const btnNoti = await ConfigModel.findOne({ where: { key: "textBtnNotication" } });
    if (btnNoti) {
      console.log(`Updating key "textBtnNotication" to richtext:`);
      console.log(`  Before: type="${btnNoti.type}", content="${btnNoti.content}"`);

      let newContent = btnNoti.content || "";
      if (newContent && !newContent.trim().startsWith("<")) {
        newContent = `<p>${newContent}</p>`;
      }

      await btnNoti.update({
        type: "richtext",
        content: newContent
      });

      console.log(`  After:  type="richtext", content="${newContent}"`);
    } else {
      console.log(`Key "textBtnNotication" not found in database.`);
    }

    // Clear Redis Cache
    console.log("Clearing Redis Cache...");
    await redis.del("configs:v2");

    console.log("DB Config Update completed successfully!");
    process.exit(0);
  } catch (error) {
    console.error("DB Config Update failed:", error);
    process.exit(1);
  }
})();

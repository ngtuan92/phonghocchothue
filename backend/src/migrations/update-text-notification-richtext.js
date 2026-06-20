const db = require("../config/db");
const ConfigModel = require("../app/models/configModel");
const redis = require("../config/redis");

(async () => {
  try {
    console.log("Starting DB Config Update for textNotication...");

    // 1. Update textNotication type to richtext
    const textNoti = await ConfigModel.findOne({ where: { key: "textNotication" } });
    if (textNoti) {
      console.log(`Updating key "textNotication":`);
      console.log(`  Before: type="${textNoti.type}", content="${textNoti.content}"`);

      let newContent = textNoti.content || "";
      if (newContent && !newContent.trim().startsWith("<")) {
        newContent = `<p>${newContent}</p>`;
      }

      await textNoti.update({
        type: "richtext",
        content: newContent
      });

      console.log(`  After:  type="richtext", content="${newContent}"`);
    } else {
      console.log(`Key "textNotication" not found in database.`);
    }

    // 2. Create textBtnNotication config if it doesn't exist
    const btnNoti = await ConfigModel.findOne({ where: { key: "textBtnNotication" } });
    if (!btnNoti) {
      console.log(`Creating key "textBtnNotication"...`);
      await ConfigModel.create({
        key: "textBtnNotication",
        type: "text",
        content: "Go",
        section: "general"
      });
      console.log(`Key "textBtnNotication" created successfully.`);
    } else {
      console.log(`Key "textBtnNotication" already exists with content: "${btnNoti.content}"`);
    }

    // 3. Clear Redis Cache
    console.log("Clearing Redis Cache...");
    await redis.del("configs:v2");

    console.log("DB Config Update completed successfully!");
    process.exit(0);
  } catch (error) {
    console.error("DB Config Update failed:", error);
    process.exit(1);
  }
})();

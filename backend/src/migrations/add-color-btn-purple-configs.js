const db = require("../config/db");
const ConfigModel = require("../app/models/configModel");
const redis = require("../config/redis");

(async () => {
  try {
    console.log("Starting DB Config Migration for color-btn-purple and color-btn-purple-hover...");

    // 1. Add color-btn-purple if not exists
    const [colorBtnPurple, createdBtn] = await ConfigModel.findOrCreate({
      where: { key: "color-btn-purple" },
      defaults: {
        key: "color-btn-purple",
        type: "color",
        section: "general",
        content: "#563c39"
      }
    });

    if (createdBtn) {
      console.log("Created config record for key: color-btn-purple");
    } else {
      console.log("config record for key: color-btn-purple already exists");
    }

    // 2. Add color-btn-purple-hover if not exists
    const [colorBtnPurpleHover, createdHover] = await ConfigModel.findOrCreate({
      where: { key: "color-btn-purple-hover" },
      defaults: {
        key: "color-btn-purple-hover",
        type: "color",
        section: "general",
        content: "#e57f7f"
      }
    });

    if (createdHover) {
      console.log("Created config record for key: color-btn-purple-hover");
    } else {
      console.log("config record for key: color-btn-purple-hover already exists");
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

const db = require("../config/db");
const ConfigModel = require("../app/models/configModel");
const redis = require("../config/redis");

(async () => {
  try {
    const [config, created] = await ConfigModel.findOrCreate({
      where: { key: "footer-contact-title" },
      defaults: {
        key: "footer-contact-title",
        type: "richtext",
        section: "general",
        content: "<p>LIÊN HỆ</p>",
      },
    });

    if (!created && config.type !== "richtext") {
      await config.update({ type: "richtext", section: config.section || "general" });
    }

    await redis.del("configs:v2");
    console.log(created ? "Created footer-contact-title config" : "footer-contact-title config already exists");
    process.exit(0);
  } catch (error) {
    console.error("Failed to add footer-contact-title config:", error);
    process.exit(1);
  }
})();

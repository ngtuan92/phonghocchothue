const fs = require("fs");
const path = require("path");
const ConfigModel = require("../app/models/configModel");
const redis = require("../config/redis");

const configs = [
  {
    key: "room-slider-prev-image",
    source: "pre-new.jpg",
    target: "room-slider-prev-default.jpg",
  },
  {
    key: "room-slider-next-image",
    source: "next-new.jpg",
    target: "room-slider-next-default.jpg",
  },
];

(async () => {
  try {
    const sourceDirectory = path.resolve(__dirname, "../../../frontend/public/assets/images");
    const targetDirectory = path.resolve(__dirname, "../../public/assets/images/configs");
    fs.mkdirSync(targetDirectory, { recursive: true });

    for (const config of configs) {
      const sourcePath = path.join(sourceDirectory, config.source);
      const targetPath = path.join(targetDirectory, config.target);
      const content = path.posix.join("assets", "images", "configs", config.target);

      if (!fs.existsSync(targetPath)) {
        fs.copyFileSync(sourcePath, targetPath);
      }

      await ConfigModel.findOrCreate({
        where: { key: config.key },
        defaults: {
          key: config.key,
          type: "image",
          section: "services",
          content,
          borderRadius: "50%",
        },
      });
    }

    await redis.del("configs:v2");
    console.log("Room slider navigation image configs are ready.");
    process.exit(0);
  } catch (error) {
    console.error("Failed to create room slider navigation image configs:", error);
    process.exit(1);
  }
})();

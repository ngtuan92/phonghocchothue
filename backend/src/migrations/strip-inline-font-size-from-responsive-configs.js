const db = require("../config/db");
const ConfigModel = require("../app/models/configModel");
const redis = require("../config/redis");

function stripFontSizeStyle(styleContent) {
  return styleContent
    .split(";")
    .map((part) => part.trim())
    .filter((part) => {
      if (!part) return false;
      const lower = part.toLowerCase();
      return !lower.startsWith("font-size") && !lower.startsWith("--fs");
    })
    .join("; ");
}

function stripFontSizeFromHtml(html) {
  if (!html) return html;

  return String(html).replace(/\sstyle=(['"])(.*?)\1/gis, (_match, quote, styleContent) => {
    const cleaned = stripFontSizeStyle(styleContent);
    return cleaned ? ` style=${quote}${cleaned}${quote}` : "";
  });
}

function stripFontSizeFromFaqList(content) {
  let faqList;

  try {
    faqList = typeof content === "string" ? JSON.parse(content) : content;
  } catch (error) {
    console.warn("Could not parse faq_list content as JSON. Skipping nested FAQ cleanup.");
    return content;
  }

  if (!Array.isArray(faqList)) return content;

  let changed = false;
  const cleanedFaqList = faqList.map((item) => {
    if (!item || typeof item !== "object") return item;

    const nextItem = { ...item };

    for (const field of ["question", "answer"]) {
      if (typeof nextItem[field] !== "string") continue;

      const cleaned = stripFontSizeFromHtml(nextItem[field]);
      if (cleaned !== nextItem[field]) {
        nextItem[field] = cleaned;
        changed = true;
      }
    }

    return nextItem;
  });

  return changed ? JSON.stringify(cleanedFaqList) : content;
}

(async () => {
  try {
    console.log("Removing inline font-size from config content...");

    const configs = await ConfigModel.findAll({
      attributes: ["id", "key", "content"],
      where: {
        [db.Sequelize.Op.or]: [
          { content: { [db.Sequelize.Op.like]: "%font-size%" } },
          { content: { [db.Sequelize.Op.like]: "%--fs%" } },
        ],
      },
      order: [["id", "ASC"]],
    });

    let updated = 0;

    for (const config of configs) {
      const before = config.content || "";
      const after = config.key === "faq_list"
        ? stripFontSizeFromFaqList(before)
        : stripFontSizeFromHtml(before);

      if (before === after) continue;

      await config.update({ content: after });
      updated += 1;
      console.log(`Updated config key="${config.key}"`);
    }

    await redis.del("configs:v2");

    console.log(`Done. Updated ${updated} config(s).`);
    process.exit(0);
  } catch (error) {
    console.error("Failed to remove inline font-size from configs:", error);
    process.exit(1);
  }
})();

const db = require("../config/db");
const redis = require("../config/redis");

const MATCH_TRANSLATE_STYLE =
  "vertical-align:[[:space:]]*-?[0-9]+px|--translate-y:[[:space:]]*-?[0-9]+px|--translate-y-mobile:[[:space:]]*-?[0-9]+px";

(async () => {
  const transaction = await db.sequelize.transaction();

  try {
    const [beforeRows] = await db.sequelize.query(
      `
        SELECT \`key\`, translate_y, translate_y_mobile, content
        FROM configs
        WHERE content REGEXP :matchTranslateStyle
        ORDER BY id
      `,
      {
        replacements: { matchTranslateStyle: MATCH_TRANSLATE_STYLE },
        transaction,
      }
    );

    console.log("BEFORE sync:");
    console.table(beforeRows);

    await db.sequelize.query(
      `
        UPDATE configs
        SET
          translate_y = REGEXP_REPLACE(
            REGEXP_SUBSTR(content, 'vertical-align:[[:space:]]*-?[0-9]+px'),
            'vertical-align:[[:space:]]*|px',
            ''
          ),
          updatedAt = NOW()
        WHERE content REGEXP 'vertical-align:[[:space:]]*-?[0-9]+px'
      `,
      { transaction }
    );

    await db.sequelize.query(
      `
        UPDATE configs
        SET
          translate_y = REGEXP_REPLACE(
            REGEXP_SUBSTR(content, '--translate-y:[[:space:]]*-?[0-9]+px'),
            '--translate-y:[[:space:]]*|px',
            ''
          ),
          updatedAt = NOW()
        WHERE content REGEXP '--translate-y:[[:space:]]*-?[0-9]+px'
      `,
      { transaction }
    );

    await db.sequelize.query(
      `
        UPDATE configs
        SET
          translate_y_mobile = REGEXP_REPLACE(
            REGEXP_SUBSTR(content, '--translate-y-mobile:[[:space:]]*-?[0-9]+px'),
            '--translate-y-mobile:[[:space:]]*|px',
            ''
          ),
          updatedAt = NOW()
        WHERE content REGEXP '--translate-y-mobile:[[:space:]]*-?[0-9]+px'
      `,
      { transaction }
    );

    const [afterRows] = await db.sequelize.query(
      `
        SELECT \`key\`, translate_y, translate_y_mobile, content
        FROM configs
        WHERE content REGEXP :matchTranslateStyle
        ORDER BY id
      `,
      {
        replacements: { matchTranslateStyle: MATCH_TRANSLATE_STYLE },
        transaction,
      }
    );

    console.log("AFTER sync:");
    console.table(afterRows);

    await transaction.commit();
    await redis.del("configs:v2");
    console.log("Synced config translate values from inline content and cleared configs:v2 cache.");
    process.exit(0);
  } catch (error) {
    await transaction.rollback();
    console.error("Failed to sync config translate values:", error);
    process.exit(1);
  }
})();

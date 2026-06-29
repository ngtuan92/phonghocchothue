const { execSync } = require("child_process");
const path = require("path");
const fs = require("fs");

const migrationFiles = [
  "sync-database.js",
  "add-font-size-mobile-to-configs.js",
  "add-translate-y-to-configs.js",
  "add-slug-to-products.js",
  "add-color-btn-purple-configs.js",
  "change-keys-to-richtext.js",
  "update-text-notification-richtext.js",
  "update-button-notification-richtext.js",
  "update-email-richtext.js",
  "update-local-seo-configs.js",
  "update-products-and-configs-seo.js",
  "add-responsive-settings-to-products-and-blogs.js"
];

console.log("=== BẮT ĐẦU CHẠY TẤT CẢ CÁC MIGRATIONS ===");

for (const file of migrationFiles) {
  const filePath = path.join(__dirname, file);
  if (!fs.existsSync(filePath)) {
    console.warn(`[WARNING] Không tìm thấy file migration: ${file}`);
    continue;
  }

  console.log(`\n--------------------------------------`);
  console.log(`[RUNNING] Node: ${file}...`);
  try {
    // Chạy script migration dưới dạng child process để hàm process.exit() của nó không làm dừng script tổng này
    execSync(`node "${filePath}"`, { stdio: "inherit" });
    console.log(`[SUCCESS] Hoàn thành: ${file}`);
  } catch (error) {
    console.error(`[ERROR] Thất bại khi chạy: ${file}`);
    console.error(error.message);
    process.exit(1);
  }
}

console.log("\n======================================");
console.log("=== TẤT CẢ MIGRATIONS ĐÃ HOÀN THÀNH THÀNH CÔNG ===");

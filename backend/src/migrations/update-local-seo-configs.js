const db = require("../config/db");
const ConfigModel = require("../app/models/configModel");
const redis = require("../config/redis");

const cleanForSearch = (val) => {
  if (!val) return "";
  return val
    .replace(/&nbsp;/gi, " ")
    .replace(/<[^>]*>/g, "")
    .toLowerCase();
};

(async () => {
  try {
    console.log("Starting DB Local SEO Migration...");

    // 1. Update address
    const addressConfig = await ConfigModel.findOne({ where: { key: 'address' } });
    if (addressConfig) {
      console.log(`Updating address config:`);
      console.log(`  Before: ${addressConfig.content}`);
      const newAddress = "54 Lê Đình Lý, Phường Thạc Gián, Quận Thanh Khê, Đà Nẵng";
      console.log(`  After:  ${newAddress}`);
      await addressConfig.update({ content: newAddress });
    }

    // 2. Update nameBrand
    const nameBrandConfig = await ConfigModel.findOne({ where: { key: 'nameBrand' } });
    if (nameBrandConfig) {
      console.log(`Updating nameBrand config:`);
      console.log(`  Before: ${nameBrandConfig.content}`);
      const newNameBrand = "Hoa Học Trò";
      console.log(`  After:  ${newNameBrand}`);
      await nameBrandConfig.update({ content: newNameBrand });
    }

    // 3. Update faq_list
    const faqListConfig = await ConfigModel.findOne({ where: { key: 'faq_list' } });
    if (faqListConfig && faqListConfig.content) {
      console.log(`Updating faq_list config...`);
      let faqList = [];
      try {
        faqList = JSON.parse(faqListConfig.content);
      } catch (e) {
        if (Array.isArray(faqListConfig.content)) {
          faqList = faqListConfig.content;
        }
      }
      
      if (Array.isArray(faqList)) {
        // Find the question about bases
        const baseFaqIndex = faqList.findIndex(item => {
          const cleanedQ = cleanForSearch(item.question);
          return cleanedQ.includes("cơ sở") || cleanedQ.includes("co so");
        });
        
        if (baseFaqIndex !== -1) {
          console.log(`  Found target FAQ at index ${baseFaqIndex}: ${faqList[baseFaqIndex].question}`);
          faqList[baseFaqIndex] = {
            question: "<p>Hoa&nbsp;Học&nbsp;Trò&nbsp;có&nbsp;cơ&nbsp;sở&nbsp;ở&nbsp;đâu&nbsp;tại&nbsp;Đà&nbsp;Nẵng?</p>",
            answer: "<p>Hiện&nbsp;tại,&nbsp;Hoa&nbsp;Học&nbsp;Trò&nbsp;có&nbsp;cơ&nbsp;sở&nbsp;cho&nbsp;thuê&nbsp;phòng&nbsp;dạy&nbsp;học&nbsp;tại&nbsp;Đà&nbsp;Nẵng&nbsp;tại&nbsp;địa&nbsp;chỉ&nbsp;54&nbsp;Lê&nbsp;Đình&nbsp;Lý,&nbsp;quận&nbsp;Thanh&nbsp;Khê.&nbsp;Địa&nbsp;điểm&nbsp;nằm&nbsp;ở&nbsp;vị&nbsp;trí&nbsp;trung&nbsp;tâm&nbsp;thành&nbsp;phố,&nbsp;rất&nbsp;thuận&nbsp;tiện&nbsp;cho&nbsp;giáo&nbsp;viên&nbsp;và&nbsp;học&nbsp;viên&nbsp;di&nbsp;chuyển.</p>"
          };
          await faqListConfig.update({ content: JSON.stringify(faqList) });
          console.log(`  FAQ updated successfully.`);
        } else {
          console.log(`  Target FAQ not found.`);
        }
      }
    }

    // 4. Clear cache
    console.log("Clearing Redis Cache...");
    await redis.del('configs:v2');

    console.log("DB Local SEO Migration completed successfully!");
    process.exit(0);
  } catch (error) {
    console.error("DB Local SEO Migration failed:", error);
    process.exit(1);
  }
})();

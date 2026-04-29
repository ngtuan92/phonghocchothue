
const { sequelize } = require('./src/config/db/index');
const { DataTypes } = require('sequelize');

async function checkDB() {
    try {
        const [results] = await sequelize.query("SELECT * FROM sliders");
        console.log("Current sliders in DB:", JSON.stringify(results, null, 2));
        process.exit(0);
    } catch (error) {
        console.error("Error checking DB:", error);
        process.exit(1);
    }
}

checkDB();

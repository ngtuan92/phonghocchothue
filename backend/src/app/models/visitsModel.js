const { DataTypes } = require("sequelize");
const db = require("../../config/db");

const VisitsModel = db.sequelize.define("visits", {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    ip_address: { type: DataTypes.STRING, allowNull: false }, 
    user_agent: { type: DataTypes.TEXT, allowNull: true },
    visit_time: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }, 
}, {
    timestamps: false,
});

module.exports = VisitsModel;

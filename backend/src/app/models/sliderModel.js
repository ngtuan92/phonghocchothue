const db = require('../../config/db');
const {DataTypes} = require("sequelize");

const SliderModel = db.sequelize.define("sliders", {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    name: { type: DataTypes.STRING, maxLength: 255 },
    image: { type: DataTypes.STRING, maxLength: 255 },
}, {
    timestamps: true,
});

module.exports = SliderModel
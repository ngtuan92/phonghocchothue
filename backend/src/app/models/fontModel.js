const db = require('../../config/db');
const { DataTypes } = require("sequelize");

const FontModel = db.sequelize.define("fonts", {
    id: { 
        type: DataTypes.INTEGER, 
        primaryKey: true, 
        autoIncrement: true 
    },
    name: { 
        type: DataTypes.STRING(100), 
        allowNull: false 
    },
    url: { 
        type: DataTypes.STRING(500), 
        allowNull: false 
    }
}, {
    timestamps: true,
});

module.exports = FontModel;

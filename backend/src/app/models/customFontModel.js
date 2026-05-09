const db = require('../../config/db');
const { DataTypes } = require("sequelize");

const CustomFontModel = db.sequelize.define("custom_fonts", {
    id: { 
        type: DataTypes.INTEGER.UNSIGNED, 
        primaryKey: true, 
        autoIncrement: true 
    },
    display_name: { 
        type: DataTypes.STRING(100), 
        allowNull: false 
    },
    font_family: { 
        type: DataTypes.STRING(100), 
        allowNull: false,
        unique: true
    },
    file_name: { 
        type: DataTypes.STRING(255), 
        allowNull: false 
    },
    file_url: { 
        type: DataTypes.STRING(500), 
        allowNull: false 
    },
    file_type: { 
        type: DataTypes.ENUM('ttf', 'woff', 'woff2', 'otf'), 
        allowNull: false 
    },
    file_size_kb: { 
        type: DataTypes.INTEGER.UNSIGNED, 
        allowNull: false 
    },
    status: { 
        type: DataTypes.ENUM('active', 'inactive'), 
        defaultValue: 'active' 
    }
}, {
    timestamps: true,
    tableName: 'custom_fonts'
});

module.exports = CustomFontModel;

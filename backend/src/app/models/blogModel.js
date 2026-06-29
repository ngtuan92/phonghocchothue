const db = require('../../config/db');
const { DataTypes } = require("sequelize");

const BlogModel = db.sequelize.define("blogs", {
    id: { 
        type: DataTypes.INTEGER, 
        primaryKey: true, 
        autoIncrement: true 
    },
    title: { 
        type: DataTypes.STRING(255), 
        allowNull: false 
    },
    slug: { 
        type: DataTypes.STRING(255), 
        unique: true, 
        allowNull: false 
    },
    excerpt: { 
        type: DataTypes.TEXT, 
        allowNull: true 
    },
    content: { 
        type: DataTypes.TEXT('long'),
        allowNull: false 
    },
    thumbnail: { 
        type: DataTypes.STRING(255), 
        allowNull: true 
    },
    category: { 
        type: DataTypes.STRING(100), 
        defaultValue: 'kien-thuc' 
    },
    authorName: { 
        type: DataTypes.STRING(100), 
        defaultValue: 'Hoa Học Trò' 
    },
    authorAvatar: { 
        type: DataTypes.STRING(255), 
        allowNull: true 
    },
    status: { 
        type: DataTypes.INTEGER, 
        defaultValue: 1
    },
    publishedAt: { 
        type: DataTypes.DATE, 
        defaultValue: DataTypes.NOW 
    },
    lineHeight: { type: DataTypes.STRING(50), field: 'line_height', allowNull: true },
    lineHeightMobile: { type: DataTypes.STRING(50), field: 'line_height_mobile', allowNull: true },
    fontSize: { type: DataTypes.STRING(50), field: 'font_size', allowNull: true },
    fontSizeMobile: { type: DataTypes.STRING(50), field: 'font_size_mobile', allowNull: true },
    translateY: { type: DataTypes.STRING(50), field: 'translate_y', allowNull: true },
    translateYMobile: { type: DataTypes.STRING(50), field: 'translate_y_mobile', allowNull: true }
}, {
    timestamps: true,
});

module.exports = BlogModel;

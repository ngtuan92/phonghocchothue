const FontModel = require('../models/fontModel');
const CustomFontModel = require('../models/customFontModel');
const path = require('path');
const fs = require('fs');
const { createSlug } = require('../../util/slug');
const { clearSystemCache } = require('../../util/cacheUtil');

const fontController = {
    getFonts: async (req, res) => {
        try {
            const fonts = await FontModel.findAll({
                order: [['createdAt', 'DESC']]
            });
            res.status(200).json(fonts);
        } catch (error) {
            console.error('Error getting fonts:', error);
            res.status(500).json({ message: "Internal server error" });
        }
    },

    addFont: async (req, res) => {
        try {
            const { name, url } = req.body;
            if (!name || !url) {
                return res.status(400).json({ message: "Name and URL are required" });
            }

            const newFont = await FontModel.create({
                name,
                url
            });

            res.status(201).json({
                message: "Font created successfully",
                font: newFont
            });
        } catch (error) {
            console.error('Error creating font:', error);
            res.status(500).json({ message: "Internal server error" });
        }
    },

    deleteFont: async (req, res) => {
        try {
            const { id } = req.params;
            const font = await FontModel.findByPk(id);
            if (!font) {
                return res.status(404).json({ message: "Font not found" });
            }
            await font.destroy();
            res.status(200).json({ message: "Font deleted successfully" });
        } catch (error) {
            console.error('Error deleting font:', error);
            res.status(500).json({ message: "Internal server error" });
        }
    },

    // --- Local Font Methods ---

    uploadLocalFont: async (req, res) => {
        try {
            if (!req.files || !req.files.file) {
                return res.status(400).json({ message: "No file uploaded" });
            }

            const { display_name, font_family: custom_family } = req.body;
            if (!display_name) {
                return res.status(400).json({ message: "Display name is required" });
            }

            const file = req.files.file;
            const ext = path.extname(file.name).toLowerCase().replace('.', '');
            const allowedExts = ['ttf', 'woff', 'woff2', 'otf'];

            if (!allowedExts.includes(ext)) {
                return res.status(400).json({ message: "Invalid file format. Allowed: .ttf, .woff, .woff2" });
            }

            // Max size 5MB
            if (file.size > 5 * 1024 * 1024) {
                return res.status(400).json({ message: "File size exceeds 5MB limit" });
            }

            const fontFamily = custom_family ? createSlug(custom_family) : createSlug(display_name);
            const fileName = `${Date.now()}_${fontFamily}.${ext}`;
            const uploadDir = path.join(__dirname, '../../../public/uploads/fonts');

            if (!fs.existsSync(uploadDir)) {
                fs.mkdirSync(uploadDir, { recursive: true });
            }

            const filePath = path.join(uploadDir, fileName);
            const fileUrl = `/uploads/fonts/${fileName}`;

            await file.mv(filePath);

            const newCustomFont = await CustomFontModel.create({
                display_name,
                font_family: fontFamily,
                file_name: fileName,
                file_url: fileUrl,
                file_type: ext,
                file_size_kb: Math.round(file.size / 1024),
                status: 'active'
            });

            await clearSystemCache();

            res.status(201).json({
                message: "Local font uploaded successfully",
                data: newCustomFont
            });
        } catch (error) {
            console.error('Error uploading local font:', error);
            res.status(500).json({ message: error.message || "Internal server error" });
        }
    },

    getAllLocalFonts: async (req, res) => {
        try {
            const fonts = await CustomFontModel.findAll({
                order: [['createdAt', 'DESC']]
            });
            res.status(200).json({
                success: true,
                data: fonts
            });
        } catch (error) {
            console.error('Error getting local fonts:', error);
            res.status(500).json({ message: "Internal server error" });
        }
    },

    deleteLocalFont: async (req, res) => {
        try {
            const { id } = req.params;
            const font = await CustomFontModel.findByPk(id);
            
            if (!font) {
                return res.status(404).json({ message: "Font not found" });
            }

            // Xóa file vật lý
            const filePath = path.join(__dirname, '../../../public', font.file_url);
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }

            // Xóa record DB
            await font.destroy();

            // Clear cache
            await clearSystemCache();

            res.status(200).json({
                success: true,
                message: "Local font deleted successfully"
            });
        } catch (error) {
            console.error('Error deleting local font:', error);
            res.status(500).json({ message: "Internal server error" });
        }
    },
    updateLocalFont: async (req, res) => {
        try {
            const { id } = req.params;
            const { display_name } = req.body;
            const newFile = req.files ? req.files.file : null;

            const font = await CustomFontModel.findByPk(id);
            if (!font) {
                return res.status(404).json({ message: "Font not found" });
            }

            let updateData = {};
            if (display_name) updateData.display_name = display_name;

            if (newFile) {
                const ext = path.extname(newFile.name).toLowerCase().replace('.', '');
                const allowedExts = ['ttf', 'woff', 'woff2', 'otf'];

                if (!allowedExts.includes(ext)) {
                    return res.status(400).json({ message: "Invalid file format. Allowed: .ttf, .woff, .woff2" });
                }

                if (newFile.size > 5 * 1024 * 1024) {
                    return res.status(400).json({ message: "File size exceeds 5MB limit" });
                }

                const oldPath = path.join(__dirname, '../../../public', font.file_url);
                if (fs.existsSync(oldPath)) {
                    fs.unlinkSync(oldPath);
                }

                const fileName = `${Date.now()}_${font.font_family}.${ext}`;
                const uploadDir = path.join(__dirname, '../../../public/uploads/fonts');
                const filePath = path.join(uploadDir, fileName);
                const fileUrl = `/uploads/fonts/${fileName}`;

                await newFile.mv(filePath);

                updateData.file_name = fileName;
                updateData.file_url = fileUrl;
                updateData.file_type = ext;
                updateData.file_size_kb = Math.round(newFile.size / 1024);
            }

            await font.update(updateData);

            await clearSystemCache();

            res.status(200).json({
                success: true,
                message: "Local font updated successfully",
                data: font
            });
        } catch (error) {
            console.error('Error updating local font:', error);
            res.status(500).json({ message: "Internal server error" });
        }
    }
};

module.exports = fontController;

const FontModel = require('../models/fontModel');

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
    }
};

module.exports = fontController;

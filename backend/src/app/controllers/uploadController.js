const { uploadFile } = require('../../util/upload-file');
const path = require('path');
require('dotenv').config();

const uploadImage = async (req, res) => {
    try {
        const uploadedFile = req.files.upload || req.files.file;
        if (!req.files || !uploadedFile) {
            return res.status(400).json({
                uploaded: 0,
                error: { message: 'No file uploaded' }
            });
        }

        const file = uploadedFile;
        const fileName = `${Date.now()}_${file.name}`;
        const imagePath = await uploadFile(file, 'ckeditor', fileName);

        const relativePath = imagePath.replace(/\\/g, '/').replace(/^\//, '');

        res.json({
            uploaded: 1,
            fileName: fileName,
            url: `/${relativePath}`,
            location: `/${relativePath}`
        });
    } catch (error) {
        console.error('Upload error:', error);
        res.status(500).json({
            uploaded: 0,
            error: { message: error.message || 'File upload failed' }
        });
    }
};

module.exports = {
    uploadImage
};


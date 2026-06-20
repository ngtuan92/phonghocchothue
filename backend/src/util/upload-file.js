
const path = require('path');
const fs = require('fs');

function sanitizeFileName(fileName) {
    const ext = path.extname(fileName);
    const nameWithoutExt = path.basename(fileName, ext);
    
    // Clean Vietnamese tones & unicode, spaces to hyphens
    let clean = nameWithoutExt
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/đ/g, 'd')
        .replace(/Đ/g, 'd')
        .replace(/[^a-z0-9_-]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-+|-+$/g, '');

    if (!clean) {
        clean = 'file';
    }

    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e4)}`;
    return `${clean}-${uniqueSuffix}${ext}`;
}

module.exports = {
    uploadFile: function (file, folder, fileName) {
        return new Promise((resolve, reject) => {
            const directoryPath = path.join(__dirname, '../../', 'public', 'assets', 'images', folder);

            if (!fs.existsSync(directoryPath)) {
                fs.mkdirSync(directoryPath, { recursive: true });
            }

            const uniqueName = sanitizeFileName(fileName);
            const filePath = path.join(directoryPath, uniqueName);
            file.mv(filePath, (err) => {
                if (err) {
                    reject(new Error(`File upload failed: ${err.message}`));
                } else {
                    const imagePatch = path.join('assets', 'images', folder, uniqueName);
                    resolve(imagePatch);
                }
            });
        });
    },
}

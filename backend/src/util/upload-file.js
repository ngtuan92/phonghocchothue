
const path = require('path');
const fs = require('fs');
module.exports = {
    uploadFile: function (file, folder, fileName) {
        return new Promise((resolve, reject) => {
            const directoryPath = path.join(__dirname, '../../', 'public', 'assets', 'images', folder);

            if (!fs.existsSync(directoryPath)) {
                fs.mkdirSync(directoryPath, { recursive: true });
            }

            const filePath = path.join(directoryPath, fileName);
            file.mv(filePath, (err) => {
                if (err) {
                    reject(new Error(`File upload failed: ${err.message}`));
                } else {
                    const imagePatch = path.join('assets', 'images', folder, fileName);
                    resolve(imagePatch);
                }
            });
        });
    },
    
}

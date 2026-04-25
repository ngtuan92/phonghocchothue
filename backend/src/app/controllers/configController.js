
require('dotenv').config();
const configModel = require('../models/configModel')
const { uploadFile } = require('../../util/upload-file')
const { mutipleConvertToObject } = require('../../util/convert');
const { getOrSetCache, redis } = require('../../util/cacheUtil');

class ConfigController {

    async index(req, res, next) {
        try {
            const noCache = req.query.noCache === 'true';
            
            if (noCache) {
                const configData = await configModel.findAll({
                    attributes: ['id', 'key', 'content', 'type', 'section', 'musicName'],
                });
                return res.status(200).json({
                    success: true,
                    message: 'Lấy data trực tiếp từ DB!',
                    data: mutipleConvertToObject(configData)
                });
            }

            const configJson = await getOrSetCache('configs:v2', async () => {
                const configData = await configModel.findAll({
                    attributes: ['id', 'key', 'content', 'type', 'section', 'musicName'],
                });
                return {
                    success: true,
                    message: 'Lấy data thành công!',
                    data: mutipleConvertToObject(configData)
                };
            });

            res.setHeader('Content-Type', 'application/json');
            return res.status(200).send(configJson);

        } catch (error) {
            return res.status(500).json({
                success: false,
                message: 'Lấy data thất bại!'
            })
        }
    }

    async store(req, res, next) {
        const { key, content, type, section, musicName } = req.body;
        const { content: image } = req.files || {};

        try {
            let content_new = content;
            if (type == 'image' || type === 'music') {
                if (image) {
                    content_new = await uploadFile(image, 'configs', image.name);
                }
            }

            const newConfig = await configModel.create({
                key,
                content: content_new,
                type,
                section,
                musicName
            });

            await redis.del('configs:v2');

            return res.status(201).json({
                success: true,
                message: 'Tạo mới config thành công!',
                data: newConfig
            });
        } catch (error) {
            return res.status(500).json({
                success: false,
                message: 'Tạo mới config thất bại!'
            });
        }
    }

    async update(req, res, next) {
        const { key } = req.params  
        const { content, type, section, musicName } = req.body;
        const { content: image } = req.files || {};

        try {
            const config = await configModel.findOne({
                where: { key: key }
            })

            if (!config) {
                return res.status(404).json({
                    success: false,
                    message: 'Config không tồn tại!'
                });
            }

            let content_new = content

            if (type == 'image' || type === 'music') {
                content_new = config.content;
                if (image) {
                    content_new = await uploadFile(image, 'configs', image.name);
                }
            }

            await config.update({
                content: content_new,
                type: type || config.type,
                section: section || config.section,
                musicName: musicName || config.musicName
            });

            await redis.del('configs:v2');

            return res.json({
                success: true,
                message: 'Cập nhật config thành công!',
            });

        } catch (error) {
            return res.status(500).json({
                success: false,
                message: 'Cập nhật data thất bại!'
            })
        }
    }

    async destroy(req, res, next) {
        const { key } = req.params;
        try {
            const result = await configModel.destroy({
                where: { key: key }
            });

            if (!result) {
                return res.status(404).json({
                    success: false,
                    message: 'Config không tồn tại!'
                });
            }

            await redis.del('configs:v2');

            return res.json({
                success: true,
                message: 'Xóa config thành công!'
            });
        } catch (error) {
            return res.status(500).json({
                success: false,
                message: 'Xóa data thất bại!'
            });
        }
    }

}

module.exports = new ConfigController;
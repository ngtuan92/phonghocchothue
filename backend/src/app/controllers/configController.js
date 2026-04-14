
require('dotenv').config();
const db = require('../../config/db');
const configModel = require('../models/configModel')
const { uploadFile } = require('../../util/upload-file')
const { mutipleConvertToObject } = require('../../util/convert');


class ConfigController {

    async index(req, res, next) {
        try {
            const configData = await configModel.findAll({
                attributes: ['key', 'content', 'type', 'musicName'],

            })
            const configs = mutipleConvertToObject(configData);

            return res.json({
                success: true,
                message: 'Lấy data thành công!',
                data: configs
            }, 200)

        } catch (error) {
            return res.json({
                success: false,
                message: 'Lấy data thất bại!'
            }, 500)
        }

    }

    async update(req, res, next) {
        const { key } = req.params  
        const { content, type, musicName } = req.body;
        const { content: image } = req.files || {};

        try {

            const config = await configModel.findOne({
                attributes: ['id', 'key', 'content', 'musicName'],
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
                musicName: musicName
            });

            return res.json({
                success: true,
                message: 'Cập nhật config thành công!',
            });

        } catch (error) {
            return res.json({
                success: false,
                message: 'Lấy data thất bại!'
            }, 500)
        }

    }

}

module.exports = new ConfigController;
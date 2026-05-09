
require('dotenv').config();
const db = require('../../config/db');
const sliderModel = require('../models/sliderModel')
const { mutipleConvertToObject } = require('../../util/convert');
const { uploadFile } = require('../../util/upload-file')


class SliderController {


    async index(req, res, next) {
        try {
            const { type } = req.query;
            const where = {};
            if (type) where.type = type;

            const sliderData = await sliderModel.findAll({
                attributes: ['id', 'name', 'image', 'position', 'type'],
                where: where,
                order: [['position', 'ASC'], ['createdAt', 'DESC']]
            })
            const slider = mutipleConvertToObject(sliderData);

            res.status(200).json({
                success: true,
                message: 'Lấy data thành công!',
                data: slider
            })
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Lấy data thất bại!'
            })
        }

    }

    async save(req, res) {
        try {
            const { image } = req.files || {};
            const { name, type } = req.body;

            if (!image) {
                return res.status(400).json({ success: false, message: 'Vui lòng chọn ảnh!' });
            }

            const maxPos = await sliderModel.max('position', { where: { type: type || 'gallery' } }) || 0;
            const imagePatch = await uploadFile(image, 'sliders', image.name)

            const data = await sliderModel.create({
                name: name || image.name,
                image: imagePatch,
                position: maxPos + 1,
                type: type || 'gallery'
            });

            res.json({
                success: true,
                message: 'Thêm slider thành công!',
                data: data
            });
        } catch (err) {
            res.status(500).json({
                success: false,
                message: 'Thêm slider thất bại!'
            });
        }
    }

    async edit(req, res, next) {
        const { id } = req.params

        sliderModel.findOne({
            attributes: ['id', 'name', 'image', 'position'],
            where: { id: id }
        }).then(slider => {
            if (!slider) return res.status(404).json({ success: false, message: 'Không tìm thấy' });
            res.status(200).json({
                success: true,
                message: 'Lấy data thành công!',
                data: slider.dataValues
            })
        }).catch(() => {
            res.status(500).json({
                success: false,
                message: 'Lấy data thất bại!'
            })
        })

    }

    async update(req, res) {
        try {
            const { id } = req.params;
            const { name } = req.body;
            const { image } = req.files || {};

            const slider = await sliderModel.findByPk(id);
            if (!slider) {
                return res.status(404).json({
                    success: false,
                    message: 'Slider không tồn tại!'
                });
            }

            let imagePatch = slider.image;
            if (image) {
                imagePatch = await uploadFile(image, 'sliders', image.name);
            }

            await slider.update({
                name: name || slider.name,
                image: imagePatch,
            });

            return res.json({
                success: true,
                message: 'Cập nhật slider thành công!',
                data: slider,
            });
        } catch (err) {
            return res.status(500).json({
                success: false,
                message: 'Cập nhật slider thất bại!',
            });
        }
    }

    async reorder(req, res) {
        try {
            const { orders } = req.body; // Array of {id, position}
            if (!orders || !Array.isArray(orders)) {
                return res.status(400).json({ success: false, message: 'Dữ liệu không hợp lệ' });
            }

            for (const item of orders) {
                await sliderModel.update(
                    { position: item.position },
                    { where: { id: item.id } }
                );
            }

            return res.json({
                success: true,
                message: 'Cập nhật thứ tự thành công!'
            });
        } catch (error) {
            return res.status(500).json({
                success: false,
                message: 'Cập nhật thứ tự thất bại!'
            });
        }
    }

    async delete(req, res) {
        try {
            const { id } = req.params;

            await sliderModel.destroy({
                where: { id: id },
            });

            return res.json({
                success: true,
                message: 'Xóa slider thành công!',
            });
        } catch (error) {
            return res.status(500).json({
                success: false,
                message: 'Xóa slider thất bại!',
            });
        }
    }

}

module.exports = new SliderController;

require('dotenv').config();
const db = require('../../config/db');
const sliderModel = require('../models/sliderModel')
const { mutipleConvertToObject } = require('../../util/convert');
const { uploadFile } = require('../../util/upload-file')


class SliderController {

    async index(req, res, next) {
        try {
            const sliderData = await sliderModel.findAll({
                attributes: ['id', 'name', 'image'],

            })
            const slider = mutipleConvertToObject(sliderData);

            res.json({
                success: true,
                message: 'Lấy data thành công!',
                data: slider
            }, 200)
        } catch (error) {
            res.json({
                success: false,
                message: 'Lấy data thất bại!'
            }, 500)
        }

    }

    async save(req, res) {
        const { image } = req.files || {};

        const { name} = req.body;

        const imagePatch = await uploadFile(image, 'sliders', image.name)

        sliderModel.create({
            name: name,
            image: imagePatch
        }).then((data) => {

            res.json({
                success: true,
                message: 'Thêm slider thành công!',
                data: data
            })
        }).catch(function (err) {
            res.json({
                success: false,
                message: 'Thêm slider thất bại!'
            }, 404)
        });
    }

    async edit(req, res, next) {
        const { id } = req.params

        sliderModel.findOne({
            attributes: ['id', 'name', 'image'],
            where: { id: id }
        }).then(slider => {

            res.json({
                success: true,
                message: 'Lấy data thành công!',
                data: slider.dataValues
            }, 200)
        }).catch(() => {
            res.json({
                success: false,
                message: 'Lấy data thất bại!'
            }, 500)
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
                name,
                image: imagePatch,
            });

            return res.json({
                success: true,
                message: 'Cập nhật slider thành công!',
                data: slider,
            });
        } catch (err) {

            return res.status(404).json({
                success: false,
                message: 'Cập nhật slider thất bại!',
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
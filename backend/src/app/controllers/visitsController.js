
require('dotenv').config();
const db = require('../../config/db');
const VisitsModel = require('../models/visitsModel')
const { mutipleConvertToObject } = require('../../util/convert');

class VisitsController {

    async index(req, res, next) {
        try {
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 50;
            const offset = (page - 1) * limit;

            const visitData = await VisitsModel.findAll({
                attributes: ['id', 'ip_address', 'user_agent', 'visit_time'],
                limit,
                offset,
                order: [['visit_time', 'DESC']]
            })
            const visit = mutipleConvertToObject(visitData);

            return res.json({
                success: true,
                message: 'Lấy data thành công!',
                data: visit
            }, 200)

        } catch (error) {
            return res.json({
                success: false,
                message: 'Lấy data thất bại!'
            }, 500)
        }

    }

    async recordVisit(req, res, next) {
        try {
            const ip = req.headers["x-forwarded-for"] || req.connection.remoteAddress;
            const userAgent = req.headers["user-agent"];
    
            const visit = await VisitsModel.create({
                ip_address: ip,
                user_agent: userAgent
            });
    
            return res.json({
                success: true,
                message: 'Lấy data thành công!',
                data: visit.id
            }, 200)

        } catch (error) {
            console.log(error);
            
            return res.json({
                success: false,
                message: 'Lấy data thất bại!'
            }, 500)
        }

    }

}

module.exports = new VisitsController;
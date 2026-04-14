require("dotenv").config();
const db = require("../../config/db");
const orderModel = require("../models/orderModel");
const productModel = require("../models/productModel");
const validator = require("validator");
const mail = require("../../util/sendMail");
const { mutipleConvertToObject } = require("../../util/convert");
require('dotenv').config();

class ConfigController {
  async index(req, res) {
    try {
      const orderData = await orderModel.findAll({
        attributes: [
          "id",
          "email",
          "phone",
          "full_name",
          "note",
          "student_number",
          "date",
        ],
        include: [
          {
            model: productModel,
            as: "product",
          },
        ],
      });
      const orders = mutipleConvertToObject(orderData);

      res.json(
        {
          success: true,
          message: "Lấy data thành công!",
          data: orders,
        },
        200
      );
    } catch (error) {
      res.json(
        {
          success: false,
          message: "Lấy data thất bại!",
        },
        404
      );
    }
  }

  async insert(req, res, next) {

    const EMAIL = process.env.EMAIL_SENDMAIL;
    const { email, phone, name, message, studentNum, subject, product_id } =
      req.body;
    try {
      if (!validator.isMobilePhone(phone, "vi-VN")) {
        return res.status(400).json({
          success: false,
          message: "Số điện thoại không đúng định dạng",
        });
      }

      if (!validator.isLength(name, { min: 1 })) {
        return res.status(400).json({
          success: false,
          message: "Bắt buộc nhập tên đầy đủ",
        });
      }

      if (!product_id) {
        return res.status(400).json({
          success: false,
          message: "Bắt buộc có phòng để đặt",
        });
      }

      const product = await productModel.findByPk(product_id);
      if (!product) {
        return res.status(404).json({
          success: false,
          message: "Phòng không tồn tại!",
        });
      }

      await product.update({
        status: 0,
      });

      await orderModel.create({
        email,
        phone,
        full_name: name,
        product_id,
        subject: subject,
        note: message || null,
        student_number: studentNum || 0,
      });

      let to = EMAIL
      if (email) {
        to = to + `, ${email}`;
      }

      await mail.sendMail({
        from: `"Website đặt phòng" <${EMAIL}>`,
        to: to,
        subject: "Đặt phòng",
        html: `
        <p>Họ và Tên: ${name}</p>
        <p>Số điện thoại: ${phone}</p>
        <p>Môn dạy: ${subject}</p>
        <p>Ghi chú: ${message}</p>
        <p>Số học sinh: ${studentNum}</p>
      `,
      });

      return res.json({
        success: true,
        message: "Đặt phòng thành công!",
      });

    } catch (error) {
      res.json(
        {
          success: false,
          message: "Đặt phòng thất bại!",
        },
        404
      );
    }
  }

  async delete(req, res) {
    const { id } = req.params;
    try {
      const order = await orderModel.findByPk(id);
      if (!order) {
        return res.status(404).json({
          success: false,
          message: "Đơn đặt không tồn tại!",
        });
      }

      const productId = order.product_id;
      await order.destroy();

      if (productId) {
        const product = await productModel.findByPk(productId);
        if (product) {
          await product.update({ status: 1 });
        }
      }

      return res.json({
        success: true,
        message: "Xóa đơn đặt thành công!",
      });
    } catch (error) {
      console.error("Delete order error:", error);
      return res.status(500).json({
        success: false,
        message: "Xóa đơn đặt thất bại!",
      });
    }
  }
}

module.exports = new ConfigController();

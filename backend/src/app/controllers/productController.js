const productModel = require("../models/productModel");
const { mutipleConvertToObject } = require("../../util/convert");
const productImageModel = require("../models/productImageModel");
const { Op } = require("sequelize");
const { createUniqueSlug } = require("../../util/slug");

const { uploadFile } = require("../../util/upload-file");
class ProductController {
  async index(req, res) {
    try {
      const productData = await productModel.findAll({
        attributes: [
          "id",
          "name",
          "slug",
          "content",
          "image",
          "status",
          "equipment",
          "contains",
          "description",
          "price",
          "unit",
          "capacity",
          "isSpecial",
          "seoTitle",
          "seoDescription",
          "seoKeywords",
          "seoImage",
        ],
        include: [
          {
            model: productImageModel,
            as: "images",
          },
        ],
      });
      const products = mutipleConvertToObject(productData);

      res.json(
        {
          success: true,
          data: products,
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

  async edit(req, res) {
    productModel
      .findOne({
        attributes: [
          "id",
          "name",
          "slug",
          "content",
          "image",
          "status",
          "equipment",
          "contains",
          "description",
          "price",
          "unit",
          "capacity",
          "isSpecial",
          "seoTitle",
          "seoDescription",
          "seoKeywords",
          "seoImage",
        ],
        include: [
          {
            model: productImageModel,
            as: "images",
          },
        ],
        where: { id: req.params.id },
      })
      .then((product) => {
        res.json(
          {
            success: true,
            data: product.dataValues,
          },
          200
        );
      })
      .catch(() => {
        res.json(
          {
            success: false,
            message: "Lấy data thất bại!",
          },
          404
        );
      });
  }

  async getById(req, res) {
    try {
      const { id } = req.params;
      
      // Kiểm tra xem id là số (ID) hay string (slug)
      const isNumeric = /^\d+$/.test(id);
      
      // Tạo điều kiện where: tìm theo slug nếu không phải số, hoặc theo id nếu là số
      const whereCondition = isNumeric 
        ? { id: parseInt(id) }
        : { slug: id };

      const product = await productModel.findOne({
        attributes: [
          "id",
          "name",
          "slug",
          "content",
          "image",
          "status",
          "equipment",
          "contains",
          "description",
          "price",
          "unit",
          "capacity",
          "isSpecial",
          "seoTitle",
          "seoDescription",
          "seoKeywords",
          "seoImage",
        ],
        include: [
          {
            model: productImageModel,
            as: "images",
          },
        ],
        where: whereCondition,
      });

      if (!product) {
        return res.status(404).json({
          success: false,
          message: "Không tìm thấy sản phẩm!",
        });
      }

      const productId = product.id;

      const otherProducts = await productModel.findAll({
        attributes: [
          "id",
          "name",
          "slug",
          "content",
          "image",
          "status",
          "equipment",
          "contains",
          "description",
          "price",
          "unit",
          "capacity",
          "isSpecial",
          "seoTitle",
          "seoDescription",
          "seoKeywords",
          "seoImage",
        ],
        where: {
          id: { [Op.ne]: productId },
        },
        order: [["createdAt", "DESC"]],
        limit: 4,
      });

      res.status(200).json({
        success: true,
        data: product.dataValues,
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({
        success: false,
        message: "Lấy dữ liệu thất bại!",
      });
    }
  }

  async update(req, res) {
    try {
      const { id } = req.params;
      const { name, content, description, equipment, status, price, unit, contains, isSpecial, seoTitle, seoDescription, seoKeywords, slug } = req.body;
      const { image, imageDetail, seoImage } = req.files || {};

      const image_detail = imageDetail

      const product = await productModel.findByPk(id);
            if (!product) {
                return res.status(404).json({
                    success: false,
                    message: 'Sản phẩm không tồn tại!'
                });
            }

      let imagePatch = product.image;
      if (image) {
          imagePatch = await uploadFile(image, 'products', image.name);
      }

      let seoImagePatch = product.seoImage;
      if (seoImage) {
          seoImagePatch = await uploadFile(seoImage, 'products', seoImage.name);
      }

      // Tạo slug nếu không có hoặc name thay đổi
      let productSlug = slug;
      if (!productSlug && name) {
        productSlug = await createUniqueSlug(name, async (slugToCheck) => {
          const existing = await productModel.findOne({
            where: { slug: slugToCheck, id: { [Op.ne]: id } }
          });
          return !!existing;
        });
      }

      await product.update({
        name: name,
        slug: productSlug || product.slug,
        content: content,
        description: description,
        equipment: equipment,
        price: price,
        unit: unit || product.unit,
        contains: contains,
        isSpecial: isSpecial,
        status: status,
        image: imagePatch,
        capacity: 0,
        seoTitle: seoTitle,
        seoDescription: seoDescription,
        seoKeywords: seoKeywords,
        seoImage: seoImagePatch,
      });

      if (image_detail) {
        await productImageModel.destroy({
          where: { product_id: id },
        });


        const details = Array.isArray(image_detail) ? image_detail : [image_detail];

        for (const item of details) {

          const imagePatchDetail = await uploadFile(item, 'products-detail', item.name);

          await productImageModel.create({
            product_id: id,
            image_detail: imagePatchDetail,
          });
        }

      }

      return res.json({
        success: true,
        message: 'Cập nhật sản phẩm thành công!',
        data: product,
      });
    } catch (err) {

      return res.status(400).json({
        success: false,
        message: 'Cập nhật sản phẩm thất bại!',
      });

    }
  }

  async save(req, res) {
    try {
      const { name, content, description, equipment, status, price, unit, contains, isSpecial, seoTitle, seoDescription, seoKeywords, slug } = req.body;
      const { image, imageDetail, seoImage } = req.files || {};

      const image_detail = imageDetail


      const imagePatch = await uploadFile(image, "products", image.name);

      let seoImagePatch = null;
      if (seoImage) {
        seoImagePatch = await uploadFile(seoImage, "products", seoImage.name);
      }

      // Tạo slug từ name nếu không có slug được cung cấp
      let productSlug = slug;
      if (!productSlug && name) {
        productSlug = await createUniqueSlug(name, async (slugToCheck) => {
          const existing = await productModel.findOne({
            where: { slug: slugToCheck }
          });
          return !!existing;
        });
      }

      const product = await productModel.create({
        name: name,
        slug: productSlug,
        content: content,
        description: description,
        equipment: equipment,
        price: price,
        unit: unit || "buổi",
        contains: contains,
        isSpecial: isSpecial,
        status: status,
        image: imagePatch,
        capacity: 0,
        seoTitle: seoTitle,
        seoDescription: seoDescription,
        seoKeywords: seoKeywords,
        seoImage: seoImagePatch,
      });

      if (image_detail) {
        
        const details = Array.isArray(image_detail)
          ? image_detail
          : [image_detail];

        for (const item of details) {
          const imagePatchDetail = uploadFile(
            item,
            "products-detail",
            item.name
          );
          await productImageModel.create({
            product_id: product.id,
            image_detail: imagePatchDetail,
          });
        }
        
      }

      return res.json({
        success: true,
        message: "Tạo sản phẩm thành công!",
      });
    } catch (err) {

      return res.status(400).json({
        success: false,
        message: "Tạo sản phẩm thất bại!",
      });
    }
  }

  async delete(req, res) {
    try {
      const { id } = req.params;

      await productImageModel.destroy({
        where: { product_id: id },
      });

      await productModel.destroy({
        where: { id: id },
      });

      return res.json({
        success: true,
        message: "Xóa sản phẩm thành công!",
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: "Xóa sản phẩm thất bại!",
      });
    }
  }
}

module.exports = new ProductController();

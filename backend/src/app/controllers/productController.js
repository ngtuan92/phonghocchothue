const productModel = require("../models/productModel");
const { mutipleConvertToObject } = require("../../util/convert");
const productImageModel = require("../models/productImageModel");
const { Op } = require("sequelize");
const { createUniqueSlug } = require("../../util/slug");
const { getOrSetCache, redis } = require("../../util/cacheUtil");

const { uploadFile } = require("../../util/upload-file");
class ProductController {
  async index(req, res) {
    try {
      const { limit } = req.query;
      const cacheKey = limit ? `products:limit:${limit}` : "products:all";

      const productsJson = await getOrSetCache(cacheKey, async () => {
        const productData = await productModel.findAll({
          attributes: [
            "id", "name", "name_rich", "slug", "content", "image", "status", "equipment",
            "contains", "description", "price", "unit", "capacity", "isSpecial",
            "seoTitle", "seoDescription", "seoKeywords", "seoImage",
          ],
          include: [{ model: productImageModel, as: "images" }],
          limit: limit ? parseInt(limit) : undefined,
          order: [['id', 'DESC']]
        });
        return {
          success: true,
          data: mutipleConvertToObject(productData)
        };
      });

      res.setHeader('Content-Type', 'application/json');
      res.status(200).send(productsJson);
    } catch (error) {
      res.status(404).json({ success: false, message: "Lấy data thất bại!" });
    }
  }

  async edit(req, res) {
    productModel
      .findOne({
        attributes: [
          "id",
          "name",
          "name_rich",
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
      const cacheKey = `product:detail:${id}`;

      const resultJson = await getOrSetCache(cacheKey, async () => {
        const isNumeric = /^\d+$/.test(id);
        const whereCondition = isNumeric ? { id: parseInt(id) } : { slug: id };

        const product = await productModel.findOne({
          attributes: [
            "id", "name", "name_rich", "slug", "content", "image", "status", "equipment",
            "contains", "description", "price", "unit", "capacity", "isSpecial",
            "seoTitle", "seoDescription", "seoKeywords", "seoImage",
          ],
          include: [{ model: productImageModel, as: "images" }],
          where: whereCondition,
        });

        if (!product) return null;

        const otherProducts = await productModel.findAll({
          attributes: [
            "id", "name", "name_rich", "slug", "content", "image", "status", "equipment",
            "contains", "description", "price", "unit", "capacity", "isSpecial",
            "seoTitle", "seoDescription", "seoKeywords", "seoImage",
          ],
          where: { id: { [Op.ne]: product.id } },
          order: [["id", "DESC"]],
          limit: 4,
        });

        return {
          success: true,
          data: product.dataValues,
          related: mutipleConvertToObject(otherProducts)
        };
      });

      if (!resultJson) {
        return res.status(404).json({ success: false, message: "Không tìm thấy sản phẩm!" });
      }

      res.setHeader('Content-Type', 'application/json');
      res.status(200).send(resultJson);
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Lấy dữ liệu thất bại!",
      });
    }
  }

  async update(req, res) {
    const { id } = req.params;
    try {
      const { name, name_rich, content, description, equipment, status, price, unit, contains, isSpecial, seoTitle, seoDescription, seoKeywords, slug } = req.body;
      
      const files = req.files || {};
      const { image, imageDetail, seoImage } = files;

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

      // Chỉ cập nhật những trường được gửi lên (tránh ghi đè undefined)
      const updateFields = {
        name,
        name_rich,
        slug: productSlug || product.slug,
        content,
        description,
        equipment,
        price,
        unit: unit || product.unit,
        contains,
        isSpecial,
        status,
        image: imagePatch,
        seoTitle,
        seoDescription,
        seoKeywords,
        seoImage: seoImagePatch,
      };

      Object.keys(updateFields).forEach(key => {
        if (updateFields[key] === undefined) {
          delete updateFields[key];
        }
      });

      await product.update(updateFields);

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

      // XÓA CACHE
      await redis.del("products:all");
      await redis.del(`product:detail:${id}`);
      if (product.slug) await redis.del(`product:detail:${product.slug}`);
      if (productSlug) await redis.del(`product:detail:${productSlug}`);
      
      const keys = await redis.keys("products:limit:*");
      if (keys.length > 0) await redis.del(keys);

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
      const { name, name_rich, content, description, equipment, status, price, unit, contains, isSpecial, seoTitle, seoDescription, seoKeywords, slug } = req.body;
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
        name_rich: name_rich,
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

      await redis.del("products:all");

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

      await redis.del("products:all");
      await redis.del(`product:detail:${id}`);

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

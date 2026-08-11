const productModel = require("../models/productModel");
const { mutipleConvertToObject } = require("../../util/convert");
const productImageModel = require("../models/productImageModel");
const { Op } = require("sequelize");
const { sequelize, Sequelize } = require("../../config/db");
const { createUniqueSlug } = require("../../util/slug");
const { getOrSetCache, redis } = require("../../util/cacheUtil");

const { uploadFile } = require("../../util/upload-file");

function formatProductRichName(nameRich) {
  return nameRich;
}

const productListOrder = [["position", "ASC"], ["id", "DESC"]];

async function clearProductListCache() {
  // Versioning is the source of truth. Deleting wildcard keys is only cleanup;
  // it is not reliable across Redis deployments/replicas.
  await redis.incr("products:cache-version");
  await redis.del("products:all");
  await redis.del("products:light:all");

  const keys = await redis.keys("products:limit:*");
  if (keys.length > 0) await redis.del(keys);

  const lightKeys = await redis.keys("products:light:*");
  if (lightKeys.length > 0) await redis.del(lightKeys);
}

let productRichTextColumnsReady = false;

const ensureProductRichTextColumns = async () => {
  if (productRichTextColumnsReady) return;

  const queryInterface = sequelize.getQueryInterface();
  const tableDescription = await queryInterface.describeTable("products");
  const columnsToAdd = [
    { name: "name_font_size", type: Sequelize.STRING(50) },
    { name: "name_font_size_mobile", type: Sequelize.STRING(50) },
    { name: "position", type: Sequelize.INTEGER, defaultValue: 0 },
  ];

  for (const col of columnsToAdd) {
    if (!tableDescription[col.name]) {
      await queryInterface.addColumn("products", col.name, {
        type: col.type,
        allowNull: true,
        defaultValue: col.defaultValue,
      });
    }
  }

  const richTextColumns = ["description", "equipment", "contains", "price"];
  for (const col of richTextColumns) {
    if (tableDescription[col] && tableDescription[col].type && !/text/i.test(tableDescription[col].type)) {
      await queryInterface.changeColumn("products", col, {
        type: Sequelize.TEXT,
        allowNull: true,
      });
    }
  }

  if (tableDescription.content && (!tableDescription.content.type || !/longtext/i.test(tableDescription.content.type))) {
    try {
      await queryInterface.changeColumn("products", "content", {
        type: Sequelize.TEXT('long'),
        allowNull: true,
      });
    } catch (e) {
      console.error("Error altering products.content column to LONGTEXT:", e);
    }
  }

  productRichTextColumnsReady = true;
};

class ProductController {
  async index(req, res) {
    try {
      res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
      await ensureProductRichTextColumns();
      const { limit, light } = req.query;
      const isLightList = light === "true";
      const cacheVersion = await redis.get("products:cache-version") || "1";
      const cacheKey = isLightList
        ? `products:v${cacheVersion}:light:${limit || "all"}`
        : limit ? `products:v${cacheVersion}:limit:${limit}` : `products:v${cacheVersion}:all`;

      const productsJson = await getOrSetCache(cacheKey, async () => {
        const productData = await productModel.findAll({
          attributes: isLightList
            ? ["id", "name", "slug", "image", "status", "description", "position"]
            : [
              "id", "name", "name_rich", "slug", "content", "image", "status", "equipment",
              "contains", "description", "price", "unit", "capacity", "position", "isSpecial",
              "seoTitle", "seoDescription", "seoKeywords", "seoImage",
              "lineHeight", "lineHeightMobile", "fontSize", "fontSizeMobile", "nameFontSize", "nameFontSizeMobile", "translateY", "translateYMobile",
            ],
          include: isLightList ? [] : [{ model: productImageModel, as: "images" }],
          limit: limit ? parseInt(limit) : undefined,
          order: productListOrder
        });

        const formattedProducts = mutipleConvertToObject(productData).map(p => {
          if (p.name_rich) {
            p.name_rich = formatProductRichName(p.name_rich);
          }
          return p;
        });

        return {
          success: true,
          data: formattedProducts
        };
      });

      res.setHeader('Content-Type', 'application/json');
      res.status(200).send(productsJson);
    } catch (error) {
      res.status(404).json({ success: false, message: "Lấy data thất bại!" });
    }
  }

  async edit(req, res) {
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");
    await ensureProductRichTextColumns();
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
          "position",
          "isSpecial",
          "seoTitle",
          "seoDescription",
          "seoKeywords",
          "seoImage",
          "lineHeight",
          "lineHeightMobile",
          "fontSize",
          "fontSizeMobile",
          "nameFontSize",
          "nameFontSizeMobile",
          "translateY",
          "translateYMobile",
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
      res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
      await ensureProductRichTextColumns();
      const { id } = req.params;
      const detailVersion = await redis.get("product:detail-cache-version") || "1";
      const cacheKey = `product:detail:v${detailVersion}:${id}`;

      const resultJson = await getOrSetCache(cacheKey, async () => {
        const isNumeric = /^\d+$/.test(id);
        const whereCondition = isNumeric ? { id: parseInt(id) } : { slug: id };

        const product = await productModel.findOne({
          attributes: [
            "id", "name", "name_rich", "slug", "content", "image", "status", "equipment",
            "contains", "description", "price", "unit", "capacity", "position", "isSpecial",
            "seoTitle", "seoDescription", "seoKeywords", "seoImage",
            "lineHeight", "lineHeightMobile", "fontSize", "fontSizeMobile", "nameFontSize", "nameFontSizeMobile", "translateY", "translateYMobile",
          ],
          include: [{ model: productImageModel, as: "images" }],
          where: whereCondition,
        });

        if (!product) return null;

        const otherProducts = await productModel.findAll({
          attributes: [
            "id", "name", "name_rich", "slug", "content", "image", "status", "equipment",
            "contains", "description", "price", "unit", "capacity", "position", "isSpecial",
            "seoTitle", "seoDescription", "seoKeywords", "seoImage",
            "lineHeight", "lineHeightMobile", "fontSize", "fontSizeMobile", "nameFontSize", "nameFontSizeMobile", "translateY", "translateYMobile",
          ],
          where: { id: { [Op.ne]: product.id } },
          order: productListOrder,
          limit: 4,
        });

        const formattedProduct = { ...product.dataValues };
        if (formattedProduct.name_rich) {
          formattedProduct.name_rich = formatProductRichName(formattedProduct.name_rich);
        }

        const formattedOthers = mutipleConvertToObject(otherProducts).map(p => {
          if (p.name_rich) {
            p.name_rich = formatProductRichName(p.name_rich);
          }
          return p;
        });

        return {
          success: true,
          data: formattedProduct,
          related: formattedOthers
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
      await ensureProductRichTextColumns();
      const { name, name_rich, content, description, equipment, status, price, unit, contains, isSpecial, seoTitle, seoDescription, seoKeywords, slug, lineHeight, lineHeightMobile, fontSize, fontSizeMobile, nameFontSize, nameFontSizeMobile, translateY, translateYMobile } = req.body;

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
      const previousSlug = product.slug;

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
        name_rich: name_rich !== undefined ? formatProductRichName(name_rich) : undefined,
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
        lineHeight,
        lineHeightMobile,
        fontSize,
        fontSizeMobile,
        nameFontSize,
        nameFontSizeMobile,
        translateY,
        translateYMobile,
      };

      Object.keys(updateFields).forEach(key => {
        if (updateFields[key] === undefined) {
          delete updateFields[key];
        }
      });

      await product.update(updateFields);

      if (name !== undefined) {
        let existingImages = req.body.imageDetail;
        if (existingImages) {
          if (!Array.isArray(existingImages)) {
            existingImages = [existingImages];
          }
          existingImages = existingImages.map(url => {
            if (typeof url === 'string') {
              const match = url.match(/\/assets\/images\/products-detail\/.+$/i);
              if (match) {
                return match[0].replace(/^\//, '');
              }
              return url;
            }
            return null;
          }).filter(Boolean);
        } else {
          existingImages = [];
        }

        await productImageModel.destroy({
          where: { product_id: id },
        });

        for (const imgPath of existingImages) {
          await productImageModel.create({
            product_id: id,
            image_detail: imgPath.replaceAll("\\", "/"),
          });
        }

        if (image_detail) {
          const details = Array.isArray(image_detail) ? image_detail : [image_detail];
          for (const item of details) {
            const imagePatchDetail = await uploadFile(item, 'products-detail', item.name);
            await productImageModel.create({
              product_id: id,
              image_detail: imagePatchDetail.replaceAll("\\", "/"),
            });
          }
        }
      }

      // XÓA CACHE
      await clearProductListCache();
      await redis.incr("product:detail-cache-version");
      await redis.del(`product:detail:${id}`);
      if (previousSlug) await redis.del(`product:detail:${previousSlug}`);
      if (productSlug) await redis.del(`product:detail:${productSlug}`);

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
      await ensureProductRichTextColumns();
      const { name, name_rich, content, description, equipment, status, price, unit, contains, isSpecial, seoTitle, seoDescription, seoKeywords, slug, lineHeight, lineHeightMobile, fontSize, fontSizeMobile, nameFontSize, nameFontSizeMobile, translateY, translateYMobile } = req.body;
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

      const maxPosition = await productModel.max("position") || 0;

      const product = await productModel.create({
        name: name,
        name_rich: formatProductRichName(name_rich),
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
        position: maxPosition + 1,
        seoTitle: seoTitle,
        seoDescription: seoDescription,
        seoKeywords: seoKeywords,
        seoImage: seoImagePatch,
        lineHeight,
        lineHeightMobile,
        fontSize,
        fontSizeMobile,
        nameFontSize,
        nameFontSizeMobile,
        translateY,
        translateYMobile,
      });

      if (image_detail) {

        const details = Array.isArray(image_detail)
          ? image_detail
          : [image_detail];

        for (const item of details) {
          const imagePatchDetail = await uploadFile(
            item,
            "products-detail",
            item.name
          );
          await productImageModel.create({
            product_id: product.id,
            image_detail: imagePatchDetail.replaceAll("\\", "/"),
          });
        }

      }

      await clearProductListCache();
      await redis.incr("product:detail-cache-version");

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

  async reorder(req, res) {
    try {
      const { orders } = req.body;

      if (!orders || !Array.isArray(orders)) {
        return res.status(400).json({
          success: false,
          message: "Du lieu thu tu khong hop le!",
        });
      }

      for (const item of orders) {
        if (!item.id || !Number.isInteger(Number(item.position))) {
          return res.status(400).json({
            success: false,
            message: "Du lieu thu tu khong hop le!",
          });
        }

        await productModel.update(
          { position: Number(item.position) },
          { where: { id: item.id } }
        );
      }

      await clearProductListCache();

      return res.json({
        success: true,
        message: "Cap nhat thu tu phong thanh cong!",
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: "Cap nhat thu tu phong that bai!",
      });
    }
  }

  async delete(req, res) {
    try {
      const { id } = req.params;

      const product = await productModel.findByPk(id, { attributes: ["slug"] });
      if (!product) {
        return res.status(404).json({ success: false, message: "Sản phẩm không tồn tại!" });
      }

      await productImageModel.destroy({
        where: { product_id: id },
      });

      await productModel.destroy({
        where: { id: id },
      });

      await clearProductListCache();
      await redis.incr("product:detail-cache-version");
      await redis.del(`product:detail:${id}`);
      if (product.slug) await redis.del(`product:detail:${product.slug}`);

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

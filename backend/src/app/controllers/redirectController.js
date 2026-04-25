const RedirectModel = require("../models/redirectModel");
const { getOrSetCache, redis } = require('../../util/cacheUtil');

// Lấy redirect cho middleware frontend: GET /api/redirect?path=/phong/san-pham-1
const getRedirect = async (req, res) => {
  try {
    const fromPath = req.query.path;

    if (!fromPath) {
      return res.status(400).json({
        message: 'Missing "path" query param',
      });
    }

    const cacheKey = `redirect:${fromPath}`;
    const cached = await getOrSetCache(cacheKey, async () => {
      const redirect = await RedirectModel.findOne({
        where: { fromPath, status: true },
      });
      return redirect ? { from: redirect.fromPath, to: redirect.toPath } : null;
    }, 86400);

    if (!cached) {
      return res.status(404).json({
        message: "No redirect configured for this path",
      });
    }

    const parsedResult = typeof cached === 'string' ? JSON.parse(cached) : cached;
    return res.json(parsedResult);
  } catch (error) {
    return res.status(500).json({ message: "Server error" });
  }
};

// Lấy danh sách redirect: GET /api/redirect/list
const getAllRedirects = async (req, res) => {
  try {
    const redirects = await RedirectModel.findAll({
      order: [["id", "DESC"]],
    });
    return res.json(redirects);
  } catch (error) {
    console.error("getAllRedirects error:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

// Tạo redirect mới: POST /api/redirect
const createRedirect = async (req, res) => {
  try {
    const { fromPath, toPath, status = true, note } = req.body;

    if (!fromPath || !toPath) {
      return res.status(400).json({
        message: "fromPath và toPath là bắt buộc",
      });
    }

    const existing = await RedirectModel.findOne({ where: { fromPath } });
    if (existing) {
      return res.status(400).json({
        message: "fromPath đã tồn tại",
      });
    }

    const redirect = await RedirectModel.create({
      fromPath,
      toPath,
      status,
      note,
    });

    await redis.del(`redirect:${fromPath}`);
    return res.status(201).json(redirect);
  } catch (error) {
    console.error("createRedirect error:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

// Cập nhật redirect: PUT /api/redirect/:id
const updateRedirect = async (req, res) => {
  try {
    const { id } = req.params;
    const { fromPath, toPath, status, note } = req.body;

    const redirect = await RedirectModel.findByPk(id);
    if (!redirect) {
      return res.status(404).json({ message: "Redirect not found" });
    }

    // Nếu thay đổi fromPath, cần check trùng
    if (fromPath && fromPath !== redirect.fromPath) {
      const existing = await RedirectModel.findOne({ where: { fromPath } });
      if (existing) {
        return res.status(400).json({
          message: "fromPath đã tồn tại",
        });
      }
    }

    redirect.fromPath = fromPath ?? redirect.fromPath;
    redirect.toPath = toPath ?? redirect.toPath;
    if (typeof status === "boolean") {
      redirect.status = status;
    }
    redirect.note = note ?? redirect.note;

    await redirect.save();

    await redis.del(`redirect:${redirect.fromPath}`);
    return res.json(redirect);
  } catch (error) {
    console.error("updateRedirect error:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

// Xóa redirect: DELETE /api/redirect/:id
const deleteRedirect = async (req, res) => {
  try {
    const { id } = req.params;

    const redirect = await RedirectModel.findByPk(id);
    if (!redirect) {
      return res.status(404).json({ message: "Redirect not found" });
    }

    await redirect.destroy();

    await redis.del(`redirect:${redirect.fromPath}`);
    return res.json({ message: "Deleted successfully" });
  } catch (error) {
    console.error("deleteRedirect error:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

module.exports = {
  getRedirect,
  getAllRedirects,
  createRedirect,
  updateRedirect,
  deleteRedirect,
};


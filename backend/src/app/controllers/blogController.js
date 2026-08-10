const BlogModel = require('../models/blogModel');
const { createSlug, createUniqueSlug } = require('../../util/slug');
const { redis, getOrSetCache } = require('../../util/cacheUtil');
const { sequelize, Sequelize } = require('../../config/db');
const { Op } = Sequelize;

let blogFontColumnsReady = false;

const logBlogError = (action, error, req) => {
    console.error(`[BlogController.${action}]`, {
        method: req.method,
        path: req.originalUrl,
        params: req.params,
        message: error.message,
        stack: error.stack,
    });
};

const ensureBlogFontColumns = async () => {
    if (blogFontColumnsReady) return;

    const queryInterface = sequelize.getQueryInterface();
    const tableDescription = await queryInterface.describeTable("blogs");
    const columnsToAdd = [
        { name: "title_font_size", type: Sequelize.STRING(50) },
        { name: "title_font_size_mobile", type: Sequelize.STRING(50) },
        { name: "excerpt_font_size", type: Sequelize.STRING(50) },
        { name: "excerpt_font_size_mobile", type: Sequelize.STRING(50) },
        { name: "excerpt_line_height", type: Sequelize.STRING(50) },
        { name: "excerpt_line_height_mobile", type: Sequelize.STRING(50) },
        { name: "excerpt_translate_y", type: Sequelize.STRING(50) },
        { name: "excerpt_translate_y_mobile", type: Sequelize.STRING(50) },
    ];

    for (const col of columnsToAdd) {
        if (!tableDescription[col.name]) {
            await queryInterface.addColumn("blogs", col.name, {
                type: col.type,
                allowNull: true,
            });
        }
    }

    if (tableDescription.title && !/text/i.test(tableDescription.title.type || "")) {
        await queryInterface.changeColumn("blogs", "title", {
            type: Sequelize.TEXT,
            allowNull: false,
        });
    }

    blogFontColumnsReady = true;
};

const sanitizePath = (url) => {
    if (!url || typeof url !== 'string') return url;
    const match = url.match(/(\/assets\/.*)/);
    return match ? match[1] : url;
};

class BlogController {
    async index(req, res) {
        try {
            await ensureBlogFontColumns();
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 6;
            const category = req.query.category;
            let status = req.query.status;
            
            if (status === undefined) {
                status = 1;
            } else if (status !== 'all') {
                status = parseInt(status);
            }
            
            const offset = (page - 1) * limit;

            let cacheVersion = await redis.get('blogs:version') || '1';
            const cacheKey = `blogs:list:v${cacheVersion}:p${page}:l${limit}:c${category || 'all'}:s${status}`;

            const resultJson = await getOrSetCache(cacheKey, async () => {
                const where = {};
                if (category) where.category = category;
                if (status !== 'all') where.status = status;

                const { count, rows } = await BlogModel.findAndCountAll({
                    where,
                    limit,
                    offset,
                    order: [['publishedAt', 'DESC']]
                });

                return {
                    success: true,
                    data: rows,
                    pagination: {
                        totalItems: count,
                        totalPages: Math.ceil(count / limit),
                        currentPage: page,
                        pageSize: limit
                    }
                };
            });

            res.json(JSON.parse(resultJson));
        } catch (error) {
            logBlogError("index", error, req);
            res.status(500).json({ success: false, message: error.message });
        }
    }

    async show(req, res) {
        try {
            await ensureBlogFontColumns();
            const { slug } = req.params;
            const cacheKey = `blog:detail:${slug}`;
            
            const resultJson = await getOrSetCache(cacheKey, async () => {
                const blog = await BlogModel.findOne({ where: { slug } });
                if (!blog) return null;
                return { success: true, data: blog };
            });

            if (!resultJson) {
                return res.status(404).json({ success: false, message: 'Không tìm thấy bài viết' });
            }

            res.json(JSON.parse(resultJson));
        } catch (error) {
            logBlogError("show", error, req);
            res.status(500).json({ success: false, message: error.message });
        }
    }

    async store(req, res) {
        try {
            await ensureBlogFontColumns();
            const { title, content, thumbnail, category, authorName, authorAvatar, status, excerpt, lineHeight, lineHeightMobile, fontSize, fontSizeMobile, titleFontSize, titleFontSizeMobile, excerptFontSize, excerptFontSizeMobile, excerptLineHeight, excerptLineHeightMobile, excerptTranslateY, excerptTranslateYMobile, translateY, translateYMobile } = req.body;
            const slug = await createUniqueSlug(title, async (s) => {
                return await BlogModel.findOne({ where: { slug: s } });
            });

            const blog = await BlogModel.create({
                title,
                slug,
                content,
                thumbnail: sanitizePath(thumbnail),
                category,
                authorName,
                authorAvatar: sanitizePath(authorAvatar),
                status: status ?? 1,
                excerpt,
                publishedAt: new Date(),
                lineHeight,
                lineHeightMobile,
                fontSize,
                fontSizeMobile,
                titleFontSize,
                titleFontSizeMobile,
                excerptFontSize,
                excerptFontSizeMobile,
                excerptLineHeight,
                excerptLineHeightMobile,
                excerptTranslateY,
                excerptTranslateYMobile,
                translateY,
                translateYMobile
            });

            await redis.incr('blogs:version');

            res.status(201).json({ success: true, data: blog });
        } catch (error) {
            logBlogError("store", error, req);
            res.status(500).json({ success: false, message: error.message });
        }
    }

    async update(req, res) {
        try {
            await ensureBlogFontColumns();
            const { id } = req.params;
            const { title, content, thumbnail, category, authorName, authorAvatar, status, excerpt, lineHeight, lineHeightMobile, fontSize, fontSizeMobile, titleFontSize, titleFontSizeMobile, excerptFontSize, excerptFontSizeMobile, excerptLineHeight, excerptLineHeightMobile, excerptTranslateY, excerptTranslateYMobile, translateY, translateYMobile } = req.body;

            const blog = await BlogModel.findByPk(id);
            if (!blog) {
                return res.status(404).json({ success: false, message: 'Không tìm thấy bài viết' });
            }
            const previousSlug = blog.slug;

            const updateData = { 
                title, 
                content, 
                thumbnail: sanitizePath(thumbnail), 
                category, 
                authorName, 
                authorAvatar: sanitizePath(authorAvatar),
                status, 
                excerpt,
                lineHeight,
                lineHeightMobile,
                fontSize,
                fontSizeMobile,
                titleFontSize,
                titleFontSizeMobile,
                excerptFontSize,
                excerptFontSizeMobile,
                excerptLineHeight,
                excerptLineHeightMobile,
                excerptTranslateY,
                excerptTranslateYMobile,
                translateY,
                translateYMobile
            };
            
            const cleanTitleSlug = title ? createSlug(title) : '';
            if (title && (title !== blog.title || (cleanTitleSlug && cleanTitleSlug !== blog.slug))) {
                updateData.slug = await createUniqueSlug(title, async (s) => {
                    return await BlogModel.findOne({ where: { slug: s, id: { [Op.ne]: id } } });
                });
            }

            await blog.update(updateData);
            
            await redis.incr('blogs:version');
            await redis.del(`blog:detail:${previousSlug}`);
            if (updateData.slug) await redis.del(`blog:detail:${updateData.slug}`);

            res.json({ success: true, data: blog });
        } catch (error) {
            logBlogError("update", error, req);
            res.status(500).json({ success: false, message: error.message });
        }
    }

    async destroy(req, res) {
        try {
            const { id } = req.params;
            const blog = await BlogModel.findByPk(id);
            if (!blog) {
                return res.status(404).json({ success: false, message: 'Không tìm thấy bài viết' });
            }

            const slug = blog.slug;
            await blog.destroy();
            
            await redis.incr('blogs:version');
            await redis.del(`blog:detail:${slug}`);

            res.json({ success: true, message: 'Đã xóa bài viết' });
        } catch (error) {
            logBlogError("destroy", error, req);
            res.status(500).json({ success: false, message: error.message });
        }
    }

    async getCategories(req, res) {
        try {
            const { status } = req.query;
            let whereClause = 'WHERE category IS NOT NULL AND category != ""';
            if (status !== undefined) {
                whereClause += ` AND status = ${parseInt(status)}`;
            }
            const results = await sequelize.query(
                `SELECT DISTINCT category FROM blogs ${whereClause} ORDER BY category ASC`,
                { type: sequelize.QueryTypes.SELECT }
            );
            const categoryList = results.map(r => r.category).filter(Boolean);
            res.json({ success: true, data: categoryList });
        } catch (error) {
            logBlogError("getCategories", error, req);
            res.status(500).json({ success: false, message: error.message });
        }
    }
}

module.exports = new BlogController();

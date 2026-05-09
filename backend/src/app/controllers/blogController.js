const BlogModel = require('../models/blogModel');
const { createUniqueSlug } = require('../../util/slug');
const { redis, getOrSetCache } = require('../../util/cacheUtil');
const { sequelize, Sequelize } = require('../../config/db');
const { Op } = Sequelize;

class BlogController {
    async index(req, res) {
        try {
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
            res.status(500).json({ success: false, message: error.message });
        }
    }

    async show(req, res) {
        try {
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
            res.status(500).json({ success: false, message: error.message });
        }
    }

    async store(req, res) {
        try {
            const { title, content, thumbnail, category, authorName, status, excerpt } = req.body;
            const slug = await createUniqueSlug(title, async (s) => {
                return await BlogModel.findOne({ where: { slug: s } });
            });

            const blog = await BlogModel.create({
                title,
                slug,
                content,
                thumbnail,
                category,
                authorName,
                status: status || 1,
                excerpt,
                publishedAt: new Date()
            });

            await redis.incr('blogs:version');

            res.status(201).json({ success: true, data: blog });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    }

    async update(req, res) {
        try {
            const { id } = req.params;
            const { title, content, thumbnail, category, authorName, status, excerpt } = req.body;

            const blog = await BlogModel.findByPk(id);
            if (!blog) {
                return res.status(404).json({ success: false, message: 'Không tìm thấy bài viết' });
            }

            const updateData = { title, content, thumbnail, category, authorName, status, excerpt };
            
            if (title && title !== blog.title) {
                updateData.slug = await createUniqueSlug(title, async (s) => {
                    return await BlogModel.findOne({ where: { slug: s, id: { [Op.ne]: id } } });
                });
            }

            await blog.update(updateData);
            
            await redis.incr('blogs:version');
            await redis.del(`blog:detail:${blog.slug}`);
            if (updateData.slug) await redis.del(`blog:detail:${updateData.slug}`);

            res.json({ success: true, data: blog });
        } catch (error) {
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
            res.status(500).json({ success: false, message: error.message });
        }
    }
}

module.exports = new BlogController();

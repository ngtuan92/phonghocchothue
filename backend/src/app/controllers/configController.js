
require('dotenv').config();
const configModel = require('../models/configModel')
const { uploadFile } = require('../../util/upload-file')
const { mutipleConvertToObject } = require('../../util/convert');
const { getOrSetCache, redis } = require('../../util/cacheUtil');

const hasMeaningfulHtml = (value) => {
    if (typeof value !== 'string') return false;
    return value
        .replace(/<style[\s\S]*?<\/style>/gi, '')
        .replace(/<script[\s\S]*?<\/script>/gi, '')
        .replace(/<[^>]+>/g, '')
        .replace(/&nbsp;/gi, ' ')
        .replace(/\s+/g, '')
        .length > 0;
};

function processConfigs(plainConfigs) {
    const faqListConfig = plainConfigs.find(c => c.key === 'faq_list');
    if (faqListConfig && faqListConfig.content) {
        try {
            let faqList = [];
            if (typeof faqListConfig.content === 'string') {
                faqList = JSON.parse(faqListConfig.content);
            } else if (Array.isArray(faqListConfig.content)) {
                faqList = faqListConfig.content;
            }
            
            if (Array.isArray(faqList) && faqList.length > 0) {
                const stripHtml = (val) => {
                    if (!val) return "";
                    return val
                        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
                        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
                        .replace(/<[^>]*>/g, "")
                        .replace(/&nbsp;/g, " ")
                        .replace(/&amp;/g, "&")
                        .replace(/&lt;/g, "<")
                        .replace(/&gt;/g, ">")
                        .replace(/&quot;/g, '"')
                        .replace(/&#39;/g, "'")
                        .replace(/\s+/g, " ")
                        .trim();
                };

                const faqSchema = {
                    "@context": "https://schema.org",
                    "@type": "FAQPage",
                    "mainEntity": faqList.map(item => ({
                        "@type": "Question",
                        "name": stripHtml(item.question),
                        "acceptedAnswer": {
                            "@type": "Answer",
                            "text": stripHtml(item.answer)
                        }
                    }))
                };

                plainConfigs.push({
                    id: 99999,
                    key: 'faq-schema-ld-json',
                    content: JSON.stringify(faqSchema),
                    type: 'jsonld',
                    section: 'faq',
                    musicName: null,
                    borderRadius: null,
                    lineHeight: null,
                    lineHeightMobile: null,
                    fontSizeMobile: null,
                    fontSize: null,
                    translateX: null,
                    translateXMobile: null,
                    translateY: null,
                    translateYMobile: null
                });
            }
        } catch (e) {
            console.error("Lỗi khi parse faq_list cho JSON-LD:", e);
        }
    }
    return plainConfigs;
}

class ConfigController {

    async index(req, res, next) {
        try {
            const noCache = req.query.noCache === 'true';
            
            if (noCache) {
                const configData = await configModel.findAll({
                    attributes: ['id', 'key', 'content', 'type', 'section', 'musicName', 'borderRadius', 'lineHeight', 'lineHeightMobile', 'fontSizeMobile', 'fontSize', 'translateX', 'translateXMobile', 'translateY', 'translateYMobile'],
                });
                const plainConfigs = mutipleConvertToObject(configData);
                return res.status(200).json({
                    success: true,
                    message: 'Lấy data trực tiếp từ DB!',
                    data: processConfigs(plainConfigs)
                });
            }

            const configJson = await getOrSetCache('configs:v2', async () => {
                const configData = await configModel.findAll({
                    attributes: ['id', 'key', 'content', 'type', 'section', 'musicName', 'borderRadius', 'lineHeight', 'lineHeightMobile', 'fontSizeMobile', 'fontSize', 'translateX', 'translateXMobile', 'translateY', 'translateYMobile'],
                });
                const plainConfigs = mutipleConvertToObject(configData);
                return {
                    success: true,
                    message: 'Lấy data thành công!',
                    data: processConfigs(plainConfigs)
                };
            });

            res.setHeader('Content-Type', 'application/json');
            return res.status(200).send(configJson);

        } catch (error) {
            return res.status(500).json({
                success: false,
                message: 'Lấy data thất bại!'
            })
        }
    }

    async store(req, res, next) {
        const { key, content, type, section, musicName, borderRadius, lineHeight, lineHeightMobile, fontSizeMobile, fontSize, translateX, translateXMobile, translateY, translateYMobile } = req.body;
        const { content: image } = req.files || {};

        try {
            let content_new = content;
            if (type == 'image' || type === 'music') {
                if (image) {
                    content_new = await uploadFile(image, 'configs', image.name);
                }
            }

            const newConfig = await configModel.create({
                key,
                content: content_new,
                type,
                section,
                musicName,
                borderRadius,
                lineHeight,
                lineHeightMobile,
                fontSizeMobile,
                fontSize,
                translateX,
                translateXMobile,
                translateY,
                translateYMobile
            });

            await redis.del('configs:v2');

            return res.status(201).json({
                success: true,
                message: 'Tạo mới config thành công!',
                data: newConfig
            });
        } catch (error) {
            return res.status(500).json({
                success: false,
                message: 'Tạo mới config thất bại!'
            });
        }
    }

    async update(req, res, next) {
        const { key } = req.params  
        const { content, type, section, musicName, borderRadius, lineHeight, lineHeightMobile, fontSizeMobile, fontSize, translateX, translateXMobile, translateY, translateYMobile } = req.body;
        const { content: image } = req.files || {};

        try {
            const config = await configModel.findOne({
                where: { key: key }
            })

            if (!config) {
                return res.status(404).json({
                    success: false,
                    message: 'Config không tồn tại!'
                });
            }

            let content_new = content

            if (type == 'image' || type === 'music') {
                content_new = config.content;
                if (image) {
                    content_new = await uploadFile(image, 'configs', image.name);
                }
            } else if (config.type === 'richtext' && !hasMeaningfulHtml(content) && hasMeaningfulHtml(config.content)) {
                content_new = config.content;
            }

            await config.update({
                content: content_new,
                type: type || config.type,
                section: section || config.section,
                musicName: musicName || config.musicName,
                borderRadius: borderRadius !== undefined ? borderRadius : config.borderRadius,
                lineHeight: lineHeight !== undefined ? lineHeight : config.lineHeight,
                lineHeightMobile: lineHeightMobile !== undefined ? lineHeightMobile : config.lineHeightMobile,
                fontSizeMobile: fontSizeMobile !== undefined ? fontSizeMobile : config.fontSizeMobile,
                fontSize: fontSize !== undefined ? fontSize : config.fontSize,
                translateX: translateX !== undefined ? translateX : config.translateX,
                translateXMobile: translateXMobile !== undefined ? translateXMobile : config.translateXMobile,
                translateY: translateY !== undefined ? translateY : config.translateY,
                translateYMobile: translateYMobile !== undefined ? translateYMobile : config.translateYMobile
            });

            await redis.del('configs:v2');

            return res.json({
                success: true,
                message: 'Cập nhật config thành công!',
            });

        } catch (error) {
            return res.status(500).json({
                success: false,
                message: 'Cập nhật data thất bại!'
            })
        }
    }

    async destroy(req, res, next) {
        const { key } = req.params;
        try {
            const result = await configModel.destroy({
                where: { key: key }
            });

            if (!result) {
                return res.status(404).json({
                    success: false,
                    message: 'Config không tồn tại!'
                });
            }

            await redis.del('configs:v2');

            return res.json({
                success: true,
                message: 'Xóa config thành công!'
            });
        } catch (error) {
            return res.status(500).json({
                success: false,
                message: 'Xóa data thất bại!'
            });
        }
    }

}

module.exports = new ConfigController;

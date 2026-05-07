const redis = require('../config/redis');

const getOrSetCache = async (key, fetchDataCallback, ttl = process.env.CACHE_TTL || 3600) => {
    try {
        const cachedData = await redis.get(key);
        if (cachedData) return cachedData;

        const data = await fetchDataCallback();
        if (data) {
            const stringData = JSON.stringify(data);
            await redis.set(key, stringData, 'EX', ttl);
            return stringData;
        }
        return null;
    } catch (error) {
        console.error('Cache Utility Error:', error);
        const data = await fetchDataCallback();
        return JSON.stringify(data);
    }
};

const clearCache = async (key) => {
    try {
        await redis.del(key);
    } catch (error) {
        console.error('Clear Cache Error:', error);
    }
};

const clearSystemCache = async () => {
    await clearCache('configs:v2');
};

module.exports = {
    getOrSetCache,
    clearCache,
    clearSystemCache,
    redis
};

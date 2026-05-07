const redis = require('../config/redis');

const getOrSetCache = async (key, fetchDataCallback, ttl = parseInt(process.env.CACHE_TTL) || 3600) => {
    try {
        const cachedData = await redis.get(key);
        if (cachedData) return cachedData;

        const data = await fetchDataCallback();
        if (data) {
            const stringData = JSON.stringify(data);
            const jitter = Math.floor(Math.random() * (ttl * 0.1));
            const finalTtl = ttl + jitter;
            
            await redis.set(key, stringData, 'EX', finalTtl);
            return stringData;
        }
        return null;
    } catch (error) {
        console.error(`[Cache Error] Key: ${key}`, error);
        const data = await fetchDataCallback();
        return data ? JSON.stringify(data) : null;
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

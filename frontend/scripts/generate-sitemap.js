const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

// Read env variables from .env if needed
const API_BASE = process.env.VITE_URL_API || process.env.NEXT_PUBLIC_URL_API || "http://localhost:3000/";
const BASE_URL = "https://phonghocchothue.com";

const fetchProducts = () => {
  return new Promise((resolve, reject) => {
    const url = `${API_BASE}api/product`;
    const client = url.startsWith('https') ? https : http;
    
    client.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve(Array.isArray(json?.data) ? json.data : []);
        } catch (e) {
          console.warn('Failed to parse API response for products', e.message);
          resolve([]);
        }
      });
    }).on('error', (err) => {
      console.warn('Failed to fetch products', err.message);
      resolve([]);
    });
  });
};

const generateSitemap = async () => {
  console.log('Generating sitemap.xml...');
  const products = await fetchProducts();
  
  const staticRoutes = [
    { url: BASE_URL, priority: 1.0, changefreq: 'daily' }
  ];

  const dynamicRoutes = products
    .filter((product) => product?.slug)
    .map((product) => ({
      url: `${BASE_URL}/phong/${product.slug}`,
      priority: 0.8,
      changefreq: 'weekly',
      lastmod: product.updated_at ? new Date(product.updated_at).toISOString() : new Date().toISOString()
    }));

  const allRoutes = [...staticRoutes, ...dynamicRoutes];

  const sitemapContent = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  ${allRoutes.map(route => `
  <url>
    <loc>${route.url}</loc>
    ${route.lastmod ? `<lastmod>${route.lastmod}</lastmod>` : ''}
    <changefreq>${route.changefreq}</changefreq>
    <priority>${route.priority}</priority>
  </url>`).join('')}
</urlset>`;

  const publicDir = path.join(__dirname, '..', 'public');
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
  }

  fs.writeFileSync(path.join(publicDir, 'sitemap.xml'), sitemapContent.trim());
  console.log(`Generated sitemap.xml with ${allRoutes.length} URLs.`);

  console.log('Generating robots.txt...');
  const robotsContent = `User-agent: *
Allow: /
Disallow: /admin/
Disallow: /admin

Sitemap: ${BASE_URL}/sitemap.xml
`;
  fs.writeFileSync(path.join(publicDir, 'robots.txt'), robotsContent.trim());
  console.log('Generated robots.txt.');
};

generateSitemap().catch(console.error);

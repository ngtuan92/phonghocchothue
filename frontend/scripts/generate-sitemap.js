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
  const publicDir = path.join(__dirname, '..', 'public');
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
  }

  // Delete static sitemap.xml if it exists to avoid conflicts with dynamic route
  const staticSitemapPath = path.join(publicDir, 'sitemap.xml');
  if (fs.existsSync(staticSitemapPath)) {
    fs.unlinkSync(staticSitemapPath);
    console.log('Cleaned up static sitemap.xml');
  }

  console.log('Generating robots.txt...');
  const robotsContent = `User-agent: *
Allow: /
Disallow: /admin/
Disallow: /admin

Sitemap: ${BASE_URL}/sitemap_index.xml
`;
  fs.writeFileSync(path.join(publicDir, 'robots.txt'), robotsContent.trim());
  console.log('Generated robots.txt.');
};

generateSitemap().catch(console.error);

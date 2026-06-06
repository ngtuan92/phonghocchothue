import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = 'edge';
const BASE_URL = "https://phonghocchothue.com";
const API_BASE = process.env.NEXT_PUBLIC_URL_API || "http://localhost:8080/";

async function fetchProducts() {
  try {
    const res = await fetch(`${API_BASE}api/product`, {
      next: { revalidate: 3600 },
    });
    if (!res.ok) return [];
    const json = await res.json();
    return Array.isArray(json?.data) ? json.data : [];
  } catch {
    return [];
  }
}

async function fetchBlogs() {
  try {
    const res = await fetch(`${API_BASE}api/blog?limit=9999&status=1`, {
      next: { revalidate: 3600 },
    });
    if (!res.ok) return [];
    const json = await res.json();
    return Array.isArray(json?.data) ? json.data : [];
  } catch {
    return [];
  }
}

async function fetchCategories() {
  try {
    const res = await fetch(`${API_BASE}api/blog/categories?status=1`, {
      next: { revalidate: 3600 },
    });
    if (!res.ok) return [];
    const json = await res.json();
    return Array.isArray(json?.data) ? json.data : [];
  } catch {
    return [];
  }
}

export async function GET() {
  const [products, blogs, categories] = await Promise.all([
    fetchProducts(),
    fetchBlogs(),
    fetchCategories()
  ]);
  const currentDate = new Date().toISOString();

  let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`;

  // Add products
  products.forEach((product: any) => {
    if (product?.slug) {
      const rawDate = product.updated_at || product.updatedAt || currentDate;
      const lastmod = new Date(rawDate).toISOString();
      xml += `
  <url>
    <loc>${BASE_URL}/phong/${product.slug}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`;
    }
  });

  // Add blogs
  blogs.forEach((blog: any) => {
    if (blog?.slug) {
      const rawDate = blog.updatedAt || blog.publishedAt || currentDate;
      const lastmod = new Date(rawDate).toISOString();
      xml += `
  <url>
    <loc>${BASE_URL}/blog/${blog.slug}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>`;
    }
  });

  // Add categories
  categories.forEach((cat: string) => {
    if (cat) {
      xml += `
  <url>
    <loc>${BASE_URL}/blog/danh-muc/${cat}</loc>
    <lastmod>${currentDate}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.6</priority>
  </url>`;
    }
  });

  xml += `
</urlset>`;

  return new NextResponse(xml, {
    headers: {
      "Content-Type": "application/xml",
      "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=600",
    },
  });
}

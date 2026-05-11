import type { MetadataRoute } from "next";

const BASE_URL = "https://phonghocchothue.com";
const API_BASE = process.env.NEXT_PUBLIC_URL_API || "http://localhost:3000/";

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
    const res = await fetch(`${API_BASE}api/blog?limit=1000&status=1`, {
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

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [products, blogs, categories] = await Promise.all([
    fetchProducts(),
    fetchBlogs(),
    fetchCategories(),
  ]);

  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: BASE_URL,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: `${BASE_URL}/blog`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.9,
    },
  ];

  const productRoutes: MetadataRoute.Sitemap = products
    .filter((product: any) => product?.slug)
    .map((product: any) => ({
      url: `${BASE_URL}/phong/${product.slug}`,
      lastModified: product.updated_at ? new Date(product.updated_at) : new Date(),
      changeFrequency: "weekly",
      priority: 0.8,
    }));

  const blogRoutes: MetadataRoute.Sitemap = blogs
    .filter((blog: any) => blog?.slug)
    .map((blog: any) => ({
      url: `${BASE_URL}/blog/${blog.slug}`,
      lastModified: blog.updatedAt ? new Date(blog.updatedAt) : new Date(),
      changeFrequency: "weekly",
      priority: 0.7,
    }));

  const categoryRoutes: MetadataRoute.Sitemap = categories.map((cat: string) => ({
    url: `${BASE_URL}/blog/danh-muc/${cat}`,
    lastModified: new Date(),
    changeFrequency: "weekly",
    priority: 0.6,
  }));

  return [...staticRoutes, ...productRoutes, ...blogRoutes, ...categoryRoutes];
}


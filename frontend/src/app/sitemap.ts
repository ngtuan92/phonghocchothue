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

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const products = await fetchProducts();

  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: BASE_URL,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1,
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

  return [...staticRoutes, ...productRoutes];
}


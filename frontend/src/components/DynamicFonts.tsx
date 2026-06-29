"use client";

import React, { useEffect, useState } from 'react';

const URL_API = (process.env.NEXT_PUBLIC_URL_API || "http://localhost:3000/").replace(/\/$/, "");

const slugify = (name: string) => name.trim().toLowerCase().replace(/\s+/g, '-');

export default function DynamicFonts() {
  const [fonts, setFonts] = useState<any[]>([]);

  useEffect(() => {
    async function getFonts() {
      try {
        const res = await fetch(`${URL_API}/api/fonts`);
        if (res.ok) {
          const data = await res.json();
          setFonts(data || []);
        }
      } catch (error) {
        console.error("Failed to fetch dynamic fonts:", error);
      }
    }
    getFonts();
  }, []);

  if (!fonts || fonts.length === 0) return null;

  const renderFontCSS = (font: any) => {
    const name = font.name.trim();
    const slug = slugify(name);
    return `
      [style*="font-family: ${slug}"],
      [style*="font-family:${slug}"],
      [style*="font-family: '${slug}'"],
      [style*="font-family:'${slug}'"],
      [style*='font-family: "${slug}"'],
      [style*='font-family:"${slug}"'] {
        font-family: '${name}', sans-serif !important;
      }
    `;
  };

  return (
    <>
      {fonts.map((font: any) => (
        font.url && font.url.startsWith('http') ? <link key={font.id} href={font.url} rel="stylesheet" /> : null
      ))}
      <style dangerouslySetInnerHTML={{ __html: fonts.map(renderFontCSS).join('\n') }} />
    </>
  );
}

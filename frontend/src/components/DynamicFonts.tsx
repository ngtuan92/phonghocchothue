import React from 'react';

const URL_API = (process.env.NEXT_PUBLIC_URL_API || "http://localhost:3000/").replace(/\/$/, "");

const slugify = (name: string) => name.trim().toLowerCase().replace(/\s+/g, '-');

export default async function DynamicFonts() {
  let fonts = [];
  try {
    const res = await fetch(`${URL_API}/api/fonts`, { next: { revalidate: 60 } });
    if (res.ok) {
      fonts = await res.json();
    }
  } catch (error) {
    console.error("Failed to fetch dynamic fonts:", error);
  }

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

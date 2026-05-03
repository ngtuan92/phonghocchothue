import React from 'react';

const URL_API = (process.env.NEXT_PUBLIC_URL_API || "http://localhost:3000/").replace(/\/$/, "");

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
    const className = font.name.toLowerCase().replace(/\s+/g, '-');
    return `
      .ql-font-${className} { font-family: '${font.name}', sans-serif; }
      .ql-picker.ql-font .ql-picker-label[data-value="${className}"]::before,
      .ql-snow .ql-picker.ql-font .ql-picker-label[data-value="${className}"]::before,
      .ql-picker.ql-font .ql-picker-item[data-value="${className}"]::before,
      .ql-snow .ql-picker.ql-font .ql-picker-item[data-value="${className}"]::before {
        content: '${font.name}' !important;
        font-family: '${font.name}', sans-serif !important;
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

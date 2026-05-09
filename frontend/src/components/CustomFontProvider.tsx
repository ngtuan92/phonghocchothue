import React from 'react';

const URL_API = (process.env.NEXT_PUBLIC_URL_API || "http://localhost:8080").replace(/\/$/, "");

interface LocalFont {
    id: number;
    display_name: string;
    font_family: string;
    file_url: string;
    file_type: string;
    status: string;
}

export default async function CustomFontProvider() {
    let localFonts: LocalFont[] = [];
    let defaultFont = '';

    try {
        const [fontsRes, configsRes] = await Promise.all([
            fetch(`${URL_API}/api/fonts/local`, { next: { revalidate: 60 } }),
            fetch(`${URL_API}/api/config`, { next: { revalidate: 60 } })
        ]);

        if (fontsRes.ok) {
            const result = await fontsRes.json();
            if (result.success && Array.isArray(result.data)) {
                localFonts = result.data.filter((f: LocalFont) => f.status === 'active');
            }
        }

        if (configsRes.ok) {
            const result = await configsRes.json();
            if (result.success && Array.isArray(result.data)) {
                const configDefaultFont = result.data.find((c: any) => c.key === 'default-font');
                if (configDefaultFont) {
                    defaultFont = configDefaultFont.content;
                }
            }
        }
    } catch (error) {
        console.error("Failed to fetch data for CustomFontProvider:", error);
    }

    const fontFaceCSS = localFonts.map(font => {
        const fullUrl = font.file_url.startsWith('http')
            ? font.file_url
            : `${URL_API}${font.file_url}`;

        return `
            @font-face {
                font-family: '${font.font_family}';
                src: url('${fullUrl}') format('${font.file_type === 'ttf' ? 'truetype' : (font.file_type === 'otf' ? 'opentype' : font.file_type)}');
                font-weight: normal;
                font-style: normal;
                font-display: swap;
            }
        `;
    }).join('\n');

    const globalFontCSS = defaultFont ? `
        body, h1, h2, h3, h4, h5, h6, p, span, a, div {
            font-family: '${defaultFont}', sans-serif !important;
        }
    ` : '';

    const overrideFontCSS = localFonts.map(font => `
        [style*="font-family: ${font.font_family}"],
        [style*="font-family:${font.font_family}"],
        [style*="font-family: '${font.font_family}'"],
        [style*="font-family:'${font.font_family}'"],
        [style*='font-family: "${font.font_family}"'],
        [style*='font-family:"${font.font_family}"'] {
            font-family: '${font.font_family}', sans-serif !important;
        }
    `).join('\n');
    return (
        <style
            id="custom-local-fonts"
            dangerouslySetInnerHTML={{ __html: fontFaceCSS + globalFontCSS + overrideFontCSS }}
        />
    );
}

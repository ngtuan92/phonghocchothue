/**
 * Vietnamese Text & HTML Orthography Normalizer
 * 1. Normalizes Unicode into standard NFC (precomposed) to resolve macOS/iOS NFD composition bugs.
 * 2. Normalizes legacy / old-style tone placement in open syllables (e.g. hoạ -> họa, toà -> tòa, khoẻ -> khỏe, thuỷ -> thủy)
 *    so custom fonts and system fonts render consistently across Windows, macOS, iOS, Android.
 */

const MAP_OA: Record<string, string> = {
  'oà': 'òa', 'oá': 'óa', 'oả': 'ỏa', 'oã': 'õa', 'oạ': 'ọa',
  'Oà': 'Òa', 'Oá': 'Óa', 'Oả': 'Ỏa', 'Oã': 'Õa', 'Oạ': 'Ọa',
  'OÀ': 'ÒA', 'OÁ': 'ÓA', 'OẢ': 'ỎA', 'OÃ': 'ÕA', 'OẠ': 'ỌA',
};

const MAP_OE: Record<string, string> = {
  'oè': 'òe', 'oé': 'óe', 'oẻ': 'ỏe', 'oẽ': 'õe', 'oẹ': 'ọe',
  'Oè': 'Òe', 'Oé': 'Óe', 'Oẻ': 'Ỏe', 'Oẽ': 'Õe', 'Oẹ': 'Ọe',
  'OÈ': 'ÒE', 'OÉ': 'ÓE', 'OẺ': 'ỎE', 'OẼ': 'ÕE', 'OẸ': 'ỌE',
};

const MAP_UY: Record<string, string> = {
  'uỳ': 'ùy', 'uý': 'úy', 'uỷ': 'ủy', 'uỹ': 'ũy', 'uỵ': 'ụy',
  'Uỳ': 'Ùy', 'Uý': 'Úy', 'Uỷ': 'Ủy', 'Uỹ': 'Ũy', 'Uỵ': 'Ụy',
  'UỲ': 'ÙY', 'UÝ': 'ÚY', 'UỶ': 'ỦY', 'UỸ': 'ŨY', 'UỴ': 'ỤY',
};

const END_LOOKAHEAD = '(?![a-zA-ZàáảãạăắằẳẵặâấầẩẫậèéẻẽẹêếềểễệìíỉĩịòóỏõọôốồổỗộơớờởỡợùúủũụưứừửữựỳýỷỹỵđĐ])';

export function normalizeVietnameseText(text: string): string {
  if (!text || typeof text !== 'string') return text;
  let res = text.normalize('NFC');

  for (const [oldVal, newVal] of Object.entries(MAP_OA)) {
    res = res.replace(new RegExp(oldVal + END_LOOKAHEAD, 'g'), newVal);
  }
  for (const [oldVal, newVal] of Object.entries(MAP_OE)) {
    res = res.replace(new RegExp(oldVal + END_LOOKAHEAD, 'g'), newVal);
  }
  for (const [oldVal, newVal] of Object.entries(MAP_UY)) {
    res = res.replace(new RegExp(oldVal + END_LOOKAHEAD, 'g'), newVal);
  }
  return res;
}

export function normalizeVietnameseHtml(html: string): string {
  if (!html || typeof html !== 'string') return html;
  let res = html.normalize('NFC');
  res = res.replace(/(^|>)([^<]+)(<|$)/g, (_match, prefix, text, suffix) => {
    return prefix + normalizeVietnameseText(text) + suffix;
  });
  return res;
}

export default normalizeVietnameseHtml;

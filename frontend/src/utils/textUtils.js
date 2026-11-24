// Shared SVG data URI fallbacks (no network request required)
export const FALLBACK_POSTER = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='450' viewBox='0 0 300 450'%3E%3Crect fill='%231E1E28' width='300' height='450'/%3E%3Ctext x='150' y='230' font-family='Arial' font-size='64' fill='%234B4B6A' text-anchor='middle'%3E%F0%9F%8E%AC%3C/text%3E%3C/svg%3E`;

export const FALLBACK_BACKDROP = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='320' height='180' viewBox='0 0 320 180'%3E%3Crect fill='%231E1E28' width='320' height='180'/%3E%3Ctext x='160' y='100' font-family='Arial' font-size='40' fill='%234B4B6A' text-anchor='middle'%3E%F0%9F%8E%AC%3C/text%3E%3C/svg%3E`;

const HTML_ENTITY_MAP = {
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&#039;': "'",
  '&#39;': "'",
  '&#x27;': "'",
  '&apos;': "'",
  '&nbsp;': ' ',
  '&ndash;': '–',
  '&mdash;': '—',
  '&hellip;': '…',
};

/**
 * Strip HTML tags safely and decode common HTML entities into clean plain text.
 * Preserves paragraph/line breaks where <br> or </p> appear.
 */
export function stripHtmlAndDecode(html = '') {
  if (!html || typeof html !== 'string') return '';

  let text = html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<[^>]*>/g, '');

  text = text.replace(
    /&(amp|lt|gt|quot|#039|#39|#x27|apos|nbsp|ndash|mdash|hellip);/gi,
    (match) => HTML_ENTITY_MAP[match.toLowerCase()] || match
  );

  // Decode numeric entities like &#123; or &#x1A;
  text = text.replace(/&#(\d+);/g, (_, dec) => {
    const code = Number(dec);
    return Number.isFinite(code) ? String.fromCharCode(code) : _;
  });
  text = text.replace(/&#x([0-9a-f]+);/gi, (_, hex) => {
    const code = parseInt(hex, 16);
    return Number.isFinite(code) ? String.fromCharCode(code) : _;
  });

  return text
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

import qrcode from './vendor/qrcode.js';

// Full Unicode (including surrogate pairs), rather than truncating UTF-16 code units.
qrcode.stringToBytes = text => Array.from(new TextEncoder().encode(text));

/** ISO-sized quiet zone; no network request, rasterization, or user-supplied markup. */
export function generateQR(text, level = 'M') {
  const qr = qrcode(0, ['L', 'M', 'Q', 'H'].includes(level) ? level : 'M');
  qr.addData(String(text), 'Byte');
  qr.make();
  const count = qr.getModuleCount();
  let path = '';
  for (let row = 0; row < count; row++) {
    for (let column = 0; column < count; column++) {
      if (qr.isDark(row, column)) path += `M${column} ${row}h1v1h-1z`;
    }
  }
  const size = count + 8;
  return `<svg viewBox="-4 -4 ${size} ${size}" preserveAspectRatio="xMidYMid meet" shape-rendering="crispEdges" role="img" aria-label="QR code"><rect x="-4" y="-4" width="${size}" height="${size}" style="fill:var(--qr-bg,#FFFFFF)"/><path d="${path}" style="fill:var(--qr-fg,#18251A)"/></svg>`;
}

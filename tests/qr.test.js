import { test } from 'node:test';
import assert from 'node:assert/strict';
import jsQR from 'jsqr';
import { generateQR } from '../assets/qr.js';
import { createVCard } from '../assets/state.js';
import { defaults } from './fixtures.js';

function decode(svg) {
  const box = svg.match(/viewBox="(-?\d+) (-?\d+) (\d+) (\d+)"/);
  assert.equal(box[1], '-4'); assert.equal(box[2], '-4');
  const modules = Number(box[3]), scale = 5, pixels = modules * scale;
  const data = new Uint8ClampedArray(pixels * pixels * 4).fill(255);
  for (const [, x, y] of svg.matchAll(/M(\d+) (\d+)h1v1h-1z/g)) {
    for (let dy = 0; dy < scale; dy++) for (let dx = 0; dx < scale; dx++) {
      const at = (((Number(y) + 4) * scale + dy) * pixels + (Number(x) + 4) * scale + dx) * 4;
      data[at] = data[at + 1] = data[at + 2] = 0;
    }
  }
  return jsQR(data, pixels, pixels)?.data;
}

for (const text of ['https://forma.studio/', 'mailto:sofia@forma.studio', 'tel:+351912345678', 'Olá João — 世界 👋', createVCard(defaults.data, '3.0'), createVCard({ ...defaults.data, name: 'João Silva 👋', tag: 'A longer introduction. '.repeat(20) }, '3.0')]) {
  test(`QR round-trips ${text.slice(0, 50).replaceAll('\r\n', ' / ')}`, () => assert.equal(decode(generateQR(text, 'M')), text));
}
test('oversized QR content produces an explicit error instead of a broken symbol', () => assert.throws(() => generateQR('x'.repeat(6000))));

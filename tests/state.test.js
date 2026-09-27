import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeState, parseProject, snapshotState, designFingerprint, safePhoto, websiteURL, createVCard, escapeVCard, projectFilename } from '../assets/state.js';
import { defaults, choices, clone } from './fixtures.js';

const normalize = input => normalizeState(input, defaults, choices);

test('project export/import is lossless for editable data, print settings, type and photos', () => {
  const state = clone(defaults);
  Object.assign(state, { photo: 'data:image/png;base64,aGVsbG8=', photoW: 400, photoH: 600, weight: 700, zoomUser: 145, track: .08, ltrack: .2 });
  state.data.photo = state.photo;
  state.print = { preset: 'marks', bleed: 5, faces: 'back', mirror: false, duplex: false, gray: true, marks: false, qty: 2 };
  const project = JSON.stringify({ app: 'card-studio', v: 2, state: snapshotState(state) });
  assert.deepEqual(parseProject(project, defaults, choices), state);
});

test('legacy projects retain their original layout and known preferences', () => {
  const state = clone(defaults); delete state.layout; delete state.template;
  state.lang = 'pt'; state.fonts = { display: 'playfair', body: 'grotesk' };
  const result = parseProject({ app: 'card-studio-corp', v: 1, state }, defaults, choices);
  assert.equal(result.layout, 'classic'); assert.equal(result.template, ''); assert.equal(result.lang, 'pt');
  assert.deepEqual(result.fonts, state.fonts);
});

test('malformed, foreign and future files are rejected before editing anything', () => {
  for (const value of ['{', 'null', '[]', '{}', '{"state":null}', '{"data":[]}', '{"data":null}', '{"app":"other","data":{}}', '{"v":200,"data":{}}']) {
    assert.throws(() => parseProject(value, defaults, choices));
  }
  assert.equal(defaults.data.name, 'Sofia Martins');
});

test('whitelists reject invalid enum values, booleans and injected CSS', () => {
  const input = clone(defaults);
  Object.assign(input, { lang: 'xx', fmt: 'x', frame: '<img>', theme: {}, gray: 'false', qr: 'javascript:bad', nameCase: 'url(https://bad)' });
  input.colors.canvas = 'red;background:url(https://bad)'; input.colors.paper = 'abc';
  input.fonts = { display: '<script>', body: 'url(https://bad)' };
  input.print = { preset: 'bad', qty: 999, mirror: 'false', bleed: 300 };
  const state = normalize(input);
  for (const key of ['lang', 'fmt', 'frame', 'theme', 'gray', 'qr', 'nameCase', 'fonts', 'print']) assert.deepEqual(state[key], defaults[key]);
  assert.equal(state.colors.canvas, ''); assert.equal(state.colors.paper, '#AABBCC');
});

test('clamps geometry and rejects non-finite values', () => {
  const input = clone(defaults);
  Object.assign(input, { radius: 999, photoZoom: -2, photoX: Infinity, band: NaN, track: .6, zoomUser: 500 });
  input.v3.rx = -500; input.v3.zoom = 20; input.v3.spin = true;
  const state = normalize(input);
  assert.equal(state.radius, 6); assert.equal(state.photoZoom, 1); assert.equal(state.photoX, 50);
  assert.equal(state.band, 31); assert.equal(state.track, .16); assert.equal(state.zoomUser, 170);
  assert.equal(state.v3.rx, -85); assert.equal(state.v3.zoom, 3); assert.equal(state.v3.spin, false);
});

test('personal data is bounded and never filled with unrelated example contacts', () => {
  const input = { data: { name: 'X'.repeat(1500), mono: 'ABCDEFG', company: { bad: true }, socials: [null, { p: 'bad', v: {} }] } };
  const state = normalize(input);
  assert.equal(state.data.name.length, 1000); assert.equal(state.data.mono, 'ABCD');
  assert.equal(state.data.company, ''); assert.equal(state.data.email, '');
  assert.equal(state.data.socials.length, 3);
  assert.ok(state.data.socials.every(s => s.p === 'linkedin' && s.v === ''));
});

test('prototype keys and extra fields never make it into state', () => {
  const input = JSON.parse('{"data":{"name":"A","__proto__":{"polluted":true}},"print":{"evil":true},"__proto__":{"polluted":true}}');
  const state = normalize(input);
  assert.equal({}.polluted, undefined); assert.equal(state.polluted, undefined);
  assert.equal(Object.hasOwn(state.data, '__proto__'), false); assert.equal(state.print.evil, undefined);
});

test('photo references are restricted to bounded raster data URLs', () => {
  for (const photo of ['https://tracker.example/image.png', 'javascript:alert(1)', 'data:image/svg+xml;base64,PHN2Zz4=', 'data:image/png;base64,x" onerror="alert(1)', 'data:image/png;base64,' + 'a'.repeat(3_500_000)]) assert.equal(safePhoto(photo), null);
  assert.equal(safePhoto('data:image/webp;base64,aGVsbG8='), 'data:image/webp;base64,aGVsbG8=');
  const state = normalize({ ...clone(defaults), photo: null, data: { ...defaults.data, photo: 'https://tracker.example/old.png' } });
  assert.equal(state.data.photo, null);
});

test('snapshots store an image once, omit fit internals, and do not restart animations', () => {
  const state = clone(defaults); state.photo = 'data:image/png;base64,aGVsbG8='; state.data.photo = state.photo;
  state.fitScale = .6; state.base3d = 1.1; state.base3dModal = 2.4; state.v3.spin = true; state.autoTurn = true;
  const saved = snapshotState(state);
  assert.equal(saved.data.photo, undefined); assert.equal(saved.fitScale, undefined); assert.equal(saved.base3d, undefined);
  assert.equal(saved.photo, state.photo); assert.equal(saved.v3.spin, false); assert.equal(saved.autoTurn, false);
  assert.equal(state.v3.spin, true);
});

test('undo fingerprints ignore camera and language, but retain print settings', () => {
  const state = clone(defaults); const first = designFingerprint(state);
  state.v3.ry = 190; state.lang = 'pt'; state.zoomUser = 140; state.mode = 'flip'; state.side = 'back';
  assert.equal(designFingerprint(state), first);
  state.print.bleed = 5; assert.notEqual(designFingerprint(state), first);
});

test('website URLs support HTTPS/HTTP and reject executable or credential-bearing schemes', () => {
  assert.equal(websiteURL('forma.studio'), 'https://forma.studio/');
  assert.equal(websiteURL('http://example.org/path?q=1'), 'http://example.org/path?q=1');
  for (const value of ['javascript:alert(1)', 'data:text/html,test', 'file:///etc/passwd', 'https://a:b@example.org', 'not a domain', 'https://example.org\nfoo']) assert.equal(websiteURL(value), '');
});

test('vCard text escapes commas, semicolons, backslashes and property injection', () => {
  assert.equal(escapeVCard('A,B;C\\D\nEMAIL:evil'), 'A\\,B\\;C\\\\D\\nEMAIL:evil');
  const card = createVCard({ ...defaults.data, name: 'João, Silva', company: 'A;B\r\nTEL:evil', country: 'Portugal' });
  assert.match(card, /FN:João\\, Silva\r\n/);
  assert.match(card, /ORG:A\\;B\\nTEL:evil\r\n/);
  assert.match(card, /ADR;TYPE=work:;;;Lisbon\\, Portugal;;;Portugal\r\n/);
  assert.match(card, /TEL;TYPE=work:tel:\+351912345678/);
  assert.ok(card.endsWith('END:VCARD\r\n'));
});

test('vCard line folding is limited to 75 UTF-8 octets without splitting characters', () => {
  const name = 'João 👋 世界 '.repeat(30);
  const card = createVCard({ name });
  for (const line of card.split('\r\n')) assert.ok(Buffer.byteLength(line) <= 75);
  assert.ok(card.replace(/\r\n /g, '').includes('FN:' + name));
});

test('safe filenames handle accents, punctuation and non-Latin names', () => {
  assert.equal(projectFilename('João da Silva'), 'card-joao-da-silva.json');
  assert.equal(projectFilename('../../', 'vcf'), 'card-my-card.vcf');
  assert.equal(projectFilename('世界'), 'card-my-card.json');
});

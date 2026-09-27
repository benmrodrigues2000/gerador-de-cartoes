const isRecord = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const clone = value => JSON.parse(JSON.stringify(value));
const bounded = (value, min, max, fallback) => typeof value === 'number' && Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : fallback;
const choice = (value, options, fallback) => options.includes(value) ? value : fallback;
const boolean = (value, fallback) => typeof value === 'boolean' ? value : fallback;
const text = (value, fallback = '', max = 1000) => typeof value === 'string' ? value.slice(0, max).replace(/\u0000/g, '') : fallback;

export function safePhoto(value) {
  return typeof value === 'string' && value.length <= 3_500_000 && /^data:image\/(?:jpeg|png|webp|gif);base64,[a-z\d+/=\r\n]+$/i.test(value) ? value : null;
}

/** Whitelist imported/local values. Never spread untrusted objects into app state. */
export function normalizeState(input, defaults, choices) {
  if (!isRecord(input) || !isRecord(input.data)) throw new Error('Missing card data');
  const result = clone(defaults);
  const enums = {
    lang: ['en', 'pt'], fmt: choices.formats, mode: ['side', 'flip'], side: ['front', 'back'],
    layout: ['classic', 'atelier', 'editorial', 'bold', 'minimal'], template: ['', ...choices.templates],
    theme: choices.themes, fill: ['dark', 'light', 'primary'], texture: ['none', 'grid', 'rule', 'dot'],
    frame: ['band', 'round', 'none'], nameCase: ['none', 'uppercase', 'lowercase', 'capitalize'],
    qr: ['website', 'vcard', 'phone', 'email'], weight: [500, 600, 700]
  };
  for (const [key, values] of Object.entries(enums)) result[key] = choice(input[key], values, result[key]);
  const ranges = { radius: [0, 6], band: [18, 44], photoZoom: [1, 2.2], photoX: [0, 100], photoY: [0, 100], track: [-.03, .16], ltrack: [0, .32], zoomUser: [50, 170], photoW: [0, 20000], photoH: [0, 20000] };
  for (const [key, [min, max]] of Object.entries(ranges)) result[key] = bounded(input[key], min, max, result[key] || 0);
  for (const key of ['gray', 'showSoc']) result[key] = boolean(input[key], result[key]);
  for (const key of Object.keys(result.data)) {
    if (key !== 'socials' && key !== 'photo') result.data[key] = text(input.data[key], '', key === 'mono' ? 4 : 1000);
  }
  const photo = Object.hasOwn(input, 'photo') ? input.photo : input.data.photo;
  result.photo = safePhoto(photo);
  result.data.photo = result.photo;
  if (Array.isArray(input.data.socials)) {
    result.data.socials = [0, 1, 2].map(index => {
      const social = isRecord(input.data.socials[index]) ? input.data.socials[index] : {};
      return { p: choice(social.p, choices.platforms, 'linkedin'), v: text(social.v) };
    });
  }
  if (isRecord(input.colors)) {
    for (const key of Object.keys(result.colors)) {
      const value = input.colors[key];
      if (typeof value === 'string') {
        const hex = value.trim().replace(/^#/, '');
        result.colors[key] = /^[a-f\d]{6}$/i.test(hex) ? '#' + hex.toUpperCase()
          : /^[a-f\d]{3}$/i.test(hex) ? '#' + hex.split('').map(c => c + c).join('').toUpperCase() : '';
      }
    }
  }
  if (isRecord(input.fonts)) {
    result.fonts.display = choice(input.fonts.display, choices.fonts, result.fonts.display);
    result.fonts.body = choice(input.fonts.body, choices.bodyFonts, result.fonts.body);
  }
  if (isRecord(input.lines)) {
    for (const key of Object.keys(result.lines)) result.lines[key] = boolean(input.lines[key], result.lines[key]);
  }
  if (isRecord(input.print)) {
    const print = input.print;
    result.print.preset = choice(print.preset, ['home', 'pro', 'marks', 'single'], result.print.preset);
    result.print.bleed = choice(print.bleed, [0, 2, 3, 5], result.print.bleed);
    result.print.faces = choice(print.faces, ['both', 'front', 'back'], result.print.faces);
    result.print.qty = choice(print.qty, [1, 2, 8, 10], result.print.qty);
    for (const key of ['mirror', 'duplex', 'gray', 'marks']) result.print[key] = boolean(print[key], result.print[key]);
  }
  if (result.print.faces === 'both' && !result.print.duplex) result.print.faces = 'front';
  result.print.duplex = result.print.faces === 'both';
  if (isRecord(input.v3)) {
    const ranges3d = { rx: [-85, 85], ry: [-36000, 36000], zoom: [.5, 3], persp: [600, 3000], glare: [0, 1], thick: [.1, 2], shadow: [0, 1], tx: [-1000, 1000], ty: [-1000, 1000] };
    for (const [key, [min, max]] of Object.entries(ranges3d)) result.v3[key] = bounded(input.v3[key], min, max, result.v3[key]);
    result.v3.flat = boolean(input.v3.flat, false);
  }
  result.v3.spin = false;
  result.autoTurn = false;
  result.turn = result.side === 'back' ? 180 : 0;
  return result;
}

export function parseProject(raw, defaults, choices) {
  const project = typeof raw === 'string' ? JSON.parse(raw) : raw;
  if (!isRecord(project)) throw new Error('Invalid project');
  if (project.app && !['card-studio', 'card-studio-corp'].includes(project.app)) throw new Error('Unknown app');
  if (project.v !== undefined && ![1, 2].includes(project.v)) throw new Error('Unsupported version');
  const input = Object.hasOwn(project, 'state') ? project.state : project;
  if (!isRecord(input)) throw new Error('Invalid state');
  // Preserve the appearance of legacy projects rather than forcing a new layout.
  const legacy = !Object.hasOwn(input, 'layout');
  return normalizeState(legacy ? { ...input, layout: 'classic', template: '' } : input, defaults, choices);
}

export function snapshotState(state) {
  const snapshot = clone(state);
  delete snapshot.data.photo; // Same image already exists at the top level.
  delete snapshot.fitScale;
  delete snapshot.base3d;
  delete snapshot.base3dModal;
  snapshot.v3.spin = false;
  snapshot.autoTurn = false;
  return snapshot;
}

export function designFingerprint(state) {
  const snapshot = snapshotState(state);
  // Camera motion, language and zoom do not occupy design undo history.
  for (const key of ['v3', 'zoomUser', 'mode', 'side', 'turn', 'autoTurn', 'lang']) delete snapshot[key];
  return JSON.stringify(snapshot);
}

export function projectFilename(name, extension = 'json') {
  const clean = String(name || 'my-card').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 70);
  return `card-${clean || 'my-card'}.${extension}`;
}

export function websiteURL(value) {
  let raw = String(value || '').trim();
  if (!raw || /[\s\x00-\x1f\x7f]/.test(raw)) return '';
  if (/^[a-z][a-z0-9+.-]*:/i.test(raw) && !/^https?:\/\//i.test(raw)) return '';
  if (!/^https?:\/\//i.test(raw)) raw = 'https://' + raw;
  try {
    const url = new URL(raw);
    return url.hostname.includes('.') && !url.username && !url.password && ['https:', 'http:'].includes(url.protocol) ? url.href : '';
  } catch { return ''; }
}

export function escapeVCard(value) {
  return String(value || '').replace(/\\/g, '\\\\').replace(/\r\n|\r|\n/g, '\\n').replace(/;/g, '\\;').replace(/,/g, '\\,');
}

function foldLine(line) {
  const encoder = new TextEncoder();
  let bytes = 0, result = '';
  for (const character of line) {
    const length = encoder.encode(character).length;
    if (bytes + length > 75) { result += '\r\n '; bytes = 1; }
    result += character;
    bytes += length;
  }
  return result;
}

export function createVCard(data, version = '4.0') {
  const lines = ['BEGIN:VCARD', 'VERSION:' + version, 'FN:' + escapeVCard(data.name)];
  const add = (key, value) => { if (value) lines.push(key + ':' + escapeVCard(value)); };
  add('TITLE', data.role); add('ROLE', data.dept); add('ORG', data.company);
  add('EMAIL;TYPE=work', data.email);
  for (const [key, type] of [['phone', 'work'], ['mobile', 'cell']]) {
    if (data[key]) {
      const phone = String(data[key]).replace(/[^\d+]/g, '');
      if (phone) lines.push(`TEL;TYPE=${type}:` + (version === '4.0' ? 'tel:' : '') + phone);
    }
  }
  if (data.street || data.city || data.country) lines.push('ADR;TYPE=work:' + ['', '', data.street, data.city, '', '', data.country].map(escapeVCard).join(';'));
  const url = websiteURL(data.web);
  if (url) lines.push('URL:' + url);
  add('NOTE', data.tag);
  for (const social of (data.socials || []).filter(s => s && s.v).slice(0, 3)) {
    const type = /^[a-z]+$/.test(social.p) ? social.p : 'web';
    add('X-SOCIALPROFILE;TYPE=' + type, websiteURL(social.v) || social.v);
  }
  lines.push('END:VCARD');
  return lines.map(foldLine).join('\r\n') + '\r\n';
}

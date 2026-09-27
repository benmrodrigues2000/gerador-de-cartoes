import { templates } from '../assets/templates.js';

export const defaults = {
  lang: 'en', fmt: 'eu', mode: 'side', side: 'front', zoomUser: 100, theme: 'forest',
  fill: 'dark', texture: 'none', frame: 'none', layout: 'atelier', template: 'forma',
  colors: { ...templates[0].colors }, fonts: { display: 'grotesk', body: 'inter' },
  nameCase: 'none', weight: 500, track: -.03, ltrack: .16, radius: .6, band: 31,
  photo: null, photoW: 0, photoH: 0, photoZoom: 1, photoX: 50, photoY: 42, gray: false,
  lines: { email: true, phone: false, mobile: false, web: true }, showSoc: false, qr: 'website',
  print: { preset: 'home', bleed: 3, faces: 'both', mirror: false, duplex: true, gray: false, marks: true, qty: 10 },
  v3: { rx: -14, ry: 26, zoom: 1.55, persp: 1500, glare: .35, thick: .4, shadow: .85, tx: 0, ty: 0, spin: false, flat: false },
  turn: 0, autoTurn: false,
  data: {
    photo: null, name: 'Sofia Martins', role: 'Brand Designer', dept: '', company: 'Forma Studio', mono: 'FM',
    tag: 'Design with intention.', est: '', legal: '', email: 'sofia@forma.studio', phone: '+351 912 345 678', mobile: '',
    web: 'forma.studio', street: '', city: 'Lisbon, Portugal', country: '',
    socials: [{ p: 'linkedin', v: '' }, { p: 'instagram', v: '' }, { p: 'behance', v: '' }]
  }
};
export const choices = {
  formats: ['eu', 'us', 'nordic', 'sq'], themes: ['forest', 'indigo', 'midnight', 'copper'],
  fonts: ['grotesk', 'inter', 'playfair'], bodyFonts: ['inter', 'grotesk'],
  platforms: ['linkedin', 'instagram', 'behance', 'web'], templates: templates.map(t => t.id)
};
export const clone = input => structuredClone(input);

# Card Studio

A private, browser-based business card design studio. Build a two-sided card, try a new look, inspect it in 3D, and export it for your next introduction.

**No account, backend, API keys, build step, or third-party runtime requests.** Fonts, QR generation, photo processing and project storage are local to the app/browser.

## Run locally

Node.js 20.11+:

```sh
npm ci
npm run dev
```

Open **http://localhost:3000**. The development server binds to `0.0.0.0` and accepts preview hosts. Set `PORT` to use another port.

The app uses ES modules, so serve it over HTTP rather than opening `index.html` as a `file://` URL. For production, deploy `index.html` and `assets/` to any static host (including GitHub Pages). There is no server-side application to deploy.

## What's in the studio

- **Six visual templates** — Modernist, Editorial, Statement, Essential, Artisan and Executive. Applying a template keeps personal/contact details, photos and print preferences.
- **Live editing** — identity, company details, portraits and cropping, contact lines, up to three social profiles, local vector QR codes, fifteen palettes and fifteen font choices.
- **Four sizes** — EU (85 × 55 mm), US (88.9 × 50.8 mm), Nordic (90 × 50 mm), and square (55 × 55 mm).
- **Preview tools** — both sides, keyboard-accessible flipping, safety guides, zoom and an interactive 3D viewer.
- **Undo/redo** — grouped edits, up to forty design states with a bounded memory budget. Camera/zoom changes do not clutter history. History is session-only.
- **Local autosave** — debounced saves and an honest status indicator, including when browser storage is blocked or full.
- **English and Portuguese** — browser-language detection on first visit; your saved language takes precedence. Switching the interface language does not translate or replace your card content.
- **Accessible workspace** — labelled controls, keyboard tabs, modal focus management, reduced-motion support and contrasting UI text. Arbitrary user-selected card colours can still reduce artwork contrast; review the design and its colour checks before printing.

## Export and backup

**Export card** offers:

| Format | Purpose |
| --- | --- |
| Print / PDF | Uses the browser's print dialog. Choose **Save as PDF**, **100% scale**, **no margins**, **background graphics on**, and **headers/footers off**. |
| Digital contact (`.vcf`) | UTF-8 vCard 4.0 with escaped fields and correctly folded lines. |
| Editable project (`.json`) | Portable backup of the design, contact data, photo and print preferences. Restore it with **Open project**. |

Print profiles include A4 sheets, trim plus bleed, bleed plus crop marks, and a true-size proof. The proof adds a 5 mm cutting margin when crop marks are enabled. Standard print output is **not mirrored**; the optional mirror control is only for transfer media. Always test a sheet and scan the printed QR before making a batch. Colours are sRGB, not a certified CMYK/PDF-X prepress workflow.

Projects from the original `card-studio-corp` format are supported. Imports are size-limited and validated before they change the current card; unknown fonts/formats and unsafe image references are not trusted.

### Your data

The draft is saved in `localStorage` under the existing `cardstudio.corp.v1` key. Clearing browser data, switching browsers, or changing the site's origin does not preserve that draft. Download an editable project for durable backup. Project and vCard files contain the personal information you put in them; share them accordingly.

Images are resized in the browser; raster uploads are limited to 4 MB and 36 megapixels. Project imports are limited to 5 MB. No photo or contact information is sent to a server. Local storage is not encrypted.

## Keyboard shortcuts

| Shortcut | Action |
| --- | --- |
| Ctrl / ⌘ Z | Undo a design change (outside text inputs) |
| Ctrl / ⌘ Shift Z, Ctrl / ⌘ Y | Redo (outside text inputs) |
| Ctrl / ⌘ S | Download an editable project |
| F | Flip the card (outside inputs/dialogs; also works in 3D) |
| P | Open print dialog (outside inputs/dialogs) |
| 3 | Open 3D preview (outside inputs/dialogs) |
| Escape | Close the current dialog |
| Arrow keys, Home, End | Navigate the editor tabs when focused |

Native text undo remains available while an input is focused.

## Tests

```sh
npm test                              # State, import safety, vCard, QR decoding
npx playwright install --with-deps chromium
npm run test:e2e                      # Browser workflows, print dimensions, mobile, accessibility
```

Browser tests cover editing/reload, templates, undo/redo, legacy files, invalid imports, photo persistence, exports, print page dimensions, focus behaviour, localization, denied storage, four responsive widths, and axe WCAG A/AA checks of the editor and dialogs. Set `PLAYWRIGHT_CHROMIUM_EXECUTABLE` to test with an existing Chromium binary.

## Structure

```text
index.html               Semantic workspace and dialog markup
assets/app.js            Existing card renderer, editing, history, storage, 3D and print
assets/state.js          Pure project validation, snapshots, URL and vCard helpers
assets/templates.js      Six visual-only design presets
assets/workspace-copy.js English/Portuguese workspace copy
assets/card-studio.css   Core card geometry, fit, 3D and print styles
assets/templates.css     Actual template artwork (also used in PDFs)
assets/workspace.css     Responsive application UI, independent of card colours
assets/fonts.css         Self-hosted, on-demand font faces
assets/qr.js             UTF-8 vector QR adapter
assets/vendor/           Pinned QR encoder and its MIT notice
scripts/serve.mjs         Small static development server
```

Bundled fonts are SIL OFL licensed; their original notices and package versions are in `assets/fonts/`. The QR encoder is `qrcode-generator` 2.0.4 by Kazuhiko Arase (MIT), with its notice in `assets/vendor/`. Artwork and previews are rendered with HTML, CSS and SVG rather than generated image assets.

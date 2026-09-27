import { test as base, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const test = base.extend({
  page: async ({ page }, use) => {
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await use(page);
    expect(errors, 'No uncaught app errors').toEqual([]);
  }
});
async function boot(page) {
  await page.goto('/');
  await expect(page.locator('#hostFront .f-name')).toContainText('Sofia');
  await page.evaluate(() => document.fonts.ready);
  await expect(page.locator('#saveStatus')).toHaveAttribute('data-status', 'saved');
}
const savedState = page => page.evaluate(() => JSON.parse(localStorage.getItem('cardstudio.corp.v1')));
async function exportProject(page) {
  await page.click('#exportBtn');
  const downloadPromise = page.waitForEvent('download');
  await page.click('#saveBtn');
  const download = await downloadPromise;
  return { download, project: JSON.parse(await readFile(await download.path(), 'utf8')) };
}
async function importProject(page, object) {
  await page.locator('#loadInput').setInputFiles({ name: 'project.json', mimeType: 'application/json', buffer: Buffer.from(typeof object === 'string' ? object : JSON.stringify(object)) });
}

test('boots with local fonts, a real QR code, and no third-party requests', async ({ page }) => {
  const requests = [];
  page.on('request', request => requests.push(request.url()));
  await boot(page);
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect(page.locator('#templateStrip .template-tile')).toHaveCount(4);
  await expect(page.locator('#hostBack .qr-frame svg')).toHaveCount(1);
  await expect(page.locator('#undoBtn')).toBeDisabled();
  expect(requests.every(url => url.startsWith('http://127.0.0.1:3000/') || url.startsWith('data:'))).toBe(true);
  expect(await page.evaluate(() => document.fonts.check('500 16px "Space Grotesk"'))).toBe(true);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(1440);
  const unknown = await page.locator('[data-i18n]').evaluateAll(elements => elements.filter(el => el.textContent === el.dataset.i18n).map(el => el.dataset.i18n));
  expect(unknown).toEqual([]);
});

test('live edits and print settings survive reload', async ({ page }) => {
  await boot(page);
  await page.fill('#f_name', 'Alex Rodrigues');
  await expect(page.locator('#hostFront .f-name')).toContainText('Alex');
  await page.click('[data-tab="tab-net"]');
  await page.fill('#f_email', 'alex@example.org');
  await page.fill('#f_web', 'example.org/hello');
  await page.click('[data-tab="tab-print"]');
  await page.click('[data-preset="marks"]');
  await page.selectOption('#f_bleed', '5');
  await page.selectOption('#f_faces', 'back');
  await page.selectOption('#f_sheet_qty', '2');
  await page.check('#f_gray');
  await expect.poll(async () => (await savedState(page)).print.bleed).toBe(5);
  await page.reload();
  await expect(page.locator('#f_name')).toHaveValue('Alex Rodrigues');
  await page.click('[data-tab="tab-net"]');
  await expect(page.locator('#f_email')).toHaveValue('alex@example.org');
  await page.click('[data-tab="tab-print"]');
  await expect(page.locator('[data-preset="marks"]')).toHaveClass(/active/);
  await expect(page.locator('#f_bleed')).toHaveValue('5');
  await expect(page.locator('#f_faces')).toHaveValue('back');
  await expect(page.locator('#f_gray')).toBeChecked();
  await expect(page.locator('#f_sheet_qty')).toHaveValue('2');
});

test('templates preserve identity, are searchable, and support undo/redo', async ({ page }) => {
  await boot(page);
  await page.fill('#f_name', 'Taylor Almeida');
  await page.click('#templateStrip [data-template-id="editorial"]');
  await expect(page.locator('html')).toHaveAttribute('data-layout', 'editorial');
  await expect(page.locator('#f_name')).toHaveValue('Taylor Almeida');
  await page.click('#undoBtn');
  await expect(page.locator('html')).toHaveAttribute('data-layout', 'atelier');
  await expect(page.locator('#f_name')).toHaveValue('Taylor Almeida');
  await page.click('#redoBtn');
  await expect(page.locator('html')).toHaveAttribute('data-layout', 'editorial');
  await page.locator('[data-open-templates]').first().click();
  await expect(page.locator('#templateDialog')).toBeVisible();
  await page.click('[data-category="bold"]');
  await expect(page.locator('#templateGallery .template-tile')).toHaveCount(1);
  await page.fill('#templateSearch', 'no such template');
  await expect(page.locator('#galleryEmpty')).toBeVisible();
  await page.fill('#templateSearch', '');
  await page.click('[data-category="all"]');
  await page.fill('#templateSearch', 'Executive');
  await expect(page.locator('#templateGallery .template-tile')).toHaveCount(1);
  await page.click('#templateGallery [data-template-id="noir"]');
  await expect(page.locator('#templateDialog')).not.toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('data-variant', 'band');
  await expect(page.locator('#f_name')).toHaveValue('Taylor Almeida');
  await expect.poll(async () => (await savedState(page)).template).toBe('noir');
});

test('undo/redo groups typing, restores style controls and clears stale redo', async ({ page }) => {
  await boot(page);
  await page.fill('#f_name', 'Jordan Costa');
  await page.click('#undoBtn');
  await expect(page.locator('#f_name')).toHaveValue('Sofia Martins');
  await page.click('#redoBtn');
  await expect(page.locator('#f_name')).toHaveValue('Jordan Costa');
  await page.click('[data-tab="tab-style"]');
  await page.selectOption('#f_font_display', 'playfair');
  await page.click('#undoBtn');
  await expect(page.locator('#f_font_display')).toHaveValue('grotesk');
  await page.click('#redoBtn');
  await expect(page.locator('#f_font_display')).toHaveValue('playfair');
  await page.click('#undoBtn');
  await page.click('#templateStrip [data-template-id="electric"]');
  await expect(page.locator('#redoBtn')).toBeDisabled();
});

test('JSON backup round-trips and malformed imports leave the design untouched', async ({ page }) => {
  await boot(page);
  await page.fill('#f_name', 'João Silva');
  const { download, project } = await exportProject(page);
  expect(download.suggestedFilename()).toBe('card-joao-silva.json');
  expect(project.app).toBe('card-studio'); expect(project.v).toBe(2);
  expect(project.state.data.name).toBe('João Silva');
  expect(project.state.data.photo).toBeUndefined();
  await page.fill('#f_name', 'Temporary');
  await importProject(page, project);
  await expect(page.locator('#f_name')).toHaveValue('João Silva');
  await page.click('#undoBtn');
  await expect(page.locator('#f_name')).toHaveValue('Temporary');
  await importProject(page, '{"broken":');
  await expect(page.locator('#toasts')).toContainText('not a valid Card Studio project');
  await expect(page.locator('#f_name')).toHaveValue('Temporary');
  project.state.fmt = 'not-a-format'; project.state.fonts.display = 'bogus'; project.state.photo = 'x" onerror="window.pwned=1';
  project.state.data.name = '<img src=x onerror="window.pwned=2">';
  await importProject(page, project);
  await expect(page.locator('#f_name')).toHaveValue(project.state.data.name);
  await expect(page.locator('#hostFront .f-name img')).toHaveCount(0);
  await expect(page.locator('html')).toHaveAttribute('data-fmt', 'eu');
  expect(await page.evaluate(() => window.pwned)).toBeUndefined();
});

test('legacy project files restore fonts, crop, print settings and language', async ({ page }) => {
  await boot(page);
  const { project } = await exportProject(page);
  project.app = 'card-studio-corp'; project.v = 1;
  delete project.state.layout; delete project.state.template;
  project.state.lang = 'pt'; project.state.fmt = 'us'; project.state.fonts = { display: 'playfair', body: 'lora' };
  project.state.photoX = 72; project.state.photoZoom = 1.4; project.state.weight = 700;
  project.state.print.preset = 'pro'; project.state.print.bleed = 5;
  await importProject(page, project);
  await expect(page.locator('html')).toHaveAttribute('lang', 'pt-PT');
  await expect(page.locator('html')).toHaveAttribute('data-layout', 'classic');
  await expect(page.locator('html')).toHaveAttribute('data-fmt', 'us');
  await expect(page.locator('#f_photo_x')).toHaveValue('72');
  await page.click('[data-tab="tab-style"]');
  await expect(page.locator('#f_font_display')).toHaveValue('playfair');
  await expect(page.locator('#f_font_body')).toHaveValue('lora');
  await expect(page.locator('#f_weight')).toHaveValue('700');
  await page.click('[data-tab="tab-print"]');
  await expect(page.locator('[data-preset="pro"]')).toHaveClass(/active/);
  await expect(page.locator('#f_bleed')).toHaveValue('5');
});

test('digital contact export is escaped, folded, and works with Unicode', async ({ page }) => {
  await boot(page);
  await page.fill('#f_name', 'João, Silva');
  await page.fill('#f_company', 'Studio; Partners');
  await page.click('#exportBtn');
  const downloaded = page.waitForEvent('download');
  await page.click('#vcardBtn');
  const file = await downloaded;
  expect(file.suggestedFilename()).toBe('card-joao-silva.vcf');
  const card = await readFile(await file.path(), 'utf8');
  expect(card).toContain('FN:João\\, Silva\r\n');
  expect(card).toContain('ORG:Studio\\; Partners\r\n');
  expect(card).toContain('URL:https://forma.studio/');
  expect(card.endsWith('END:VCARD\r\n')).toBe(true);
});

test('photo uploads are resized, saved once, and restored to all previews', async ({ page }) => {
  await boot(page);
  await page.locator('#photoInput').setInputFiles(resolve('Retrato.jpg'));
  await expect(page.locator('#hostFront .f-photo-round img')).toHaveCount(1);
  await expect(page.locator('#f_photo_frame')).toHaveValue('round');
  await expect.poll(async () => Boolean((await savedState(page)).photo)).toBe(true);
  let state = await savedState(page);
  expect(state.data.photo).toBeUndefined();
  expect(state.photoW).toBeGreaterThan(0);
  await page.reload();
  await expect(page.locator('#hostFront .f-photo-round img')).toHaveCount(1);
  await page.locator('.editor-disclosure summary').first().click();
  await page.click('#photoClearBtn');
  await expect(page.locator('#hostFront .f-photo-round img')).toHaveCount(0);
  await page.click('#undoBtn');
  await expect(page.locator('#hostFront .f-photo-round img')).toHaveCount(1);
});

test('3D preview traps focus, supports flipping, and returns focus on Escape', async ({ page }) => {
  await boot(page);
  await page.click('#openPopoutBtn');
  await expect(page.locator('#popoutModal')).toHaveAttribute('aria-hidden', 'false');
  await expect(page.locator('#closePopoutBtn')).toBeFocused();
  expect(await page.locator('#workspace').evaluate(el => el.inert)).toBe(true);
  await page.keyboard.press('Shift+Tab');
  await expect(page.locator('#modalPdfBtn')).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(page.locator('#closePopoutBtn')).toBeFocused();
  await page.click('#modalTurnBtn');
  await expect(page.locator('#turnAngle')).toHaveText('180°');
  await page.keyboard.press('Escape');
  await expect(page.locator('#popoutModal')).toHaveAttribute('aria-hidden', 'true');
  await expect(page.locator('#openPopoutBtn')).toBeFocused();
  expect(await page.locator('#workspace').evaluate(el => el.inert)).toBe(false);
});

test('print output is actual-size, preserves both faces, and excludes the editor', async ({ page }) => {
  await boot(page);
  await page.click('[data-tab="tab-print"]');
  await page.click('[data-preset="single"]');
  await page.selectOption('#f_faces', 'both');
  await page.uncheck('#f_marks');
  await page.evaluate(() => { window.print = () => { window.printInvoked = true; }; });
  await page.click('#exportBtn');
  await page.click('#mainPdfBtn');
  await expect.poll(() => page.evaluate(() => Boolean(window.printInvoked))).toBe(true);
  await expect(page.locator('#exportDialog')).not.toBeVisible();
  await expect(page.locator('#print-root .print-page')).toHaveCount(2);
  expect(await page.locator('#page-size').textContent()).toContain('size:85mm 55mm');
  expect(await page.locator('#print-root .face-back').evaluate(el => el.style.transform)).toBe('none');
  await page.emulateMedia({ media: 'print' });
  await expect(page.locator('#workspace')).not.toBeVisible();
  await expect(page.locator('#print-root')).toBeVisible();
  const pdf = await page.pdf({ preferCSSPageSize: true, printBackground: true });
  expect(pdf.subarray(0, 4).toString()).toBe('%PDF');
  const boxes = [...pdf.toString('latin1').matchAll(/\/MediaBox\s*\[\s*0\s+0\s+([\d.]+)\s+([\d.]+)\s*\]/g)];
  expect(boxes).toHaveLength(2);
  for (const box of boxes) {
    expect(Math.abs(Number(box[1]) - 85 * 72 / 25.4)).toBeLessThan(1);
    expect(Math.abs(Number(box[2]) - 55 * 72 / 25.4)).toBeLessThan(1);
  }
});

test('all sizes preserve aspect ratio and safe guides do not affect export', async ({ page }) => {
  await boot(page);
  for (const [id, ratio] of [['eu', 85/55], ['us', 88.9/50.8], ['nordic', 90/50], ['sq', 1]]) {
    await page.click(`[data-set-fmt="${id}"]`);
    const rect = await page.locator('#colFront .card-wrapper').boundingBox();
    expect(Math.abs(rect.width/rect.height - ratio)).toBeLessThan(.01);
  }
  await page.click('#toggleSafeBtn');
  await expect(page.locator('#cardsContainer')).toHaveClass(/show-safe/);
  await page.locator('#colFront .card-wrapper').focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('#cardsContainer')).toHaveAttribute('data-mode', 'flip');
  await expect(page.locator('#stageFlipper')).toHaveAttribute('data-side', 'back');
  await page.click('#quickFlipBtn');
  await expect(page.locator('#stageFlipper')).toHaveAttribute('data-side', 'front');
});

test('tab navigation and localization are accessible and do not overwrite card details', async ({ page }) => {
  await boot(page);
  await page.locator('[data-tab="tab-id"]').focus();
  await page.keyboard.press('ArrowRight');
  await expect(page.locator('[data-tab="tab-net"]')).toHaveAttribute('aria-selected', 'true');
  await expect(page.locator('[data-tab="tab-net"]')).toBeFocused();
  await page.keyboard.press('End');
  await expect(page.locator('[data-tab="tab-print"]')).toBeFocused();
  await page.click('[data-lang-btn="pt"]');
  await expect(page.locator('html')).toHaveAttribute('lang', 'pt-PT');
  await expect(page.locator('[data-i18n="workspace_title"]')).toHaveText('Deixa uma boa impressão.');
  await page.click('[data-tab="tab-id"]');
  await expect(page.locator('#f_role')).toHaveValue('Brand Designer');
  await page.click('[data-lang-btn="en"]');
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
});

test('reset is confirmed and can be undone', async ({ page }) => {
  await boot(page);
  await page.fill('#f_name', 'Do Not Lose This');
  page.once('dialog', dialog => dialog.dismiss());
  await page.click('#resetAllBtn');
  await expect(page.locator('#f_name')).toHaveValue('Do Not Lose This');
  page.once('dialog', dialog => dialog.accept());
  await page.click('#resetAllBtn');
  await expect(page.locator('#f_name')).toHaveValue('Sofia Martins');
  await page.click('#undoBtn');
  await expect(page.locator('#f_name')).toHaveValue('Do Not Lose This');
});

test('blocked local storage is reported honestly and backups still work', async ({ page }) => {
  await page.addInitScript(() => {
    Storage.prototype.setItem = () => { throw new DOMException('Storage blocked', 'QuotaExceededError'); };
  });
  await page.goto('/');
  await expect(page.locator('#saveStatus')).toHaveAttribute('data-status', 'error');
  await expect(page.locator('#saveStatus')).toContainText('Not saved');
  await page.fill('#f_name', 'Keep Me');
  const { project } = await exportProject(page);
  expect(project.state.data.name).toBe('Keep Me');
});

for (const width of [320, 390, 768, 1024]) {
  test(`responsive workspace fits ${width}px without horizontal page overflow`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 });
    await boot(page);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    const stage = await page.locator('#stageViewport').boundingBox();
    for (const id of ['#colFront .card-wrapper', '#colBack .card-wrapper']) {
      const card = await page.locator(id).boundingBox();
      expect(card.x).toBeGreaterThanOrEqual(stage.x);
      expect(card.x+card.width).toBeLessThanOrEqual(stage.x+stage.width+1);
      expect(card.y+card.height).toBeLessThanOrEqual(stage.y+stage.height+1);
    }
    await page.click('[data-set-mode="flip"]');
    await expect(page.locator('#colSingle .card-wrapper')).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    await page.click('#exportBtn');
    const modal = await page.locator('#exportDialog').boundingBox();
    expect(modal.x).toBeGreaterThanOrEqual(0);
    expect(modal.x+modal.width).toBeLessThanOrEqual(width);
  });
}

test('all editor tabs pass automated WCAG A/AA checks', async ({ page }) => {
  await boot(page);
  for (const tab of ['tab-id', 'tab-net', 'tab-style', 'tab-print']) {
    await page.click(`[data-tab="${tab}"]`);
    const result = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
    expect(result.violations, `${tab} accessibility violations`).toEqual([]);
  }
});

test('export, template and help dialogs pass automated WCAG A/AA checks', async ({ page }) => {
  await boot(page);
  for (const [button, dialog] of [['#exportBtn', '#exportDialog'], ['[data-open-templates]', '#templateDialog'], ['#helpBtn', '#helpDialog']]) {
    await page.locator(button).first().click();
    await expect(page.locator(dialog)).toBeVisible();
    const result = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
    expect(result.violations, `${dialog} accessibility violations`).toEqual([]);
    await page.keyboard.press('Escape');
    await expect(page.locator(dialog)).not.toBeVisible();
  }
});

test('long names fit without premature ellipsis and remain printable', async ({ page }) => {
  await boot(page);
  await page.fill('#f_name', 'Alexandrina Fernandes de Albuquerque');
  await expect(page.locator('#hostFront .f-name')).toContainText('Albuquerque');
  await expect.poll(() => page.locator('#hostFront .f-name .ln').evaluateAll(lines => lines.every(line => line.scrollWidth <= line.clientWidth + 1))).toBe(true);
  const size = await page.locator('#hostFront .f-name .ln-1').evaluate(el => parseFloat(getComputedStyle(el).fontSize));
  expect(size).toBeGreaterThan(12);
});

test('print profiles honour bleed, crop margins and the both-sides toggle', async ({ page }) => {
  await boot(page);
  await page.click('[data-tab="tab-print"]');
  await page.uncheck('#f_duplex');
  await expect(page.locator('#f_faces')).toHaveValue('front');
  await page.check('#f_duplex');
  await expect(page.locator('#f_faces')).toHaveValue('both');
  await page.selectOption('#f_bleed', '3');
  for (const [profile, width, height] of [['home', 210, 297], ['pro', 91, 61], ['marks', 101, 71], ['single', 95, 65]]) {
    await page.click(`[data-preset="${profile}"]`);
    await expect(page.locator('#f_mirror')).not.toBeChecked();
    expect(await page.locator('#page-size').textContent()).toContain(`size:${width}mm ${height}mm`);
  }
  await page.selectOption('#f_faces', 'back');
  await expect(page.locator('#f_duplex')).not.toBeChecked();
});

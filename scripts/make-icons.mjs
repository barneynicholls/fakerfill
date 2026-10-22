// Renders extension/icons/icon.svg to the PNG sizes the manifest needs.
// Usage: node scripts/make-icons.mjs   (requires Playwright's Chromium)
import { chromium } from 'playwright';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const dir = fileURLToPath(new URL('../extension/icons/', import.meta.url));
const svg = await readFile(dir + 'icon.svg', 'utf8');
const browser = await chromium.launch();
for (const size of [16, 32, 48, 128]) {
  const page = await browser.newPage({ viewport: { width: size, height: size } });
  await page.setContent(`<style>html,body{margin:0;background:transparent}svg{width:${size}px;height:${size}px;display:block}</style>${svg}`);
  await page.screenshot({ path: `${dir}icon-${size}.png`, omitBackground: true });
  await page.close();
}
await browser.close();
console.log('Icons written to', dir);

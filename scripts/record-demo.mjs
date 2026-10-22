// Records docs/demo.gif: the test page before and after FakerFill runs.
// Usage: npm run demo   (needs Playwright's Chromium, and python3 with Pillow for GIF encoding)
import { chromium } from 'playwright';
import { cp, mkdtemp, readFile, rm, writeFile, mkdir } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { startServer } from './serve.mjs';

const ROOT = fileURLToPath(new URL('../', import.meta.url));
const OUT = join(ROOT, 'docs', 'demo.gif');
const PORT = 8767;
const URL_ = `http://127.0.0.1:${PORT}/`;

// The real shortcut can't be pressed from automation and activeTab needs a user gesture,
// so drive a copy of the extension that has host access from its service worker.
const extDir = await mkdtemp(join(tmpdir(), 'fakerfill-demo-ext-'));
const profile = await mkdtemp(join(tmpdir(), 'fakerfill-demo-profile-'));
const frameDir = await mkdtemp(join(tmpdir(), 'fakerfill-demo-frames-'));
await cp(join(ROOT, 'extension'), extDir, { recursive: true });
const manifest = JSON.parse(await readFile(join(extDir, 'manifest.json'), 'utf8'));
manifest.host_permissions = ['<all_urls>'];
await writeFile(join(extDir, 'manifest.json'), JSON.stringify(manifest));

const server = await startServer(PORT);
const ctx = await chromium.launchPersistentContext(profile, {
  channel: 'chromium',
  headless: true,
  viewport: { width: 960, height: 640 },
  colorScheme: 'light',
  args: [`--disable-extensions-except=${extDir}`, `--load-extension=${extDir}`],
});

const frames = []; // { file, ms }
let n = 0;
async function shot(page, ms) {
  const file = join(frameDir, `${String(n++).padStart(4, '0')}.png`);
  await page.screenshot({ path: file });
  frames.push({ file, ms });
}

// A caption pill in the corner, plus an optional keycap overlay for the shortcut.
async function caption(page, text, keys = false) {
  await page.evaluate(({ text, keys }) => {
    let el = document.getElementById('demo-caption');
    if (!el) {
      el = document.createElement('div');
      el.id = 'demo-caption';
      el.style.cssText = 'position:fixed;top:16px;right:16px;z-index:9999;padding:8px 16px;border-radius:99px;font:700 15px system-ui,sans-serif;color:#fff;box-shadow:0 6px 20px rgba(0,0,0,.25)';
      document.body.append(el);
    }
    el.textContent = text;
    el.style.background = text === 'After' ? '#15803d' : '#475569';
    let k = document.getElementById('demo-keys');
    if (keys && !k) {
      k = document.createElement('div');
      k.id = 'demo-keys';
      k.style.cssText = 'position:fixed;left:50%;top:50%;transform:translate(-50%,-50%);z-index:9999;display:flex;gap:10px;align-items:center;padding:18px 26px;border-radius:18px;background:rgba(28,24,48,.88);color:#fff;font:700 26px system-ui,sans-serif;box-shadow:0 20px 50px rgba(0,0,0,.35)';
      const cap = (t) => `<span style="display:inline-block;padding:8px 16px;border-radius:10px;background:#fff;color:#1c1830;border-bottom:4px solid #c4b5fd;font:700 22px ui-monospace,Menlo,monospace">${t}</span>`;
      k.innerHTML = `${cap('Alt')}+${cap('Shift')}+${cap('F')}`;
      document.body.append(k);
    }
    if (!keys && k) k.remove();
  }, { text, keys });
}

async function fill(worker) {
  return worker.evaluate(async (url) => {
    const [tab] = await chrome.tabs.query({ url: url + '*' });
    // eslint-disable-next-line no-undef
    return runFill(tab);
  }, URL_);
}

async function scrollTo(page, selector) {
  await page.evaluate((sel) => {
    document.documentElement.style.scrollBehavior = 'auto';
    const top = document.querySelector(sel).getBoundingClientRect().top + window.scrollY - 12;
    window.scrollTo(0, top);
  }, selector);
}

try {
  let [worker] = ctx.serviceWorkers();
  if (!worker) worker = await ctx.waitForEvent('serviceworker');
  const page = await ctx.newPage();
  await page.goto(URL_);
  await page.addStyleTag({ content: 'html{scroll-behavior:auto!important} *{caret-color:transparent!important}' });

  // Scene 1: sign-up form.
  await scrollTo(page, '#signup');
  await caption(page, 'Before');
  await shot(page, 1400);
  await caption(page, 'Before', true);
  await shot(page, 900);
  await caption(page, 'After');
  await fill(worker);
  // Filled fields flash a purple outline that fades out over ~1.6s.
  for (let i = 0; i < 8; i++) {
    await shot(page, 150);
    await page.waitForTimeout(150);
  }
  await shot(page, 2200);

  // Scene 2: the address and payment forms, before and after.
  await page.click('#reset-all');
  await scrollTo(page, '#address');
  await caption(page, 'Before');
  await shot(page, 1200);
  await caption(page, 'Before', true);
  await shot(page, 800);
  await caption(page, 'After');
  await fill(worker);
  for (let i = 0; i < 6; i++) {
    await shot(page, 150);
    await page.waitForTimeout(150);
  }
  await shot(page, 1600);
  await scrollTo(page, '#payment');
  await page.waitForTimeout(1700); // let the highlight fade before the final frame
  await shot(page, 2600);
} finally {
  await ctx.close();
  server.close();
}

// Encode with Pillow: shared adaptive palette, per-frame durations.
await mkdir(join(ROOT, 'docs'), { recursive: true });
const py = `
import json, sys
from PIL import Image
frames = json.loads(sys.argv[1])
out = sys.argv[2]
imgs = [Image.open(f['file']).convert('RGB').resize((800, 533), Image.LANCZOS) for f in frames]
palette = imgs[-1].quantize(colors=128, method=Image.Quantize.MEDIANCUT)
q = [im.quantize(palette=palette, dither=Image.Dither.NONE) for im in imgs]
q[0].save(out, save_all=True, append_images=q[1:], duration=[f['ms'] for f in frames], loop=0, optimize=True, disposal=1)
`;
execFileSync('python3', ['-I', '-c', py, JSON.stringify(frames), OUT], { stdio: 'inherit' });
await rm(extDir, { recursive: true, force: true });
await rm(profile, { recursive: true, force: true });
await rm(frameDir, { recursive: true, force: true });
console.log(`Wrote ${OUT} (${frames.length} frames)`);

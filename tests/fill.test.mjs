// End-to-end checks against the companion test page.
// Run with `npm test` (needs Playwright's Chromium).
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { cp, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { startServer } from '../scripts/serve.mjs';

const EXT = fileURLToPath(new URL('../extension/', import.meta.url));
const PORT = 8765;
const URL_ = `http://127.0.0.1:${PORT}/`;

let server, browser;
before(async () => {
  server = await startServer(PORT);
  browser = await chromium.launch();
});
after(async () => {
  await browser?.close();
  server?.close();
});

async function openWithScripts() {
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e));
  await page.goto(URL_);
  await page.addScriptTag({ path: join(EXT, 'content/faker.js') });
  await page.addScriptTag({ path: join(EXT, 'content/filler.js') });
  return { page, errors };
}

// Every [data-expect] field, including ones in shadow roots, with its detected type.
const detectAll = () => {
  const out = [];
  const walk = (root) => {
    for (const el of root.querySelectorAll('[data-expect]')) {
      out.push({ name: el.name, expect: el.dataset.expect, got: globalThis.__fakerfill.classify(el).type });
    }
    for (const h of root.querySelectorAll('*')) if (h.shadowRoot) walk(h.shadowRoot);
  };
  walk(document);
  return out;
};

test('field detection matches the test page expectations', async () => {
  const { page } = await openWithScripts();
  const results = await page.evaluate(detectAll);
  const wrong = results.filter((r) => r.expect !== 'none' && r.expect !== r.got);
  assert.deepEqual(wrong, [], `misdetected:\n${wrong.map((w) => `  ${w.name}: expected ${w.expect}, got ${w.got}`).join('\n')}`);
  assert.ok(results.length > 60, `expected many annotated fields, found ${results.length}`);
  await page.close();
});

test('fill populates fields sensibly and leaves protected fields alone', async () => {
  const { page, errors } = await openWithScripts();
  const report = await page.evaluate(() => globalThis.__fakerfill.fill({ options: { highlight: false } }, 'page'));
  assert.ok(report.filled > 70, `filled ${report.filled}`);

  const v = (sel) => page.$eval(sel, (el) => el.value);
  // Consistency within one persona.
  assert.equal(await v('[name=email]'), await v('[name=email_confirm]'));
  assert.equal(await v('[name=password]'), await v('[name=password_confirmation]'));
  assert.ok((await v('[name=password]')).length >= 10, 'password respects minlength');
  assert.match(await v('[name=email]'), /^[a-z0-9.'-]+@[a-z.]+$/);
  const first = (await v('[name=first_name]')).toLowerCase();
  assert.ok((await v('[name=email]')).startsWith(first.replace(/[^a-z]/g, '')), 'email derived from first name');

  // Selects pick real options and match the address.
  assert.equal(await v('[name=shipping_country]'), 'GB');
  assert.notEqual(await v('[name=title]'), '');
  assert.notEqual(await v('[name=room]'), '');
  assert.notEqual(await v('[name=room]'), 'sold-out');
  assert.match(await v('[name=exp_month]'), /^(0[1-9]|1[0-2])$/);

  // Card number passes Luhn.
  const card = await v('[name=cardnumber]');
  const luhn = [...card].reverse().map(Number).reduce((s, d, i) => s + (i % 2 ? (d * 2 > 9 ? d * 2 - 9 : d * 2) : d), 0);
  assert.equal(luhn % 10, 0, `card ${card} fails Luhn`);
  assert.match(await v('[name=expiry]'), /^\d{2}\/\d{2}$/);

  // Constraints.
  assert.ok((await v('[name=town]')).length <= 5, 'maxlength respected');
  const guests = Number(await v('[name=guests]'));
  assert.ok(guests >= 1 && guests <= 6, `guests ${guests} within 1–6`);
  const amount = Number(await v('[name=amount]'));
  assert.ok(amount >= 1 && amount <= 500, `amount ${amount} within 1–500`);
  assert.equal(Number(await v('[name=salary]')) % 1000, 0, 'salary respects step');
  assert.match(await v('[name=postcode]'), /^[A-Z]{1,2}[0-9][0-9A-Z]? ?[0-9][A-Z]{2}$/);
  assert.ok(await page.$eval('[name=postcode]', (el) => el.checkValidity()));
  assert.ok(await page.$eval('[name=start_date]', (el) => new Date(el.value) > new Date()), 'start date in future');
  assert.match(await v('[name=favourite_colour]'), /^#[0-9a-f]{6}$/);

  // Radios and checkboxes.
  assert.ok(await page.$eval('[name=terms]', (el) => el.checked), 'required checkbox ticked');
  assert.equal(await page.$$eval('[name=gender]:checked', (els) => els.length), 1);

  // Things that must be left alone.
  assert.equal(await v('[name=disabled_name]'), 'unchanged');
  assert.equal(await v('[name=readonly_name]'), 'unchanged');
  assert.equal(await v('[name=q]'), '');
  assert.equal(await v('[name=captcha_answer]'), '');
  assert.equal(await v('[name=website_hp]'), '', 'off-screen honeypot left empty');
  assert.equal(await v('[name=csrf_token]'), 'abc123');

  // Framework-style state and shadow DOM.
  const state = await page.$eval('#controlled-state', (el) => el.textContent);
  assert.match(state, /"emailAddress": ".+@.+"/, 'controlled component saw input events');
  assert.match(state, /"plan": "(free|pro)"/);
  const shadowEmail = await page.$eval('shadow-signup', (el) => el.shadowRoot.querySelector('[name=work_email]').value);
  assert.match(shadowEmail, /@/);

  assert.deepEqual(errors, []);
  await page.close();
});

test('custom rules override detection', async () => {
  const { page } = await openWithScripts();
  await page.$eval('[name=internal_notes]', (el) => { el.value = 'keep me'; });
  const settings = {
    options: { highlight: false },
    rules: [
      { enabled: true, field: 'employee_ref', matchType: 'exact', action: 'fill', value: 'EMP-{{digits:5}}' },
      { enabled: true, field: 'promo', matchType: 'contains', action: 'fill', value: '{{oneOf:SAVE10,WELCOME}}' },
      { enabled: true, field: 'team', matchType: 'exact', action: 'fill', value: 'Data' },
      { enabled: true, field: '^marketing', matchType: 'regex', action: 'fill', value: 'true' },
      { enabled: true, field: 'internal_notes', matchType: 'exact', action: 'skip', value: '' },
      { enabled: true, field: 'Email address', matchType: 'exact', action: 'fill', value: 'fixed@example.com' },
      { enabled: true, field: 'first_name', matchType: 'exact', action: 'fill', value: 'Ignored', site: 'nowhere.example' },
      { enabled: false, field: 'last_name', matchType: 'exact', action: 'fill', value: 'Disabled' },
    ],
  };
  await page.evaluate((s) => globalThis.__fakerfill.fill(s, 'page'), settings);
  const v = (sel) => page.$eval(sel, (el) => el.value);
  assert.match(await v('[name=employee_ref]'), /^EMP-\d{5}$/);
  assert.match(await v('[name=promo]'), /^(SAVE10|WELCOME)$/);
  assert.equal(await v('[name=team]'), 'Data');
  assert.ok(await page.$eval('[name=marketing_opt_in]', (el) => el.checked));
  assert.equal(await v('[name=internal_notes]'), 'keep me');
  assert.equal(await v('[name=input_4]'), 'fixed@example.com', 'rule matched by aria-label');
  assert.notEqual(await v('[name=first_name]'), 'Ignored', 'site-scoped rule ignored elsewhere');
  assert.notEqual(await v('[name=last_name]'), 'Disabled', 'disabled rule ignored');
  await page.close();
});

test('form scope fills only the focused form; overwrite=false keeps values', async () => {
  const { page } = await openWithScripts();
  await page.focus('#contact [name="contact[email]"]');
  await page.evaluate(() => globalThis.__fakerfill.fill({ options: { highlight: false } }, 'form'));
  assert.notEqual(await page.$eval('[name="contact[name]"]', (el) => el.value), '');
  assert.equal(await page.$eval('[name=first_name]', (el) => el.value), '', 'other forms untouched');

  await page.fill('[name=first_name]', 'Barney');
  await page.evaluate(() => globalThis.__fakerfill.fill({ options: { highlight: false, overwrite: false } }, 'page'));
  assert.equal(await page.$eval('[name=first_name]', (el) => el.value), 'Barney');
  assert.notEqual(await page.$eval('[name=last_name]', (el) => el.value), '');
  await page.close();
});

test('US locale produces US-style data', async () => {
  const { page } = await openWithScripts();
  await page.evaluate(() => globalThis.__fakerfill.fill({ options: { highlight: false, locale: 'en-US' } }, 'page'));
  assert.equal(await page.$eval('[name=shipping_country]', (el) => el.value), 'US');
  assert.match(await page.$eval('[name=shipping_phone]', (el) => el.value), /^\(\d{3}\) 555-01\d{2}$/);
  await page.close();
});

test('the packaged extension loads and fills the page end to end', async () => {
  // Shortcuts can't be pressed from automation, and activeTab is only granted by a real
  // user gesture, so test a copy of the extension with host access and drive it from the worker.
  const dir = await mkdtemp(join(tmpdir(), 'fakerfill-ext-'));
  const profile = await mkdtemp(join(tmpdir(), 'fakerfill-profile-'));
  await cp(EXT, dir, { recursive: true });
  const manifest = JSON.parse(await readFile(join(dir, 'manifest.json'), 'utf8'));
  manifest.host_permissions = ['<all_urls>'];
  await writeFile(join(dir, 'manifest.json'), JSON.stringify(manifest));

  const ctx = await chromium.launchPersistentContext(profile, {
    channel: 'chromium',
    headless: true,
    args: [`--disable-extensions-except=${dir}`, `--load-extension=${dir}`],
  });
  try {
    let [worker] = ctx.serviceWorkers();
    if (!worker) worker = await ctx.waitForEvent('serviceworker');
    const extId = new URL(worker.url()).host;

    const page = await ctx.newPage();
    await page.goto(URL_);
    const result = await worker.evaluate(async (url) => {
      const [tab] = await chrome.tabs.query({ url: url + '*' });
      // eslint-disable-next-line no-undef
      return runFill(tab);
    }, URL_);
    assert.ok(!result.error, result.error);
    assert.ok(result.filled > 75, `filled ${result.filled} (includes iframe)`);
    assert.match(await page.$eval('[name=email]', (el) => el.value), /@/);
    const frameEmail = await page.frameLocator('#iframe iframe').locator('[name=EMAIL]').inputValue();
    assert.equal(frameEmail, await page.$eval('[name=email]', (el) => el.value), 'same-origin iframe filled with the same persona');
    assert.equal(await page.$eval('#show-expect', (el) => el.checked), false, 'data-fakerfill-ignore respected');

    // Options and popup pages render without script errors.
    for (const path of ['options/options.html', 'popup/popup.html']) {
      const p = await ctx.newPage();
      const errs = [];
      p.on('pageerror', (e) => errs.push(e.message));
      await p.goto(`chrome-extension://${extId}/${path}`);
      await p.waitForTimeout(300);
      assert.deepEqual(errs, [], `${path} errors`);
      if (path.startsWith('options')) {
        assert.equal(await p.locator('.rule').count(), 1, 'default example rule shown');
        await p.click('#add-rule');
        await p.fill('.rule:last-child [data-k="field"]', 'employee_ref');
        await p.fill('.rule:last-child [data-k="value"]', 'EMP-{{digits:4}}');
        await p.waitForTimeout(500);
        const stored = await worker.evaluate(() => chrome.storage.local.get('rules'));
        assert.equal(stored.rules.at(-1).field, 'employee_ref');
        assert.match(await p.locator('.rule:last-child .preview').textContent(), /EMP-\d{4}/);
      }
      await p.close();
    }

    // The saved rule is applied on the next fill.
    await worker.evaluate(async (url) => {
      const [tab] = await chrome.tabs.query({ url: url + '*' });
      // eslint-disable-next-line no-undef
      return runFill(tab);
    }, URL_);
    assert.match(await page.$eval('[name=employee_ref]', (el) => el.value), /^EMP-\d{4}$/);
  } finally {
    await ctx.close();
    await rm(dir, { recursive: true, force: true });
    await rm(profile, { recursive: true, force: true });
  }
});

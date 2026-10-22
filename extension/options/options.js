// FakerFill – options page: behaviour settings, field rules, shortcut, import/export.
/* global DEFAULT_SETTINGS, getSettings, saveSettings, renderShortcut, openShortcutSettings, canEditShortcut */
const $ = (sel, root = document) => root.querySelector(sel);
const { faker } = globalThis.__fakerfill;

let settings;
let saveTimer;

function newId() {
  return Math.random().toString(36).slice(2, 10);
}

function markSaved() {
  const el = $('#saved');
  el.textContent = 'Saved ✓';
  clearTimeout(markSaved.t);
  markSaved.t = setTimeout(() => { el.textContent = ''; }, 1500);
}

function scheduleSave() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(async () => {
    await saveSettings(settings);
    markSaved();
  }, 250);
}

// ----- Behaviour ---------------------------------------------------------------

function renderOptions() {
  for (const el of document.querySelectorAll('[data-opt]')) {
    const key = el.dataset.opt;
    if (el.type === 'checkbox') el.checked = !!settings.options[key];
    else el.value = settings.options[key];
  }
}

for (const el of document.querySelectorAll('[data-opt]')) {
  el.addEventListener('change', () => {
    settings.options[el.dataset.opt] = el.type === 'checkbox' ? el.checked : el.value;
    scheduleSave();
  });
}

// ----- Rules -------------------------------------------------------------------

const TOKEN_NAMES = Object.keys(faker.GENERATOR_INFO);

function preview(value) {
  try {
    return value ? `e.g. ${faker.expand(value, faker.createPersona(settings.options.locale), {})}` : '';
  } catch {
    return '';
  }
}

function renderRules(flashId) {
  const list = $('#rules');
  list.textContent = '';
  $('#no-rules').hidden = settings.rules.length > 0;
  settings.rules.forEach((rule, index) => {
    const node = $('#rule-tpl').content.firstElementChild.cloneNode(true);
    node.dataset.id = rule.id;
    node.classList.toggle('disabled', rule.enabled === false);

    for (const input of node.querySelectorAll('[data-k]')) {
      const k = input.dataset.k;
      if (input.type === 'checkbox') input.checked = rule[k] !== false;
      else input.value = rule[k] ?? '';
      input.addEventListener(input.tagName === 'SELECT' || input.type === 'checkbox' ? 'change' : 'input', () => {
        rule[k] = input.type === 'checkbox' ? input.checked : input.value;
        if (k === 'enabled') node.classList.toggle('disabled', !input.checked);
        if (k === 'action') syncAction();
        if (k === 'value') $('.preview', node).textContent = preview(rule.value);
        if (k === 'field' || k === 'matchType') validate();
        scheduleSave();
      });
    }

    const valueLabel = $('.value', node);
    const syncAction = () => { valueLabel.hidden = rule.action === 'skip'; };
    syncAction();

    const fieldInput = $('[data-k="field"]', node);
    const validate = () => {
      let msg = '';
      if (rule.matchType === 'regex') {
        try { new RegExp(rule.field, 'i'); } catch (e) { msg = `Invalid regex: ${e.message}`; }
      }
      fieldInput.setCustomValidity(msg);
      fieldInput.title = msg;
    };
    validate();

    const insert = $('.token-insert', node);
    for (const name of TOKEN_NAMES) {
      const opt = document.createElement('option');
      opt.value = name;
      opt.textContent = `${faker.GENERATOR_INFO[name]}`;
      insert.append(opt);
    }
    insert.addEventListener('change', () => {
      if (!insert.value) return;
      const input = $('[data-k="value"]', node);
      const token = `{{${insert.value}}}`;
      const pos = input.selectionStart ?? input.value.length;
      input.value = input.value.slice(0, pos) + token + input.value.slice(input.selectionEnd ?? pos);
      insert.value = '';
      input.dispatchEvent(new Event('input'));
      input.focus();
    });
    $('.preview', node).textContent = preview(rule.value);

    $('.up', node).disabled = index === 0;
    $('.down', node).disabled = index === settings.rules.length - 1;
    $('.up', node).addEventListener('click', () => move(index, -1));
    $('.down', node).addEventListener('click', () => move(index, 1));
    $('.delete', node).addEventListener('click', () => {
      settings.rules.splice(index, 1);
      renderRules();
      scheduleSave();
    });

    list.append(node);
    if (rule.id === flashId) {
      node.classList.add('flash');
      node.scrollIntoView({ behavior: 'smooth', block: 'center' });
      $('[data-k="value"]', node).focus();
    }
  });
}

function move(index, delta) {
  const [rule] = settings.rules.splice(index, 1);
  settings.rules.splice(index + delta, 0, rule);
  renderRules();
  scheduleSave();
}

function addRule(partial = {}) {
  const rule = { id: newId(), enabled: true, site: '', field: '', matchType: 'contains', action: 'fill', value: '', ...partial };
  settings.rules.push(rule);
  renderRules(rule.id);
  if (!partial.field) $(`[data-id="${rule.id}"] [data-k="field"]`).focus();
  scheduleSave();
}

$('#add-rule').addEventListener('click', () => addRule());

// A field captured via the "Create FakerFill rule for this field…" context menu.
async function consumePendingRule() {
  const { pendingRule } = await chrome.storage.local.get('pendingRule');
  if (!pendingRule) return;
  await chrome.storage.local.remove('pendingRule');
  const field = pendingRule.name || pendingRule.id || pendingRule.label || pendingRule.placeholder;
  const guess = pendingRule.guess && faker.generators[pendingRule.guess] ? `{{${pendingRule.guess}}}` : '';
  addRule({ field, matchType: 'exact', site: pendingRule.host || '', value: guess });
}

// ----- Tokens ------------------------------------------------------------------

function renderTokens() {
  const box = $('#tokens');
  for (const name of TOKEN_NAMES) {
    const b = document.createElement('button');
    const code = document.createElement('code');
    code.textContent = `{{${name}}}`;
    const desc = document.createElement('span');
    desc.textContent = faker.GENERATOR_INFO[name];
    b.append(code, desc);
    b.title = 'Copy';
    b.addEventListener('click', async () => {
      await navigator.clipboard.writeText(`{{${name}}}`).catch(() => {});
      desc.textContent = 'Copied!';
      setTimeout(() => { desc.textContent = faker.GENERATOR_INFO[name]; }, 900);
    });
    box.append(b);
  }
}

// ----- Shortcut ----------------------------------------------------------------

async function renderShortcutSection() {
  const cmds = await chrome.commands.getAll();
  const cmd = cmds.find((c) => c.name === 'fill-page');
  renderShortcut($('#shortcut-current'), cmd && cmd.shortcut);
  if (canEditShortcut) {
    $('#shortcut-edit').hidden = false;
    $('#shortcut-input').value = (cmd && cmd.shortcut) || '';
  } else {
    $('#shortcut-link').hidden = false;
  }
}

$('#shortcut-open').addEventListener('click', () => openShortcutSettings());
$('#shortcut-save').addEventListener('click', async () => {
  const msg = $('#shortcut-msg');
  try {
    await chrome.commands.update({ name: 'fill-page', shortcut: $('#shortcut-input').value.trim() });
    msg.textContent = 'Shortcut updated.';
    renderShortcutSection();
  } catch (e) {
    msg.textContent = `Not a valid shortcut: ${e.message}`;
  }
});

// ----- Backup ------------------------------------------------------------------

$('#export').addEventListener('click', () => {
  const blob = new Blob([JSON.stringify({ fakerfill: 1, ...settings }, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'fakerfill-settings.json';
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
});

$('#import').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  e.target.value = '';
  if (!file) return;
  try {
    const data = JSON.parse(await file.text());
    if (!Array.isArray(data.rules)) throw new Error('missing "rules" array');
    settings = {
      options: { ...DEFAULT_SETTINGS.options, ...(data.options || {}) },
      rules: data.rules.map((r) => ({ id: newId(), enabled: true, site: '', matchType: 'contains', action: 'fill', value: '', ...r })),
    };
    await saveSettings(settings);
    renderOptions();
    renderRules();
    $('#backup-msg').textContent = `Imported ${settings.rules.length} rule(s).`;
  } catch (err) {
    $('#backup-msg').textContent = `Import failed: ${err.message}`;
  }
});

$('#reset').addEventListener('click', async () => {
  if (!confirm('Reset all FakerFill settings and delete your rules?')) return;
  settings = structuredClone(DEFAULT_SETTINGS);
  await saveSettings(settings);
  renderOptions();
  renderRules();
  $('#backup-msg').textContent = 'Settings reset.';
});

// ----- Init --------------------------------------------------------------------

(async () => {
  settings = await getSettings();
  renderOptions();
  renderRules();
  renderTokens();
  renderShortcutSection();
  await consumePendingRule();
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && changes.pendingRule && changes.pendingRule.newValue) consumePendingRule();
  });
})();

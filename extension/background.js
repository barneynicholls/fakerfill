// FakerFill – background worker: keyboard shortcut, context menu and popup entry points.
/* global getSettings */
if (typeof importScripts === 'function' && typeof getSettings === 'undefined') {
  importScripts('shared/settings.js'); // Chrome service worker; Firefox loads it via manifest "scripts".
}

const CONTENT_FILES = ['content/faker.js', 'content/filler.js'];

async function inject(target) {
  try {
    await chrome.scripting.executeScript({ target, files: CONTENT_FILES });
    return target;
  } catch (err) {
    // allFrames fails outright on some pages with cross-origin frames; fall back to the top frame.
    if (!target.allFrames) throw err;
    const topOnly = { tabId: target.tabId };
    await chrome.scripting.executeScript({ target: topOnly, files: CONTENT_FILES });
    return topOnly;
  }
}

async function flashBadge(tabId, text, color, title) {
  try {
    await chrome.action.setBadgeBackgroundColor({ tabId, color });
    await chrome.action.setBadgeText({ tabId, text });
    if (title) await chrome.action.setTitle({ tabId, title });
    setTimeout(() => {
      chrome.action.setBadgeText({ tabId, text: '' }).catch(() => {});
      chrome.action.setTitle({ tabId, title: 'FakerFill' }).catch(() => {});
    }, 4000);
  } catch {
    // Tab closed – nothing to show.
  }
}

/**
 * Fill a tab. scope is 'page' (every field) or 'form' (only the form around the focused field).
 * frameId limits the fill to one frame, e.g. the frame a context menu was opened in.
 */
async function runFill(tab, scope, frameId) {
  if (!tab || tab.id == null) return { error: 'No active tab' };
  try {
    const settings = await getSettings();
    const effectiveScope = scope || settings.options.scope;
    const target = await inject(frameId != null ? { tabId: tab.id, frameIds: [frameId] } : { tabId: tab.id, allFrames: true });
    const [{ result: persona } = {}] = await chrome.scripting.executeScript({
      target: { tabId: tab.id, frameIds: [frameId != null ? frameId : 0] },
      func: (locale) => globalThis.__fakerfill.faker.createPersona(locale),
      args: [settings.options.locale],
    });
    const results = await chrome.scripting.executeScript({
      target,
      func: (s, sc, p) => globalThis.__fakerfill.fill(s, sc, p),
      args: [settings, effectiveScope, persona || null],
    });
    const fields = results.flatMap((r) => (r && r.result ? r.result.fields : []));
    const filled = results.reduce((n, r) => n + ((r && r.result && r.result.filled) || 0), 0);
    await chrome.storage.local.set({ lastReport: { url: tab.url || '', at: Date.now(), filled, fields: fields.slice(0, 200) } });
    await flashBadge(tab.id, String(filled), '#7c3aed', `FakerFill: filled ${filled} field${filled === 1 ? '' : 's'}`);
    return { filled, fields };
  } catch (err) {
    const message = String((err && err.message) || err);
    await flashBadge(tab.id, '!', '#dc2626', `FakerFill can't run here: ${message}`);
    return { error: message };
  }
}

// Reads the focused field in the frame the user right-clicked, then opens the
// options page with a new rule pre-filled for it.
async function createRuleFromField(tab, frameId) {
  try {
    const target = await inject({ tabId: tab.id, frameIds: [frameId || 0] });
    const [res] = await chrome.scripting.executeScript({ target, func: () => globalThis.__fakerfill.inspectFocused() });
    if (res && res.result) await chrome.storage.local.set({ pendingRule: res.result });
  } catch {
    // Still open the options page so the user can add the rule by hand.
  }
  await chrome.runtime.openOptionsPage();
}

chrome.commands.onCommand.addListener(async (command, tab) => {
  if (!tab) [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (command === 'fill-page') runFill(tab);
  else if (command === 'fill-form') runFill(tab, 'form');
});

function createMenus() {
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({ id: 'fakerfill-page', title: 'Fill page with fake data', contexts: ['page', 'frame', 'editable'] });
    chrome.contextMenus.create({ id: 'fakerfill-form', title: 'Fill this form only', contexts: ['editable'] });
    chrome.contextMenus.create({ id: 'fakerfill-rule', title: 'Create FakerFill rule for this field…', contexts: ['editable'] });
  });
}
chrome.runtime.onInstalled.addListener(createMenus);
chrome.runtime.onStartup.addListener(createMenus);

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'fakerfill-page') runFill(tab, 'page');
  else if (info.menuItemId === 'fakerfill-form') runFill(tab, 'form', info.frameId);
  else if (info.menuItemId === 'fakerfill-rule') createRuleFromField(tab, info.frameId);
});

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg && msg.type === 'fill') {
    chrome.tabs.get(msg.tabId).then((tab) => runFill(tab, msg.scope)).then(sendResponse);
    return true; // async response
  }
  return false;
});

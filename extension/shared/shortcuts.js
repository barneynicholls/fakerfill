// FakerFill – helpers for showing and changing the keyboard shortcut.
/* exported renderShortcut, openShortcutSettings, canEditShortcut */
function renderShortcut(el, shortcut) {
  el.textContent = '';
  if (!shortcut) {
    el.textContent = 'not set';
    return;
  }
  shortcut.split('+').forEach((key, i) => {
    if (i) el.append('+');
    const kbd = document.createElement('kbd');
    kbd.textContent = key;
    el.append(kbd);
  });
}

// Firefox lets extensions change their own shortcuts; Chrome/Edge only via their settings page.
const canEditShortcut = typeof chrome.commands.update === 'function';

function openShortcutSettings() {
  const ua = navigator.userAgent;
  if (canEditShortcut) return chrome.runtime.openOptionsPage();
  const url = /Edg\//.test(ua) ? 'edge://extensions/shortcuts' : 'chrome://extensions/shortcuts';
  return chrome.tabs.create({ url });
}

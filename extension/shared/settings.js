// FakerFill – settings shared by the background worker, popup and options page.
/* exported DEFAULT_SETTINGS, getSettings, saveSettings */
var DEFAULT_SETTINGS = {
  options: {
    scope: 'page', // what Alt+Shift+F fills: 'page' or 'form' (the form containing the focused field)
    overwrite: true, // replace values already in fields
    fillHidden: false, // also fill invisible fields (may trip honeypots)
    checkboxes: 'random', // 'random' | 'all' | 'none' – required/"I agree" boxes are always ticked
    highlight: true, // briefly outline each filled field
    locale: 'en-GB', // 'en-GB' | 'en-US'
  },
  rules: [
    {
      id: 'example-email',
      enabled: false,
      site: '',
      field: 'email',
      matchType: 'contains',
      action: 'fill',
      value: 'test+{{firstName}}{{digits:4}}@example.com',
    },
  ],
};

async function getSettings() {
  const stored = await chrome.storage.local.get(['options', 'rules']);
  return {
    options: { ...DEFAULT_SETTINGS.options, ...(stored.options || {}) },
    rules: Array.isArray(stored.rules) ? stored.rules : DEFAULT_SETTINGS.rules,
  };
}

async function saveSettings(settings) {
  await chrome.storage.local.set({ options: settings.options, rules: settings.rules });
}

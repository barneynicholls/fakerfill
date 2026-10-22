// FakerFill – toolbar popup.
/* global renderShortcut, openShortcutSettings */
const $ = (sel) => document.querySelector(sel);

async function activeTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

async function fill(scope) {
  const status = $('#status');
  status.className = '';
  status.textContent = 'Filling…';
  const tab = await activeTab();
  const res = await chrome.runtime.sendMessage({ type: 'fill', tabId: tab.id, scope });
  if (!res || res.error) {
    status.className = 'error';
    status.textContent = `Can't fill this page${res && res.error ? `: ${res.error}` : ''}`;
    return;
  }
  status.className = 'ok';
  status.textContent = `Filled ${res.filled} field${res.filled === 1 ? '' : 's'}.`;
  renderReport({ filled: res.filled, fields: res.fields });
}

function renderReport(report) {
  if (!report || !report.fields || !report.fields.length) return;
  $('#report').hidden = false;
  $('#report-count').textContent = `(${report.filled})`;
  const tbody = $('#report tbody');
  tbody.textContent = '';
  for (const f of report.fields) {
    const tr = document.createElement('tr');
    for (const v of [f.field, f.type, f.value]) {
      const td = document.createElement('td');
      td.textContent = v == null ? '' : String(v);
      td.title = `${td.textContent}${v === f.type && f.source ? ` — ${f.source}` : ''}`;
      tr.append(td);
    }
    tbody.append(tr);
  }
}

$('#fill-page').addEventListener('click', () => fill('page'));
$('#fill-form').addEventListener('click', () => fill('form'));
$('#open-options').addEventListener('click', (e) => { e.preventDefault(); chrome.runtime.openOptionsPage(); window.close(); });
$('#open-shortcuts').addEventListener('click', (e) => { e.preventDefault(); openShortcutSettings(); window.close(); });

chrome.commands.getAll().then((cmds) => {
  const cmd = cmds.find((c) => c.name === 'fill-page');
  renderShortcut($('#shortcut'), cmd && cmd.shortcut);
});

(async () => {
  const tab = await activeTab();
  const { lastReport } = await chrome.storage.local.get('lastReport');
  if (lastReport && tab && lastReport.url === tab.url) renderReport(lastReport);
})();

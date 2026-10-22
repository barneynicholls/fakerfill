// Test page behaviour: show submitted data instead of navigating, clear forms,
// a fake "controlled component", and a shadow-DOM form.

// Populate the card expiry year select with the next 10 years.
const yearSelect = document.getElementById('exp-year');
const thisYear = new Date().getFullYear();
for (let y = thisYear; y < thisYear + 10; y++) yearSelect.add(new Option(String(y), String(y)));

function formToObject(form) {
  const out = {};
  for (const [k, v] of new FormData(form)) {
    const value = v instanceof File ? (v.name || '(no file)') : v;
    if (k in out) out[k] = [].concat(out[k], value);
    else out[k] = value;
  }
  return out;
}

function showResult(data) {
  document.getElementById('result-data').textContent = JSON.stringify(data, null, 2);
  document.getElementById('result').showModal();
}

document.addEventListener('submit', (e) => {
  if (e.target.method === 'dialog') return;
  e.preventDefault();
  showResult(formToObject(e.target));
});

function allForms(root = document) {
  const forms = [...root.querySelectorAll('form')];
  for (const host of root.querySelectorAll('*')) if (host.shadowRoot) forms.push(...allForms(host.shadowRoot));
  return forms;
}

document.getElementById('reset-all').addEventListener('click', () => {
  for (const f of allForms()) if (f.method !== 'dialog') { f.reset(); f.dispatchEvent(new Event('input')); }
  const frame = document.querySelector('#iframe iframe');
  frame.contentDocument?.querySelector('form')?.reset();
  state = {};
  renderState();
});

// Show each field's expected detection next to its label. Uses a CSS pseudo-element
// so the hint never becomes part of the label text the extension reads.
document.getElementById('show-expect').addEventListener('change', (e) => {
  document.body.classList.toggle('show-expect', e.target.checked);
});
for (const el of document.querySelectorAll('[data-expect]')) {
  const label = el.closest('label') || document.querySelector(`label[for="${el.id}"]`);
  if (label) label.dataset.expectTag = `→ ${el.dataset.expect === 'none' ? 'left alone' : el.dataset.expect}`;
}

// ---- Controlled component: state only changes via input/change events, like React.
const controlled = document.getElementById('controlled');
let state = {};
function renderState() {
  document.getElementById('controlled-state').textContent = 'state = ' + JSON.stringify(state, null, 2);
}
controlled.addEventListener('input', (e) => {
  if (e.target.name) state = { ...state, [e.target.name]: e.target.value };
  renderState();
});
controlled.addEventListener('change', (e) => {
  if (e.target.name) state = { ...state, [e.target.name]: e.target.value };
  renderState();
});
renderState();

// ---- Web component with a form in an open shadow root.
customElements.define('shadow-signup', class extends HTMLElement {
  constructor() {
    super();
    const root = this.attachShadow({ mode: 'open' });
    root.innerHTML = `
      <style>
        :host { display: block; border: 1px dashed var(--accent); border-radius: 10px; padding: 12px; }
        label { display: flex; flex-direction: column; gap: 4px; font-size: 14px; margin-bottom: 8px; }
        input { font: inherit; padding: 8px 10px; border-radius: 8px; border: 1px solid var(--border); background: var(--input-bg); color: var(--text); }
        small { color: var(--muted); }
        button { font: inherit; border-radius: 8px; padding: 8px 16px; border: 0; background: var(--accent); color: #fff; font-weight: 600; cursor: pointer; }
      </style>
      <small>&lt;shadow-signup&gt; (open shadow root)</small>
      <form>
        <label>Full name <input name="fullname" data-expect="fullName"></label>
        <label>Work email <input name="work_email" type="email" data-expect="email"></label>
        <label>Company website <input name="site" type="url" data-expect="website"></label>
        <button type="submit">Join</button>
      </form>`;
    root.querySelector('form').addEventListener('submit', (e) => {
      e.preventDefault();
      showResult(formToObject(e.target));
    });
  }
});

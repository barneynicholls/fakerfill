// FakerFill – field classification and form filling.
// Depends on faker.js having been injected first.
(() => {
  const ns = (globalThis.__fakerfill = globalThis.__fakerfill || {});
  if (ns.fill) return;

  const SKIP = 'skip';

  // autocomplete attribute tokens (https://html.spec.whatwg.org/#autofill) → generator.
  const AUTOCOMPLETE = {
    'honorific-prefix': 'title', 'given-name': 'firstName', 'additional-name': 'middleName', 'family-name': 'lastName', name: 'fullName',
    nickname: 'username', username: 'username', email: 'email', 'new-password': 'password', 'current-password': 'password',
    'one-time-code': 'otp', organization: 'company', 'organization-title': 'jobTitle',
    'street-address': 'street', 'address-line1': 'street', 'address-line2': 'address2', 'address-line3': 'address2',
    'address-level1': 'state', 'address-level2': 'city', 'postal-code': 'zip', country: 'countryCode', 'country-name': 'country',
    'cc-name': 'cardName', 'cc-given-name': 'firstName', 'cc-family-name': 'lastName', 'cc-number': 'cardNumber',
    'cc-exp': 'cardExpiry', 'cc-exp-month': 'cardExpMonth', 'cc-exp-year': 'cardExpYear', 'cc-csc': 'cardCvc',
    'transaction-currency': 'currency', 'transaction-amount': 'price',
    bday: 'dob', 'bday-day': 'dobDay', 'bday-month': 'dobMonth', 'bday-year': 'dobYear', sex: 'gender',
    tel: 'phone', 'tel-national': 'phone', 'tel-local': 'phone', url: 'website',
  };

  // Ordered most-specific first: the first pattern that matches wins.
  // Matched against a normalised string ("billingFirst_name" → "billing first name").
  const KEYWORDS = [
    [SKIP, /captcha|honeypot|\bsearch\b|^q$|\bcsrf\b|\bnonce\b/],
    ['cardName', /(card|cc)\s*(holder|name)|name\s*on\s*(the\s*)?card|cardholder/],
    ['cardNumber', /(card|cc)\s*(number|num|no)\b|\bccnum|\bcard\s*number|credit\s*card(?!\s*(type|name|holder))|\bpan\b/],
    ['cardCvc', /\b(cvc|cvv|cvv2|csc|cid)\b|security\s*code|card\s*code|card\s*verification/],
    ['cardExpMonth', /\b(exp|expiry|expiration|expires)\b.*\b(month|mm)\b|\bcc\s*month\b/],
    ['cardExpYear', /\b(exp|expiry|expiration|expires)\b.*\b(year|yy|yyyy)\b|\bcc\s*year\b/],
    ['cardExpiry', /\b(exp|expiry|expiration|expires)\b|\bmm\s*\/?\s*yy\b/],
    ['otp', /\botp\b|one\s*time|verification\s*code|\b2fa\b|\bmfa\b|auth\w*\s*code/],
    ['sortCode', /sort\s*code/],
    ['iban', /\biban\b/],
    ['accountNumber', /account\s*(number|num|no)\b|\bacct\s*(number|num|no)\b/],
    ['niNumber', /national\s*insurance|\bni\s*(number|no)\b|\bnino\b/],
    ['ssn', /\bssn\b|social\s*security/],
    ['email', /e\s*mail|\bmail\b/],
    ['password', /pass\s*word|\bpasswd\b|\bpwd\b|\bpass\b|passphrase/],
    ['username', /user\s*name|\buser\s*id\b|\blogin\b|\bhandle\b|screen\s*name|nick\s*name|\buid\b/],
    ['middleName', /middle\s*name|\bmname\b|\bmiddle\b/],
    ['firstName', /first\s*name|given\s*name|\bfname\b|forename|\bfirst\b/],
    ['lastName', /last\s*name|surname|family\s*name|\blname\b|\blast\b/],
    ['company', /company|organi[sz]ation|employer|business\s*name|\borg\b|\bfirm\b/],
    ['jobTitle', /job\s*title|position|occupation|\brole\b|designation/],
    ['department', /department|\bdept\b|division/],
    ['title', /salutation|honorific|prefix|^title$/],
    ['initials', /initials/],
    ['fullName', /full\s*name|your\s*name|contact\s*name|\bname\b/],
    ['phone', /phone|mobile|\btel\b|telephone|\bcell\b|contact\s*number|\bfax\b/],
    ['address2', /address\s*(line\s*)?2|\baddr\w*\s*2|\bapt\b|apartment|suite|\bunit\b|\bflat\b/],
    ['zip', /\bzip|post\s*code|postal\s*code|\bpostal\b|\bpcode\b/],
    ['street', /address|street|\baddr\b|line\s*1/],
    ['city', /\bcity\b|\btown\b|locality|suburb/],
    ['state', /\bstate\b|province|county|region/],
    ['country', /country|nation/],
    ['dobDay', /(birth|dob|bday)\w*\s*(day|dd)\b|^(day|dd)$/],
    ['dobMonth', /(birth|dob|bday)\w*\s*(month|mm)\b|^(month|mm)$/],
    ['dobYear', /(birth|dob|bday)\w*\s*(year|yyyy|yy)\b|^(year|yyyy)$/],
    ['dob', /birth|\bdob\b|\bbday\b/],
    ['age', /\bage\b/],
    ['gender', /gender|\bsex\b/],
    ['website', /website|homepage|\burl\b|web\s*site|\blink\b/],
    ['subject', /subject|topic|headline/],
    ['quantity', /\bqty\b|quantity|how\s*many|guests|\bpeople\b|\bseats\b|\btickets\b/],
    ['price', /price|amount|cost|salary|budget|\btotal\b/],
    ['paragraph', /message|comment|\bnotes?\b|description|\bbio\b|about|feedback|details|enquiry|inquiry|summary|\bbody\b|review/],
    ['color', /colou?r/],
    ['futureDate', /check\s*in|check\s*out|arrival|departure|appointment|delivery|start\s*date|end\s*date|\bdue\b|deadline/],
  ];

  const NUMERIC_TYPES = new Set(['age', 'quantity', 'price', 'dobDay', 'dobMonth', 'dobYear', 'cardExpMonth', 'cardExpYear', 'cardCvc', 'otp', 'accountNumber']);
  const MONTHS = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];
  const NON_FILLABLE = new Set(['hidden', 'file', 'submit', 'button', 'reset', 'image', 'search']);

  const normalise = (s) =>
    String(s || '')
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .replace(/[_\-\[\].:#/]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase();

  const textOf = (el) => (el ? (el.innerText || el.textContent || '').replace(/\s+/g, ' ').trim() : '');

  function labelText(el) {
    const parts = [];
    if (el.labels) for (const l of el.labels) parts.push(textOf(l));
    const labelledBy = el.getAttribute('aria-labelledby');
    if (labelledBy) {
      const root = el.getRootNode();
      for (const id of labelledBy.split(/\s+/)) parts.push(textOf(root.getElementById ? root.getElementById(id) : document.getElementById(id)));
    }
    if (!parts.join('').trim()) {
      // Unlabelled forms often put the caption in a preceding cell or sibling.
      const prev = el.previousElementSibling;
      if (prev && !/^(INPUT|SELECT|TEXTAREA|BUTTON)$/.test(prev.tagName)) parts.push(textOf(prev).slice(0, 60));
      const cell = el.closest('td, dd');
      if (cell && cell.previousElementSibling) parts.push(textOf(cell.previousElementSibling).slice(0, 60));
    }
    return parts.filter(Boolean).join(' ');
  }

  // The raw strings that both heuristics and user rules match against.
  function describe(el) {
    const isGroup = el.type === 'radio' || el.type === 'checkbox';
    const legend = isGroup ? textOf(el.closest('fieldset')?.querySelector('legend')) : '';
    return {
      name: el.getAttribute('name') || '',
      id: el.id || '',
      label: labelText(el),
      legend,
      placeholder: el.getAttribute('placeholder') || '',
      ariaLabel: el.getAttribute('aria-label') || '',
      title: el.getAttribute('title') || '',
      autocomplete: (el.getAttribute('autocomplete') || '').trim().toLowerCase(),
      type: (el.getAttribute('type') || (el.tagName === 'INPUT' ? 'text' : el.tagName.toLowerCase())).toLowerCase(),
      tag: el.tagName.toLowerCase(),
    };
  }

  function matchKeywords(text) {
    if (!text) return null;
    for (const [type, re] of KEYWORDS) if (re.test(text)) return type;
    return null;
  }

  function classify(el, info = describe(el)) {
    // 1. autocomplete is an explicit statement of intent – trust it.
    const acTokens = info.autocomplete.split(/\s+/).filter((t) => t && t !== 'on' && t !== 'off');
    for (let i = acTokens.length - 1; i >= 0; i--) {
      if (AUTOCOMPLETE[acTokens[i]]) return { type: AUTOCOMPLETE[acTokens[i]], source: `autocomplete="${acTokens[i]}"` };
    }

    // 2. Keywords: attribute names first (usually precise), then human-facing text.
    const attrText = normalise(`${info.name} ${info.id}`);
    const humanText = normalise(`${info.label} ${info.legend} ${info.ariaLabel} ${info.placeholder} ${info.title}`);
    let kw = matchKeywords(attrText);
    let source = kw && `name/id "${attrText}"`;
    if (!kw) {
      kw = matchKeywords(humanText);
      source = kw && `label "${humanText}"`;
    }
    if (kw === SKIP) return { type: SKIP, source };

    // 3. Reconcile with the input type, which constrains what is valid.
    switch (info.type) {
      case 'email': return { type: 'email', source: 'type=email' };
      case 'password': return { type: kw === 'otp' || kw === 'cardCvc' ? kw : 'password', source: source || 'type=password' };
      case 'tel': return { type: kw && /phone|otp|cardCvc|digits/.test(kw) ? kw : 'phone', source: source || 'type=tel' };
      case 'url': return { type: 'website', source: 'type=url' };
      case 'date': return { type: kw === 'dob' || kw === 'futureDate' ? kw : 'date', source: source || 'type=date' };
      case 'datetime-local': return { type: 'datetime', source: 'type=datetime-local' };
      case 'time': return { type: 'time', source: 'type=time' };
      case 'month': return { type: 'month', source: 'type=month' };
      case 'week': return { type: 'week', source: 'type=week' };
      case 'color': return { type: 'hexColor', source: 'type=color' };
      case 'range':
      case 'number': return { type: kw && NUMERIC_TYPES.has(kw) ? kw : 'number', source: source || `type=${info.type}` };
    }
    if (kw) return { type: kw, source };
    if (info.tag === 'textarea') return { type: 'paragraph', source: 'textarea' };
    if (info.tag === 'select') return { type: null, source: 'select' };
    return { type: 'text', source: 'fallback' };
  }

  // ----- Custom rules ---------------------------------------------------------

  function siteMatches(site, location) {
    if (!site || !site.trim()) return true;
    const host = location.hostname || '';
    const href = location.href || '';
    return site.split(',').map((s) => s.trim()).filter(Boolean).some((pattern) => {
      const re = new RegExp('^' + pattern.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*') + '$', 'i');
      return re.test(host) || re.test(href);
    });
  }

  function ruleMatches(rule, info) {
    const needle = (rule.field || '').trim();
    if (!needle) return false;
    const haystacks = [info.name, info.id, info.label, info.placeholder, info.ariaLabel, info.autocomplete, info.legend].filter(Boolean);
    if (rule.matchType === 'regex') {
      let re;
      try { re = new RegExp(needle, 'i'); } catch { return false; }
      return haystacks.some((h) => re.test(h));
    }
    const n = needle.toLowerCase();
    if (rule.matchType === 'exact') return haystacks.some((h) => h.trim().toLowerCase() === n);
    return haystacks.some((h) => h.toLowerCase().includes(n));
  }

  function findRule(rules, info) {
    return rules.find((r) => ruleMatches(r, info)) || null;
  }

  // ----- Value writing --------------------------------------------------------

  function setNativeValue(el, value) {
    const proto = el.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : el.tagName === 'SELECT' ? HTMLSelectElement.prototype : HTMLInputElement.prototype;
    const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
    // Using the prototype setter keeps React/Vue/etc. in sync with the DOM.
    if (setter) setter.call(el, value); else el.value = value;
  }

  function setChecked(el, checked) {
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'checked')?.set;
    if (setter) setter.call(el, checked); else el.checked = checked;
  }

  function fire(el) {
    el.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
    el.dispatchEvent(new FocusEvent('blur'));
  }

  function highlight(el) {
    const prev = { outline: el.style.outline, transition: el.style.transition };
    el.style.transition = 'outline-color 0.6s ease';
    el.style.outline = '2px solid #7c3aed';
    setTimeout(() => { el.style.outline = '2px solid transparent'; }, 900);
    setTimeout(() => { el.style.outline = prev.outline; el.style.transition = prev.transition; }, 1600);
  }

  function isVisible(el) {
    if (!el.isConnected) return false;
    if (el.getClientRects().length === 0) return false;
    const style = getComputedStyle(el);
    if (style.visibility === 'hidden' || style.display === 'none' || Number(style.opacity) === 0) return false;
    // Pushed off-screen (a common honeypot trick).
    const rect = el.getBoundingClientRect();
    return rect.right + window.scrollX > 0 && rect.bottom + window.scrollY > 0;
  }

  function numberFits(value, c) {
    const n = Number(value);
    if (value === '' || !Number.isFinite(n)) return false;
    if (c.min != null && c.min !== '' && n < Number(c.min)) return false;
    if (c.max != null && c.max !== '' && n > Number(c.max)) return false;
    if (c.step && c.step !== 'any' && Number(c.step) > 0) {
      const steps = (n - Number(c.min || 0)) / Number(c.step);
      if (Math.abs(steps - Math.round(steps)) > 1e-6) return false;
    }
    return true;
  }

  // Make a generated value acceptable to maxlength / minlength / pattern.
  function fitConstraints(el, makeValue) {
    let value = makeValue();
    const pattern = el.getAttribute('pattern');
    if (pattern) {
      let re;
      try { re = new RegExp(`^(?:${pattern})$`, 'v'); } catch { try { re = new RegExp(`^(?:${pattern})$`); } catch { re = null; } }
      for (let i = 0; re && !re.test(value) && i < 10; i++) value = makeValue();
    }
    const min = Number(el.getAttribute('minlength')) || 0;
    while (min && value.length < min) value += ' ' + ns.faker.generators.word();
    const max = el.maxLength > 0 ? el.maxLength : 0;
    if (max && value.length > max) value = value.slice(0, max).trim();
    return value;
  }

  // ----- Select / radio helpers -----------------------------------------------

  // Candidates a select/radio option may be called for a given persona value.
  function aliases(type, persona, raw) {
    const out = [raw];
    switch (type) {
      case 'country': out.push(persona.countryCode, persona.countryCode === 'GB' ? 'UK' : 'USA', persona.countryCode === 'GB' ? 'Great Britain' : 'United States of America'); break;
      case 'countryCode': out.push(persona.country); break;
      case 'state': out.push(persona.stateCode); break;
      case 'gender': out.push(persona.gender[0], persona.gender === 'male' ? 'man' : 'woman'); break;
      case 'dobMonth':
      case 'cardExpMonth': {
        const m = Number(raw);
        out.push(String(m).padStart(2, '0'), String(m), MONTHS[m - 1], MONTHS[m - 1]?.slice(0, 3));
        break;
      }
      case 'cardExpYear': out.push(String(raw).slice(2)); break;
    }
    return out.filter(Boolean).map((s) => String(s).trim().toLowerCase());
  }

  const isPlaceholderOption = (opt) =>
    opt.disabled || (opt.value === '' && (opt.index === 0 || /^\s*(-+|select|choose|please|pick|none\b)/i.test(opt.text)));

  function chooseOption(options, wanted) {
    const usable = options.filter((o) => !isPlaceholderOption(o));
    if (!usable.length) return null;
    if (wanted && wanted.length) {
      for (const w of wanted) {
        const hit = usable.find((o) => o.value.trim().toLowerCase() === w || o.text.trim().toLowerCase() === w);
        if (hit) return hit;
      }
    }
    return null;
  }

  // ----- Main -----------------------------------------------------------------

  function collectFields(root, out = []) {
    for (const el of root.querySelectorAll('input, textarea, select')) out.push(el);
    // Walk into open shadow roots so web-component forms are covered too.
    for (const host of root.querySelectorAll('*')) if (host.shadowRoot) collectFields(host.shadowRoot, out);
    return out;
  }

  function fill(settings = {}, scope = 'page', sharedPersona = null) {
    const opts = {
      overwrite: true,
      fillHidden: false,
      checkboxes: 'random', // random | all | none
      highlight: true,
      locale: 'en-GB',
      ...settings.options,
    };
    const rules = (settings.rules || []).filter((r) => r.enabled !== false && siteMatches(r.site, location));
    const { faker } = ns;
    // The background passes one persona to every frame so iframes match the page.
    const persona = sharedPersona || faker.createPersona(opts.locale);

    let root = document;
    if (scope === 'form') {
      // Only the frame that owns the focus takes part in a form-scoped fill.
      const active = deepActiveElement();
      if (!active || /^I?FRAME$/.test(active.tagName) || (!document.hasFocus() && active === document.body)) return { filled: 0, fields: [] };
      root = (active.closest && active.closest('form')) || document;
    }

    const report = [];
    const handledGroups = new Set();
    const log = (el, info, type, value, source) => report.push({ field: info.name || info.id || info.label || info.placeholder || el.tagName.toLowerCase(), type, value, source });

    for (const el of collectFields(root)) {
      const info = describe(el);
      if (el.tagName === 'INPUT' && NON_FILLABLE.has(info.type)) continue;
      if (el.disabled || el.readOnly) continue;
      // Page authors can opt fields (or whole sections) out of filling.
      if (el.closest('[data-fakerfill-ignore]')) continue;
      if (!opts.fillHidden && !isVisible(el) && !(info.type === 'radio' || info.type === 'checkbox')) continue;
      if ((info.type === 'radio' || info.type === 'checkbox') && !opts.fillHidden && !isVisible(el) && !isVisible(el.labels?.[0] || el)) continue;

      const rule = findRule(rules, info);
      if (rule && rule.action === 'skip') { log(el, info, 'skipped', '', `rule "${rule.field}"`); continue; }
      const constraints = { min: el.getAttribute('min'), max: el.getAttribute('max'), step: el.getAttribute('step') };
      const ruleValue = rule ? () => faker.expand(rule.value ?? '', persona, constraints) : null;
      const cls = rule ? { type: 'rule', source: `rule "${rule.field}"` } : classify(el, info);
      if (cls.type === SKIP) continue;

      if (info.type === 'radio') {
        const groupKey = (el.form ? 'f' + Array.prototype.indexOf.call(document.forms, el.form) : 'doc') + ':' + (info.name || el.id);
        if (handledGroups.has(groupKey)) continue;
        handledGroups.add(groupKey);
        const group = info.name ? collectFields(el.form || el.getRootNode()).filter((r) => r.type === 'radio' && r.name === info.name && !r.disabled) : [el];
        if (!opts.overwrite && group.some((r) => r.checked)) continue;
        const asOptions = group.map((r) => ({ el: r, value: r.value, text: labelText(r) || r.value, disabled: false, index: 1 }));
        const wanted = ruleValue ? [ruleValue().toLowerCase()] : cls.type && faker.generators[cls.type] ? aliases(cls.type, persona, faker.generators[cls.type](persona, constraints)) : null;
        const choice = chooseOption(asOptions, wanted) || faker.pick(asOptions);
        setChecked(choice.el, true);
        fire(choice.el);
        if (opts.highlight) highlight(choice.el);
        log(el, info, cls.type || 'radio', choice.value, cls.source);
        continue;
      }

      if (info.type === 'checkbox') {
        if (!opts.overwrite && el.checked) continue;
        let checked;
        if (ruleValue) checked = /^(true|yes|on|1|checked|y)$/i.test(ruleValue().trim());
        else if (el.required || /agree|terms|consent|accept|privacy|confirm/i.test(`${info.name} ${info.id} ${info.label}`)) checked = true;
        else if (opts.checkboxes === 'all') checked = true;
        else if (opts.checkboxes === 'none') checked = false;
        else checked = Math.random() < 0.5;
        if (el.checked !== checked) { setChecked(el, checked); fire(el); }
        if (opts.highlight) highlight(el);
        log(el, info, cls.type === 'rule' ? 'rule' : 'checkbox', String(checked), cls.source);
        continue;
      }

      if (el.tagName === 'SELECT') {
        if (!opts.overwrite && el.selectedIndex > 0) continue;
        const options = Array.from(el.options);
        const wanted = ruleValue ? ruleValue().split('|').map((s) => s.trim().toLowerCase()) : cls.type && faker.generators[cls.type] ? aliases(cls.type, persona, faker.generators[cls.type](persona, constraints)) : null;
        if (el.multiple) {
          options.forEach((o) => { o.selected = false; });
          const usable = options.filter((o) => !isPlaceholderOption(o));
          const picks = wanted && ruleValue ? usable.filter((o) => wanted.includes(o.value.toLowerCase()) || wanted.includes(o.text.trim().toLowerCase())) : usable.filter(() => Math.random() < 0.4);
          (picks.length ? picks : usable.slice(0, 1)).forEach((o) => { o.selected = true; });
          fire(el);
          if (opts.highlight) highlight(el);
          log(el, info, cls.type || 'select', options.filter((o) => o.selected).map((o) => o.value).join(', '), cls.source);
          continue;
        }
        const choice = chooseOption(options, wanted) || faker.pick(options.filter((o) => !isPlaceholderOption(o)).length ? options.filter((o) => !isPlaceholderOption(o)) : options);
        if (!choice) continue;
        setNativeValue(el, choice.value);
        fire(el);
        if (opts.highlight) highlight(el);
        log(el, info, cls.type || 'select', choice.value, cls.source);
        continue;
      }

      // Text-like inputs and textareas.
      if (!opts.overwrite && el.value) continue;
      const gen = faker.generators[cls.type] || faker.generators.text;
      let makeValue = ruleValue || (() => String(gen(persona, constraints)));
      if (!ruleValue && (info.type === 'number' || info.type === 'range')) {
        // e.g. a "guests" field limited to 1–6: fall back to a number that satisfies min/max/step.
        const guessed = makeValue;
        makeValue = () => {
          const v = guessed();
          return numberFits(v, constraints) ? v : faker.generators.number(persona, constraints);
        };
      }
      const value = fitConstraints(el, makeValue);
      setNativeValue(el, value);
      fire(el);
      if (opts.highlight) highlight(el);
      log(el, info, cls.type, value, cls.source);
    }

    return { filled: report.filter((r) => r.type !== 'skipped').length, fields: report };
  }

  function deepActiveElement() {
    let a = document.activeElement;
    while (a && a.shadowRoot && a.shadowRoot.activeElement) a = a.shadowRoot.activeElement;
    return a;
  }

  // Details about the currently focused field, used to pre-fill a new rule.
  function inspectFocused() {
    const el = deepActiveElement();
    if (!el || !/^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName)) return null;
    const info = describe(el);
    return { ...info, guess: classify(el, info).type, host: location.hostname };
  }

  ns.classify = classify;
  ns.describe = describe;
  ns.fill = fill;
  ns.inspectFocused = inspectFocused;
})();

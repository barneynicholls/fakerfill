# FakerFill

A standalone browser extension that fills web forms with realistic fake data. Press
**<kbd>Alt</kbd>+<kbd>Shift</kbd>+<kbd>F</kbd>** on any page and every field gets a sensible value.
FakerFill guesses what each field wants from its name, id, label, placeholder, `aria-label`,
`autocomplete` attribute and input type, and you can add rules that pin exact values for particular
fields.

It works in Chrome, Edge, Brave and Firefox (Manifest V3). It has no runtime dependencies, makes no
network requests, and only touches a page when you trigger it.

## Install (unpacked)

**Chrome / Edge / Brave**
1. Open `chrome://extensions` (or `edge://extensions`) and turn on **Developer mode**.
2. Click **Load unpacked** and pick the `extension/` folder.
3. To use it on `file://` pages, open the extension's **Details** and turn on **Allow access to file URLs**.

**Firefox**
1. Open `about:debugging#/runtime/this-firefox`.
2. Click **Load Temporary Add-on…** and pick `extension/manifest.json`.

`npm run package` writes `dist/fakerfill-<version>.zip`, ready to upload to the Chrome Web Store or
Firefox Add-ons.

## Using it

| How | What it fills |
| --- | --- |
| <kbd>Alt</kbd>+<kbd>Shift</kbd>+<kbd>F</kbd> | Every field on the page, including same-origin iframes and open shadow DOM. In settings you can switch this to "only the form with focus". |
| Toolbar popup → **Fill this page** / **Fill focused form** | As labelled. The popup also lists the last fill: each field, what it was detected as, and the value it got. |
| Right-click a field → **Fill this form only** | The form containing that field. |
| Right-click a field → **Create FakerFill rule for this field…** | Opens settings with a new rule pre-filled for that field. |
| Optional second shortcut, "Fill only the form containing the focused field" | Has no default key. Assign one in `chrome://extensions/shortcuts`, or in FakerFill's settings on Firefox. |

To change the shortcut in Chrome or Edge, go to `chrome://extensions/shortcuts`; the popup and settings
page link there. Firefox lets you change it directly on FakerFill's settings page.

### What gets filled

- **Values are consistent within one fill.** A single fake persona is used for the whole page, so the
  email matches the name, "confirm email" and "confirm password" repeat their originals, and the
  country, county and postcode belong together.
- **Selects** get a real option. Placeholders like "Select…" and disabled options are skipped. Where
  possible the option matches the persona (country, county or state, title, gender, card expiry).
- **Radios** get one choice per group. **Checkboxes** that are required or look like "I agree / accept
  terms" are always ticked. Other checkboxes are ticked at random, or all or none, depending on your
  setting.
- **Input constraints are respected:** `maxlength`, `minlength`, `pattern`, and `min`/`max`/`step`
  on number, range and date fields.
- **Left alone:** disabled and read-only fields, `type=hidden|file|search`, captcha fields, fields
  that are invisible or off-screen (common honeypot tricks), and anything inside an element with a
  `data-fakerfill-ignore` attribute.
- Values are set the way frameworks expect: through the native value setter, followed by `input`,
  `change` and `blur` events. This means React, Vue and Angular state updates as well.
- Test-safe data: Luhn-valid Visa test card numbers, Ofcom drama-range UK phone numbers
  (07700 900xxx), US 555-01xx numbers, QQ-prefix NI numbers, the published example IBAN, and
  `example.com`-style email domains.
- The data can be UK-style (`en-GB`, the default) or US-style (`en-US`).

## Custom rules

Open **Rules & settings** from the popup, or the extension's Options page. A rule has:

| Setting | Meaning |
| --- | --- |
| **Field** + **Match** | Text matched against the field's `name`, `id`, label, placeholder, `aria-label`, `autocomplete` or fieldset legend. Match can be *contains*, *is exactly* or *regex* (always case-insensitive). |
| **Action** | *fill with* a value, or *leave untouched*. |
| **Value** | Fixed text, generator tokens, or both. Examples: `{{email}}`, `EMP-{{digits:5}}`, `{{oneOf:SAVE10,WELCOME}}`, `test+{{firstName}}@example.com`. For selects, use the option value or text (separate several with `\|` for a multi-select). For checkboxes, use `true` or `false`. |
| **Only on sites** | Optional hostname or URL patterns with a `*` wildcard, comma-separated: `*.example.com, localhost`. |

Rules are checked from top to bottom before automatic detection, and the first match wins. Use the
arrows to reorder them. The settings page lists every token. Clicking a token copies it, and each
rule shows a live preview of its value. You can back up or share your rules with **Export / Import
settings**.

## Test page

`test-page/` is a companion site with 13 forms covering the cases FakerFill has to handle:

- sign-up, login and contact forms
- address, payment and job application forms
- hotel booking and UK finance details
- tricky fields: meaningless names, labels that come only from `aria-label`, placeholders or table
  cells, length limits, and honeypot, captcha and search fields
- HTML5 input types
- a React-style controlled component
- a web component with its form in a shadow root
- a playground for custom rules
- a form inside an iframe

Run it with:

```sh
npm run serve        # http://localhost:8080
```

Tick **Show expected detection** on the page to see what each field should be detected as. Submitting
a form shows the data it would have sent instead of leaving the page.

## Development

```
extension/
  manifest.json
  background.js        shortcut, context menu and popup entry points; injects the content scripts
  content/faker.js     fake data generators and the per-fill persona
  content/filler.js    field classification, rule matching and filling
  shared/              settings storage, shortcut helpers, shared UI styles
  popup/  options/     toolbar popup and settings page
  icons/               icon.svg plus the rendered PNGs (`npm run icons`)
test-page/             the companion forms
tests/                 Playwright end-to-end tests
scripts/               static server, icon renderer, zip packager
```

```sh
npm install
npm test             # Playwright + Chromium: detection, filling, rules and the loaded extension
npm run package      # dist/fakerfill-<version>.zip
```

The extension asks only for `activeTab`, `scripting`, `storage` and `contextMenus`. It has no host
permissions, and its scripts are injected only when you press the shortcut or use the popup or menu.

To add a new detection, put a pattern in `KEYWORDS` in `content/filler.js`. The patterns are ordered
from most to least specific. If the detection needs a new kind of value, add a generator to
`content/faker.js`. Then add a field with a matching `data-expect` attribute to the test page so
`npm test` covers it.

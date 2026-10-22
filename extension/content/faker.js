// FakerFill – self-contained fake data generator.
// Injected into pages, so it must not depend on any module system.
(() => {
  const ns = (globalThis.__fakerfill = globalThis.__fakerfill || {});
  if (ns.faker) return;

  const rand = (n) => Math.floor(Math.random() * n);
  const pick = (arr) => arr[rand(arr.length)];
  const between = (min, max) => min + rand(max - min + 1);
  const digits = (n) => Array.from({ length: n }, () => rand(10)).join('');
  const pad = (n, len = 2) => String(n).padStart(len, '0');
  const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
  const slug = (s) => s.toLowerCase().normalize('NFD').replace(/[^a-z0-9]+/g, '');

  const FIRST_MALE = ['James', 'Oliver', 'Harry', 'George', 'Noah', 'Jack', 'Leo', 'Arthur', 'Muhammad', 'Oscar', 'Charlie', 'Thomas', 'William', 'Henry', 'Daniel', 'Samuel', 'Liam', 'Ethan', 'Lucas', 'Benjamin', 'Michael', 'David', 'Ravi', 'Kwame', 'Mateo'];
  const FIRST_FEMALE = ['Olivia', 'Amelia', 'Isla', 'Ava', 'Mia', 'Ivy', 'Lily', 'Isabella', 'Sophia', 'Grace', 'Freya', 'Emily', 'Charlotte', 'Poppy', 'Evie', 'Ella', 'Emma', 'Chloe', 'Hannah', 'Priya', 'Aisha', 'Zara', 'Sofia', 'Niamh', 'Maya'];
  const LAST = ['Smith', 'Jones', 'Taylor', 'Brown', 'Williams', 'Wilson', 'Johnson', 'Davies', 'Patel', 'Robinson', 'Wright', 'Thompson', 'Evans', 'Walker', 'White', 'Roberts', 'Green', 'Hall', 'Wood', 'Jackson', 'Clarke', 'Khan', 'Murphy', 'Garcia', 'Nguyen', 'O\'Brien', 'Okafor', 'Kowalski', 'Hughes', 'Edwards'];
  const COMPANY_A = ['Acme', 'Globex', 'Initech', 'Umbrella', 'Stark', 'Wayne', 'Hooli', 'Vandelay', 'Cyberdyne', 'Soylent', 'Wonka', 'Tyrell', 'Pied Piper', 'Massive Dynamic', 'Oscorp'];
  const COMPANY_B = ['Ltd', 'Group', 'Industries', 'Solutions', 'Labs', 'Holdings', 'Systems', 'Partners', 'Digital', 'Co'];
  const JOBS = ['Software Engineer', 'Product Manager', 'Designer', 'Data Analyst', 'Marketing Manager', 'Accountant', 'Sales Executive', 'Operations Lead', 'Customer Success Manager', 'QA Engineer', 'HR Business Partner', 'Project Coordinator'];
  const DEPARTMENTS = ['Engineering', 'Marketing', 'Sales', 'Finance', 'Operations', 'Human Resources', 'Support', 'Legal', 'Product'];
  const STREET_NAMES = ['High', 'Station', 'Church', 'Victoria', 'Park', 'Mill', 'Queen', 'King', 'London', 'Manor', 'Oak', 'Maple', 'Elm', 'Cedar', 'Willow', 'Main', 'Washington', 'Lake', 'Hill', 'River'];
  const LOREM = 'lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor incididunt ut labore et dolore magna aliqua enim ad minim veniam quis nostrud exercitation ullamco laboris nisi aliquip ex ea commodo consequat duis aute irure in reprehenderit voluptate velit esse cillum fugiat nulla pariatur excepteur sint occaecat cupidatat non proident sunt culpa qui officia deserunt mollit anim id est laborum'.split(' ');
  const SUBJECTS = ['Question about my order', 'Feedback on the new release', 'Request for a quote', 'Account access problem', 'Partnership enquiry', 'Bug report', 'Meeting follow-up'];
  const COLORS = ['Red', 'Blue', 'Green', 'Teal', 'Purple', 'Orange', 'Yellow', 'Black', 'White', 'Silver'];
  const DOMAINS = ['example.com', 'example.org', 'example.net', 'test.com', 'mailinator.com'];

  const LOCALES = {
    'en-GB': {
      streetSuffix: ['Road', 'Street', 'Lane', 'Avenue', 'Close', 'Drive', 'Way', 'Gardens', 'Crescent'],
      cities: [
        ['London', 'Greater London', 'SW1A', 'E'], ['Manchester', 'Greater Manchester', 'M1', 'M'], ['Birmingham', 'West Midlands', 'B1', 'B'],
        ['Leeds', 'West Yorkshire', 'LS1', 'L'], ['Bristol', 'Bristol', 'BS1', 'B'], ['Edinburgh', 'City of Edinburgh', 'EH1', 'E'],
        ['Cardiff', 'Cardiff', 'CF10', 'C'], ['Glasgow', 'Glasgow City', 'G1', 'G'], ['Brighton', 'East Sussex', 'BN1', 'B'],
        ['Norwich', 'Norfolk', 'NR1', 'N'], ['York', 'North Yorkshire', 'YO1', 'Y'], ['Oxford', 'Oxfordshire', 'OX1', 'O'],
      ],
      country: 'United Kingdom',
      countryCode: 'GB',
      postcode: (city) => `${city[2]} ${rand(10)}${String.fromCharCode(65 + rand(26))}${String.fromCharCode(65 + rand(26))}`,
      // Ofcom drama range 07700 900000–900999 – reserved for fiction.
      phone: () => `07700 900${digits(3)}`,
      phoneIntl: (p) => `+44 ${p.slice(1)}`,
      currency: 'GBP',
    },
    'en-US': {
      streetSuffix: ['Street', 'Avenue', 'Boulevard', 'Drive', 'Lane', 'Road', 'Court', 'Way', 'Place'],
      cities: [
        ['Springfield', 'Illinois', '627', 'IL'], ['Austin', 'Texas', '787', 'TX'], ['Portland', 'Oregon', '972', 'OR'],
        ['Denver', 'Colorado', '802', 'CO'], ['Seattle', 'Washington', '981', 'WA'], ['Boston', 'Massachusetts', '021', 'MA'],
        ['Phoenix', 'Arizona', '850', 'AZ'], ['Columbus', 'Ohio', '432', 'OH'], ['Nashville', 'Tennessee', '372', 'TN'],
        ['Raleigh', 'North Carolina', '276', 'NC'], ['San Diego', 'California', '921', 'CA'], ['Miami', 'Florida', '331', 'FL'],
      ],
      country: 'United States',
      countryCode: 'US',
      postcode: (city) => `${city[2]}${digits(2)}`,
      // 555-01xx is reserved for fictional use.
      phone: () => `(${pick(['202', '312', '415', '512', '617', '206'])}) 555-01${digits(2)}`,
      phoneIntl: (p) => `+1 ${p.replace(/[()]/g, '').replace(' ', '-')}`,
      currency: 'USD',
    },
  };

  function luhnComplete(prefix, length) {
    let num = prefix + digits(length - prefix.length - 1);
    let sum = 0;
    for (let i = 0; i < num.length; i++) {
      let d = Number(num[num.length - 1 - i]);
      if (i % 2 === 0) { d *= 2; if (d > 9) d -= 9; }
      sum += d;
    }
    return num + ((10 - (sum % 10)) % 10);
  }

  function isoDate(d) {
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  }

  function sentence(min = 6, max = 14) {
    const words = Array.from({ length: between(min, max) }, () => pick(LOREM));
    return cap(words.join(' ')) + '.';
  }

  function paragraph(sentences = between(2, 4)) {
    return Array.from({ length: sentences }, () => sentence()).join(' ');
  }

  function password() {
    const lower = 'abcdefghjkmnpqrstuvwxyz', upper = 'ABCDEFGHJKMNPQRSTUVWXYZ', num = '23456789', sym = '!@#$%&*?';
    const chars = [pick(upper), pick(upper), pick(num), pick(num), pick(sym)];
    while (chars.length < 14) chars.push(pick(lower + upper + num));
    return chars.sort(() => Math.random() - 0.5).join('');
  }

  // A persona keeps related fields consistent within a single fill:
  // email matches the name, "confirm email/password" repeat the same value, etc.
  function createPersona(localeKey = 'en-GB') {
    const loc = LOCALES[localeKey] || LOCALES['en-GB'];
    const gender = Math.random() < 0.5 ? 'male' : 'female';
    const firstName = pick(gender === 'male' ? FIRST_MALE : FIRST_FEMALE);
    const lastName = pick(LAST);
    const middleName = pick([...FIRST_MALE, ...FIRST_FEMALE].filter((n) => n !== firstName));
    const city = pick(loc.cities);
    const companyName = `${pick(COMPANY_A)} ${pick(COMPANY_B)}`;
    const domain = pick(DOMAINS);
    const username = `${slug(firstName)}${pick(['.', '_', ''])}${slug(lastName)}${between(1, 99)}`;
    const dobDate = new Date(Date.now() - between(18 * 365, 70 * 365) * 86400000);
    const phone = loc.phone();
    const cardExp = new Date();
    cardExp.setMonth(cardExp.getMonth() + between(6, 48));
    return {
      locale: localeKey,
      gender,
      title: gender === 'male' ? 'Mr' : pick(['Ms', 'Mrs', 'Miss']),
      firstName,
      middleName,
      lastName,
      fullName: `${firstName} ${lastName}`,
      initials: `${firstName[0]}${lastName[0]}`,
      username,
      email: `${slug(firstName)}.${slug(lastName)}@${domain}`,
      password: password(),
      phone,
      phoneIntl: loc.phoneIntl(phone),
      company: companyName,
      jobTitle: pick(JOBS),
      department: pick(DEPARTMENTS),
      website: `https://www.${slug(companyName)}.example`,
      street: `${between(1, 250)} ${pick(STREET_NAMES)} ${pick(loc.streetSuffix)}`,
      address2: pick([`Flat ${between(1, 40)}`, `Apt ${between(1, 40)}`, `Suite ${between(100, 900)}`, `Unit ${between(1, 20)}`]),
      city: city[0],
      state: city[1],
      stateCode: city[3],
      zip: loc.postcode(city),
      country: loc.country,
      countryCode: loc.countryCode,
      dob: isoDate(dobDate),
      dobDay: dobDate.getDate(),
      dobMonth: dobDate.getMonth() + 1,
      dobYear: dobDate.getFullYear(),
      age: Math.floor((Date.now() - dobDate.getTime()) / (365.25 * 86400000)),
      cardName: `${firstName} ${lastName}`.toUpperCase(),
      cardNumber: luhnComplete('4', 16),
      cardExpMonth: pad(cardExp.getMonth() + 1),
      cardExpYear: String(cardExp.getFullYear()),
      cardExpiry: `${pad(cardExp.getMonth() + 1)}/${String(cardExp.getFullYear()).slice(2)}`,
      cardCvc: digits(3),
      currency: loc.currency,
    };
  }

  // Every generator takes (persona, field-constraints, arg) and returns a string.
  // `arg` comes from tokens such as {{number:1-10}} in custom rules.
  const generators = {
    title: (p) => p.title,
    firstName: (p) => p.firstName,
    middleName: (p) => p.middleName,
    lastName: (p) => p.lastName,
    fullName: (p) => p.fullName,
    initials: (p) => p.initials,
    username: (p) => p.username,
    email: (p) => p.email,
    password: (p) => p.password,
    phone: (p) => p.phone,
    phoneIntl: (p) => p.phoneIntl,
    company: (p) => p.company,
    jobTitle: (p) => p.jobTitle,
    department: (p) => p.department,
    website: (p) => p.website,
    street: (p) => p.street,
    address2: (p) => p.address2,
    city: (p) => p.city,
    state: (p) => p.state,
    zip: (p) => p.zip,
    country: (p) => p.country,
    countryCode: (p) => p.countryCode,
    dob: (p) => p.dob,
    dobDay: (p) => String(p.dobDay),
    dobMonth: (p) => String(p.dobMonth),
    dobYear: (p) => String(p.dobYear),
    age: (p) => String(p.age),
    gender: (p) => p.gender,
    cardName: (p) => p.cardName,
    cardNumber: (p) => p.cardNumber,
    cardExpiry: (p) => p.cardExpiry,
    cardExpMonth: (p) => p.cardExpMonth,
    cardExpYear: (p) => p.cardExpYear,
    cardCvc: (p) => p.cardCvc,
    currency: (p) => p.currency,
    color: () => pick(COLORS),
    hexColor: () => '#' + Array.from({ length: 3 }, () => rand(256).toString(16).padStart(2, '0')).join(''),
    subject: () => pick(SUBJECTS),
    word: () => pick(LOREM),
    words: (_p, _c, arg) => Array.from({ length: Number(arg) || 3 }, () => pick(LOREM)).join(' '),
    sentence: () => sentence(),
    paragraph: () => paragraph(),
    uuid: () => (crypto.randomUUID ? crypto.randomUUID() : `${digits(8)}-${digits(4)}-4${digits(3)}-a${digits(3)}-${digits(12)}`),
    otp: () => digits(6),
    digits: (_p, _c, arg) => digits(Number(arg) || 6),
    number: (_p, c = {}, arg) => {
      let min = 1, max = 100;
      const range = /^(-?\d+(?:\.\d+)?)-(-?\d+(?:\.\d+)?)$/.exec(String(arg || '').trim());
      if (range) [min, max] = [Number(range[1]), Number(range[2])];
      if (c.min != null && c.min !== '' && !isNaN(c.min)) min = Number(c.min);
      if (c.max != null && c.max !== '' && !isNaN(c.max)) max = Number(c.max);
      if (max < min) max = min + 100;
      const step = c.step && !isNaN(c.step) && Number(c.step) > 0 ? Number(c.step) : 1;
      const steps = Math.floor((max - min) / step);
      const value = min + rand(steps + 1) * step;
      return String(Number(value.toFixed(6)));
    },
    price: () => (between(100, 99999) / 100).toFixed(2),
    quantity: () => String(between(1, 10)),
    date: (_p, c = {}) => {
      const min = c.min ? new Date(c.min) : new Date(Date.now() - 365 * 86400000);
      const max = c.max ? new Date(c.max) : new Date(Date.now() + 365 * 86400000);
      return isoDate(new Date(min.getTime() + Math.random() * Math.max(0, max - min)));
    },
    futureDate: () => isoDate(new Date(Date.now() + between(1, 365) * 86400000)),
    pastDate: () => isoDate(new Date(Date.now() - between(1, 3650) * 86400000)),
    time: () => `${pad(between(8, 18))}:${pick(['00', '15', '30', '45'])}`,
    datetime: (p, c) => `${generators.date(p, c)}T${generators.time()}`,
    month: () => `${new Date().getFullYear()}-${pad(between(1, 12))}`,
    week: () => `${new Date().getFullYear()}-W${pad(between(1, 52))}`,
    sortCode: () => `${digits(2)}-${digits(2)}-${digits(2)}`,
    accountNumber: () => digits(8),
    // GB82 WEST 1234 5698 7654 32 is the published example IBAN.
    iban: () => 'GB82WEST12345698765432',
    niNumber: () => `QQ${digits(6)}C`, // QQ prefix is never issued.
    ssn: () => `9${digits(2)}-${digits(2)}-${digits(4)}`, // 9xx area numbers are never issued.
    text: () => pick(LOREM) + ' ' + pick(LOREM),
    oneOf: (_p, _c, arg) => pick(String(arg || '').split(',').map((s) => s.trim()).filter(Boolean)) || '',
  };

  // Human-readable descriptions, shown in the options page token picker.
  const GENERATOR_INFO = {
    firstName: 'First name', lastName: 'Last name', fullName: 'Full name', middleName: 'Middle name', title: 'Title (Mr/Ms…)', initials: 'Initials',
    username: 'Username', email: 'Email address', password: 'Password', phone: 'Phone number', phoneIntl: 'Phone (international)',
    company: 'Company', jobTitle: 'Job title', department: 'Department', website: 'Website URL',
    street: 'Street address', address2: 'Address line 2', city: 'City', state: 'State / county', zip: 'Postcode / ZIP', country: 'Country', countryCode: 'Country code',
    dob: 'Date of birth (YYYY-MM-DD)', dobDay: 'Birth day', dobMonth: 'Birth month', dobYear: 'Birth year', age: 'Age', gender: 'Gender',
    cardName: 'Card holder', cardNumber: 'Card number (Luhn-valid test)', cardExpiry: 'Card expiry MM/YY', cardExpMonth: 'Card expiry month', cardExpYear: 'Card expiry year', cardCvc: 'Card CVC',
    sortCode: 'Sort code', accountNumber: 'Account number', iban: 'IBAN (example)', niNumber: 'NI number (test)', ssn: 'SSN (test)', currency: 'Currency code',
    subject: 'Subject line', word: 'Word', 'words:3': 'N words', sentence: 'Sentence', paragraph: 'Paragraph', text: 'Short text',
    'number:1-100': 'Number in range', price: 'Price', quantity: 'Quantity', 'digits:6': 'N digits', otp: 'One-time code', uuid: 'UUID',
    date: 'Date', pastDate: 'Past date', futureDate: 'Future date', time: 'Time', datetime: 'Date & time', month: 'Month', week: 'Week',
    color: 'Colour name', hexColor: 'Hex colour', 'oneOf:a,b,c': 'Random choice from list',
  };

  // Expands "{{token}}" / "{{token:arg}}" inside a template string.
  function expand(template, persona, constraints) {
    return String(template).replace(/\{\{\s*([a-zA-Z]+)(?::([^}]*))?\s*\}\}/g, (match, name, arg) => {
      const gen = generators[name];
      return gen ? gen(persona, constraints, arg) : match;
    });
  }

  ns.faker = { createPersona, generators, GENERATOR_INFO, expand, locales: Object.keys(LOCALES), pick, rand };
})();

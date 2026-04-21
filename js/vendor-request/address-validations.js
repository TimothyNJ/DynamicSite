/**
 * address-validations.js
 *
 * Phase 1 — minimal country selector + libaddressinput-driven field rendering.
 *
 * Flow:
 *   1. Populate the country <select> from ISO 3166-1 country list (priority
 *      countries first, then the rest alphabetically).
 *   2. On country change, fetch libaddressinput metadata from
 *      https://chromium-i18n.appspot.com/ssl-aggregate-address/data/<CC>
 *   3. Parse the `fmt` format string (tokens: %N %O %A %D %C %S %Z %X) and
 *      render a greyed-out input field for each token, labelled per the
 *      country's conventions (`state_name_type`, `locality_name_type`,
 *      `zip_name_type`, etc.).
 *
 * Later phases will layer on Google Places Autocomplete, Google Address
 * Validation API, and a manual-review fallback.
 */

// Priority ordering — matches the vendor-onboarding plan (US-heavy,
// then highest-volume/highest-value markets).
const PRIORITY_COUNTRIES = [
  'US', 'GB', 'CN', 'DE', 'FR', 'IT', 'ES', 'NL', 'IE', 'SE', 'BE',
  'HK', 'MX', 'CA', 'VN', 'PK', 'EG',
  'AU', 'JP', 'KR', 'SG', 'TW', 'TH', 'ID', 'PH', 'IN', 'MY',
  'BR', 'AR', 'CL', 'CO', 'PE',
  'CH', 'AT', 'DK', 'NO', 'FI', 'PL', 'CZ', 'PT', 'GR', 'RO', 'HU',
  'AE', 'SA', 'IL', 'TR', 'ZA', 'NG', 'KE', 'MA', 'NZ'
];

// libaddressinput metadata endpoints (Google's public service, CORS-enabled).
//
// Two distinct endpoints exist:
//   * /ssl-address/data            -> flat per-country metadata, fields at top
//                                     level. The ROOT of this endpoint is the
//                                     only place that returns the master
//                                     `countries` list ({"countries":"AC~AD..."}).
//   * /ssl-aggregate-address/data  -> bundled per-country metadata that also
//                                     includes every subdivision (state /
//                                     province) in one response. Country
//                                     metadata is wrapped under a "data/<CC>"
//                                     key, with subdivisions under
//                                     "data/<CC>/<SUB>". The aggregate root
//                                     ("/data" with no country) returns {} —
//                                     it is per-country only.
//
// Phase 1 needs the country list (LIST endpoint) and per-country fmt + label
// hints (AGGREGATE endpoint, so subsequent phases get state/province lists
// for free without re-fetching).
const LIBADDRESS_LIST_BASE = 'https://chromium-i18n.appspot.com/ssl-address/data';
const LIBADDRESS_AGGREGATE_BASE = 'https://chromium-i18n.appspot.com/ssl-aggregate-address/data';

// In-memory cache of per-country metadata (populated lazily on selection).
const metadataCache = new Map();

// Default format (used as a fallback if metadata fetch fails).
const DEFAULT_FMT = '%N%n%O%n%A%n%C %S %Z';

// Token → human-readable label fallbacks. Real labels come from metadata
// (state_name_type, locality_name_type, zip_name_type, etc.).
const TOKEN_FALLBACK_LABELS = {
  N: 'Recipient',
  O: 'Organization',
  A: 'Address',
  D: 'Neighborhood',
  C: 'City',
  S: 'State',
  Z: 'Postal code',
  X: 'Sorting code'
};

// Map metadata "*_name_type" enum values to display labels.
const NAME_TYPE_LABELS = {
  area:        'Area',
  county:      'County',
  department:  'Department',
  district:    'District',
  do_si:       'Do/Si',
  emirate:     'Emirate',
  island:      'Island',
  oblast:      'Oblast',
  parish:      'Parish',
  prefecture:  'Prefecture',
  province:    'Province',
  state:       'State',
  city:        'City',
  post_town:   'Post town',
  suburb:      'Suburb',
  townland:    'Townland',
  village_township: 'Village / Township',
  neighborhood: 'Neighborhood',
  zip:         'ZIP code',
  postal:      'Postal code',
  pin:         'PIN code',
  eircode:     'Eircode'
};

/**
 * Fetch the master list of supported countries from libaddressinput.
 * The root metadata endpoint returns { id, countries: "AC~AD~AE~..." }.
 * Returns an array of ISO-3166 alpha-2 codes. Falls back to the priority
 * list if the network call fails.
 */
async function fetchCountryCodes() {
  try {
    const response = await fetch(LIBADDRESS_LIST_BASE);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    if (typeof data.countries === 'string' && data.countries.length > 0) {
      return data.countries.split('~').map((c) => c.trim()).filter(Boolean);
    }
    throw new Error('Empty countries field');
  } catch (err) {
    console.warn('[address-validations] Country list fetch failed; using priority fallback.', err);
    return [...PRIORITY_COUNTRIES];
  }
}

/**
 * Resolve a human-readable country name from an ISO-3166 alpha-2 code,
 * using the browser's built-in Intl.DisplayNames. Falls back to the code
 * itself if Intl.DisplayNames is unavailable or returns nothing.
 */
function countryName(code) {
  try {
    if (typeof Intl !== 'undefined' && typeof Intl.DisplayNames === 'function') {
      const dn = new Intl.DisplayNames(['en'], { type: 'region' });
      const name = dn.of(code);
      if (name && name !== code) return name;
    }
  } catch (_) {
    // ignore — fall through to code
  }
  return code;
}

/**
 * Build the ordered country list:
 *   1. Priority countries (in defined order) that are present in the master list.
 *   2. Remaining countries, sorted alphabetically by display name.
 */
function buildOrderedCountries(allCodes) {
  const allSet = new Set(allCodes);
  const priority = PRIORITY_COUNTRIES
    .filter((code) => allSet.has(code))
    .map((code) => ({ code, name: countryName(code) }));

  const prioritySet = new Set(priority.map((c) => c.code));
  const remainder = allCodes
    .filter((code) => !prioritySet.has(code))
    .map((code) => ({ code, name: countryName(code) }))
    .sort((a, b) => a.name.localeCompare(b.name));

  return { priority, remainder };
}

/**
 * Populate the country <select> with priority group + the rest (alphabetical).
 */
function populateCountryDropdown(selectEl, priority, remainder) {
  // Start fresh but keep the leading placeholder if present.
  const placeholder = selectEl.querySelector('option[value=""]');
  selectEl.innerHTML = '';
  if (placeholder) selectEl.appendChild(placeholder);

  if (priority.length > 0) {
    const pGroup = document.createElement('optgroup');
    pGroup.label = 'Common';
    priority.forEach(({ code, name }) => {
      const opt = document.createElement('option');
      opt.value = code;
      opt.textContent = name;
      pGroup.appendChild(opt);
    });
    selectEl.appendChild(pGroup);
  }

  if (remainder.length > 0) {
    const rGroup = document.createElement('optgroup');
    rGroup.label = 'All countries';
    remainder.forEach(({ code, name }) => {
      const opt = document.createElement('option');
      opt.value = code;
      opt.textContent = name;
      rGroup.appendChild(opt);
    });
    selectEl.appendChild(rGroup);
  }
}

/**
 * Fetch per-country libaddressinput metadata (format string, required fields,
 * localized field labels). Cached in-memory for the session.
 */
async function fetchCountryMetadata(code) {
  if (metadataCache.has(code)) return metadataCache.get(code);
  try {
    const response = await fetch(`${LIBADDRESS_AGGREGATE_BASE}/${encodeURIComponent(code)}`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const raw = await response.json();
    // Aggregate responses wrap the country record under a "data/<CC>" key,
    // with subdivisions under "data/<CC>/<SUB>". Unwrap to the country record.
    const wrappedKey = `data/${code}`;
    const country = raw && raw[wrappedKey] ? raw[wrappedKey] : raw;
    if (!country || typeof country.fmt !== 'string') {
      throw new Error(`Unexpected metadata shape for ${code} (no fmt)`);
    }
    // Pull subdivisions into `subdivisions` array on the cached object so
    // later phases can render a state/province dropdown without re-fetching.
    const subdivisions = Object.keys(raw || {})
      .filter((k) => k.startsWith(`${wrappedKey}/`))
      .map((k) => raw[k]);
    const result = Object.assign({}, country, { subdivisions });
    metadataCache.set(code, result);
    return result;
  } catch (err) {
    console.warn(`[address-validations] Metadata fetch failed for ${code}; using defaults.`, err);
    const fallback = { fmt: DEFAULT_FMT, require: 'ACZ', subdivisions: [] };
    metadataCache.set(code, fallback);
    return fallback;
  }
}

/**
 * Resolve a per-country label for a format token, using the metadata
 * `state_name_type`, `locality_name_type`, `zip_name_type`, etc.
 */
function labelForToken(token, metadata) {
  const m = metadata || {};
  switch (token) {
    case 'N': return 'Recipient';
    case 'O': return 'Organization';
    case 'A': return 'Street address';
    case 'D': return NAME_TYPE_LABELS[m.sublocality_name_type] || 'Neighborhood';
    case 'C': return NAME_TYPE_LABELS[m.locality_name_type] || 'City';
    case 'S': return NAME_TYPE_LABELS[m.state_name_type] || 'State / Province';
    case 'Z': return NAME_TYPE_LABELS[m.zip_name_type] || 'Postal code';
    case 'X': return 'Sorting code';
    default:  return TOKEN_FALLBACK_LABELS[token] || token;
  }
}

/**
 * Parse a libaddressinput `fmt` string into an ordered list of lines,
 * where each line is an array of {token,label} entries. Tokens are the
 * single letters following a `%`; `%n` is the line separator.
 *
 * Example: "%N%n%O%n%A%n%C %S %Z" ->
 *   [ [{N}], [{O}], [{A}], [{C},{S},{Z}] ]
 */
function parseFmt(fmt, metadata) {
  const raw = (fmt || DEFAULT_FMT);
  const lines = raw.split('%n');
  const required = new Set((metadata && metadata.require ? metadata.require : '').split(''));

  return lines.map((line) => {
    const tokens = [];
    // Match %<LETTER> tokens; ignore literal separator chars between them.
    const re = /%([A-Za-z])/g;
    let match;
    while ((match = re.exec(line)) !== null) {
      const token = match[1];
      tokens.push({
        token,
        label: labelForToken(token, metadata),
        required: required.has(token)
      });
    }
    return tokens;
  }).filter((tokens) => tokens.length > 0);
}

/**
 * Render the address fields for a country. Fields are disabled (greyed out)
 * for Phase 1 — they exist so the structure is visible and ready for the
 * next phase (Google Places Autocomplete + AV).
 */
function renderFields(container, lines, metadata) {
  container.innerHTML = '';

  if (!lines || lines.length === 0) {
    container.innerHTML = '<p class="address-validator__hint">No fields available for this country.</p>';
    return;
  }

  const form = document.createElement('div');
  form.className = 'address-validator__form';

  lines.forEach((tokens) => {
    const row = document.createElement('div');
    row.className = 'address-validator__row';
    tokens.forEach(({ token, label, required }) => {
      const cell = document.createElement('div');
      cell.className = 'address-validator__cell';
      cell.dataset.token = token;

      const id = `addr-field-${token.toLowerCase()}`;
      const lbl = document.createElement('label');
      lbl.className = 'address-validator__field-label';
      lbl.setAttribute('for', id);
      lbl.textContent = required ? `${label} *` : label;

      const input = document.createElement('input');
      input.type = 'text';
      input.id = id;
      input.name = id;
      input.disabled = true; // greyed-out for Phase 1
      input.className = 'address-validator__field-input';
      input.setAttribute('autocomplete', 'off');

      cell.appendChild(lbl);
      cell.appendChild(input);
      row.appendChild(cell);
    });
    form.appendChild(row);
  });

  container.appendChild(form);
}

/**
 * Main initialization entry point — called from main.js on subpageLoaded
 * for vendor-request/create/address-validations.
 */
export async function initializeAddressValidations() {
  console.log('[address-validations] init');

  const selectEl = document.getElementById('address-country-select');
  const fieldsEl = document.getElementById('address-fields-container');
  if (!selectEl || !fieldsEl) {
    console.error('[address-validations] Required DOM nodes missing.');
    return;
  }

  // 1. Populate the country dropdown.
  const codes = await fetchCountryCodes();
  const { priority, remainder } = buildOrderedCountries(codes);
  populateCountryDropdown(selectEl, priority, remainder);

  // 2. Wire the change handler.
  selectEl.addEventListener('change', async (ev) => {
    const code = ev.target.value;
    if (!code) {
      fieldsEl.innerHTML =
        '<p class="address-validator__hint">Select a country above to see the correct address fields for that country.</p>';
      return;
    }

    fieldsEl.innerHTML = '<p class="address-validator__hint">Loading fields…</p>';
    const metadata = await fetchCountryMetadata(code);
    const lines = parseFmt(metadata.fmt, metadata);
    renderFields(fieldsEl, lines, metadata);
  });

  console.log(`[address-validations] ready — ${priority.length} priority + ${remainder.length} other countries`);
}

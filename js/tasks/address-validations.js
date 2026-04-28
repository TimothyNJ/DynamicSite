/**
 * address-validations.js
 *
 * Phase 1 — country selector + address fields rendered biggest → smallest.
 *
 * Field order (always, regardless of libaddressinput's per-country `fmt`
 * ordering):
 *
 *   1. Region      (state / province / prefecture / etc — labelled per
 *                   country via country-overrides.js, rendered as a
 *                   <select> when subdivisions are available)
 *   2. District    (county / council — only rendered when the country's
 *                   override defines `districtLabel`)
 *   3. City        (town / city / suburb)
 *   4. Postal code (ZIP / postcode / Eircode / PIN / CEP)
 *
 * libaddressinput is still consulted to decide which fields the country
 * actually uses (does the `fmt` mention %S? %Z?), to populate the region
 * dropdown values (sub_keys / sub_names), and to drive the required-field
 * asterisks (the `require` string). Labels come from country-overrides.js
 * first, libaddressinput second, fallback third.
 *
 * Country dropdown structure:
 *   - United States                              (pinned at the top)
 *   - <optgroup label="Common">                  alphabetical
 *       Australia, Canada, France, …
 *   - <optgroup label="All Countries">           every country, alphabetical
 *       Afghanistan, Åland Islands, …, United States, …
 *
 * The "All Countries" group intentionally re-lists US and the Commons —
 * it is the canonical full list.
 */

import { COMMON_COUNTRIES, getOverride } from './country-overrides.js';
import { componentFactory } from '../factory/ComponentFactory.js';

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
const LIBADDRESS_LIST_BASE = 'https://chromium-i18n.appspot.com/ssl-address/data';
const LIBADDRESS_AGGREGATE_BASE = 'https://chromium-i18n.appspot.com/ssl-aggregate-address/data';

// Fallback country list used only if the live country fetch fails. Keeps
// the page usable offline.
const FALLBACK_COUNTRY_CODES = [
  'US', 'GB', 'CA', 'AU', 'NZ', 'IE', 'DE', 'FR', 'IT', 'ES', 'NL', 'CH',
  'AT', 'BE', 'DK', 'NO', 'SE', 'FI', 'PT', 'GR', 'PL', 'CZ', 'HU', 'RO',
  'TR', 'IL', 'AE', 'SA', 'EG', 'ZA', 'KE', 'NG', 'MA',
  'CN', 'HK', 'TW', 'JP', 'KR', 'SG', 'IN', 'PK', 'TH', 'VN', 'ID', 'PH', 'MY',
  'MX', 'BR', 'AR', 'CL', 'CO', 'PE'
];

// In-memory cache of per-country metadata (populated lazily on selection).
const metadataCache = new Map();

// Default format used as a fallback if a country's metadata fetch fails.
const DEFAULT_FMT = '%N%n%O%n%A%n%C %S %Z';

// Map libaddressinput "*_name_type" enum values to display labels. Used
// when no override is defined for a country.
const NAME_TYPE_LABELS = {
  area:             'Area',
  county:           'County',
  department:       'Department',
  district:         'District',
  do_si:            'Do/Si',
  emirate:          'Emirate',
  island:           'Island',
  oblast:           'Oblast',
  parish:           'Parish',
  prefecture:       'Prefecture',
  province:         'Province',
  state:            'State',
  city:             'City',
  post_town:        'Post town',
  suburb:           'Suburb',
  townland:         'Townland',
  village_township: 'Village / Township',
  neighborhood:     'Neighborhood',
  zip:              'ZIP code',
  postal:           'Postal code',
  pin:              'PIN code',
  eircode:          'Eircode'
};

/**
 * Fetch the master list of supported countries from libaddressinput.
 * The root metadata endpoint returns { id, countries: "AC~AD~AE~..." }.
 * Returns an array of ISO 3166-1 alpha-2 codes.
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
    console.warn('[address-validations] Country list fetch failed; using fallback list.', err);
    return [...FALLBACK_COUNTRY_CODES];
  }
}

/**
 * Resolve a human-readable country name from an ISO 3166-1 alpha-2 code,
 * using the browser's built-in Intl.DisplayNames. Falls back to the code
 * itself if Intl.DisplayNames is unavailable.
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
 * Build the three groups for the country dropdown:
 *   - pinned: the single US entry (or empty if US not in master list)
 *   - common: COMMON_COUNTRIES intersected with master list, A→Z by name
 *   - all:    every country in the master list, A→Z by name
 *
 * The "all" group is intentionally complete — it re-lists US and the
 * commons. The user wants one canonical full list, not a deduped one.
 */
function buildCountryGroups(allCodes) {
  const allSet = new Set(allCodes);

  const pinned = allSet.has('US')
    ? [{ code: 'US', name: countryName('US') }]
    : [];

  const common = COMMON_COUNTRIES
    .filter((code) => allSet.has(code))
    .map((code) => ({ code, name: countryName(code) }))
    .sort((a, b) => a.name.localeCompare(b.name));

  const all = allCodes
    .map((code) => ({ code, name: countryName(code) }))
    .sort((a, b) => a.name.localeCompare(b.name));

  return { pinned, common, all };
}

/**
 * Build a flat, deduped list of country names plus a lookup map from
 * name → ISO code. Used to feed the combobox engine (which works in
 * display strings) while still being able to resolve the selected name
 * back to the ISO code that libaddressinput needs.
 *
 * Order: pinned (United States) first, then every country alphabetical
 * with the pinned skipped on the second pass. The "common" tier is
 * dropped — combobox typeahead makes group prioritisation unnecessary
 * (typing two letters narrows the list faster than scanning a "Common"
 * group ever could).
 */
function buildCountryComboboxData(pinned, _common, all) {
  const items = [];
  const nameToCode = new Map();
  const seen = new Set();
  const add = ({ code, name }) => {
    if (seen.has(code)) return;  // dedupe by code (canonical) not by name
    // Compose 'Name (CODE)' or 'Name (CODE/ALIAS)'. The official ISO
    // code comes first; aliasCodes follow. The combobox filter splits
    // on '/' inside the parens and matches any token — typing 'gb' or
    // 'uk' both find 'United Kingdom (GB/UK)', and 'au' or 'oz' both
    // find 'Australia (AU/OZ)'.
    const override = getOverride(code);
    const aliasList = (override && Array.isArray(override.aliasCodes))
      ? override.aliasCodes
      : [];
    const codeStr = aliasList.length > 0
      ? `${code}/${aliasList.join('/')}`
      : code;
    const display = `${name} (${codeStr})`;
    items.push(display);
    nameToCode.set(display, code);
    seen.add(code);
  };
  pinned.forEach(add);
  all.forEach(add);  // already alphabetical from buildCountryGroups
  return { items, nameToCode };
}

/**
 * Fetch per-country libaddressinput metadata. Cached in-memory for the
 * session. Aggregate responses wrap the country record under a "data/<CC>"
 * key, with subdivisions under "data/<CC>/<SUB>".
 */
async function fetchCountryMetadata(code) {
  if (metadataCache.has(code)) return metadataCache.get(code);
  try {
    const response = await fetch(`${LIBADDRESS_AGGREGATE_BASE}/${encodeURIComponent(code)}`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const raw = await response.json();
    const wrappedKey = `data/${code}`;
    const country = raw && raw[wrappedKey] ? raw[wrappedKey] : raw;
    if (!country || typeof country.fmt !== 'string') {
      throw new Error(`Unexpected metadata shape for ${code} (no fmt)`);
    }
    // Pull subdivisions into a normalised array. Each entry: { code, name }.
    const subdivisions = Object.keys(raw || {})
      .filter((k) => k.startsWith(`${wrappedKey}/`))
      .map((k) => raw[k])
      .filter((s) => s && s.key && s.name)
      .map((s) => ({ code: s.key, name: s.name }));
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
 * Resolve the four field labels for a country, taking the override first
 * and falling back to libaddressinput's `*_name_type` then a hard-coded
 * default.
 */
function resolveLabels(metadata, override) {
  const m = metadata || {};
  const o = override || {};
  return {
    region:   o.regionLabel   || NAME_TYPE_LABELS[m.state_name_type]    || 'Region',
    district: o.districtLabel || null, // district only renders if override defines it
    city:     o.cityLabel     || NAME_TYPE_LABELS[m.locality_name_type] || 'City',
    postal:   o.postalLabel   || NAME_TYPE_LABELS[m.zip_name_type]      || 'Postal code'
  };
}

/**
 * Decide which rows to render for the selected country. Country, City and
 * Postal code are always present. Region renders if the country's `fmt`
 * includes %S OR the override seeds its own region list. District renders
 * only if the override defines `districtLabel`.
 */
function decideRowVisibility(metadata, override) {
  const fmt = (metadata && metadata.fmt) || DEFAULT_FMT;
  const hasS = /%S/.test(fmt);
  const hasC = /%C/.test(fmt);
  const hasZ = /%Z/.test(fmt);
  const overrideRegions = Array.isArray(override && override.regions) && override.regions.length > 0;
  const subdivisions = (metadata && metadata.subdivisions) || [];

  return {
    region:   hasS || overrideRegions || subdivisions.length > 0,
    district: !!(override && override.districtLabel),
    // City always shown — virtually every country has one and libaddressinput
    // sometimes omits %C in the fmt string even when a city field is used.
    city:     hasC || true,
    // Postal shown only when the fmt mentions %Z. Countries without postcodes
    // (HK, AE, parts of IE historically) should not present an empty field.
    postal:   hasZ
  };
}

/**
 * Required-field detection from libaddressinput's `require` string.
 * Tokens used here: A (street), C (city), S (region), Z (postal).
 */
function isRequired(metadata, token) {
  const req = (metadata && metadata.require) || '';
  return req.indexOf(token) !== -1;
}

// ─── Validation ─────────────────────────────────────────────────────────────

/**
 * Build a validator for the postal-code field from the country's metadata.
 * libaddressinput's `zip` field is a regex string when format validation is
 * supported, or absent when the country has no postal code at all (HK, AE,
 * IE for most purposes). We anchor the regex and make it case-insensitive
 * so "sw1a 1aa" validates the same as "SW1A 1AA".
 *
 * Returns a function (value) → string | null. Null means valid; a string is
 * the error message to show.
 */
function makePostalValidator(metadata, required) {
  const zipRegex = metadata && typeof metadata.zip === 'string' && metadata.zip.length > 0
    ? new RegExp(`^${metadata.zip}$`, 'i')
    : null;

  return (rawValue) => {
    const value = (rawValue || '').trim();
    if (!value) {
      return required ? 'Required' : null;
    }
    if (zipRegex && !zipRegex.test(value)) {
      return 'Invalid format for this country';
    }
    return null;
  };
}

/**
 * Generic required-field validator — returns "Required" if empty, null
 * otherwise. Used for non-postal fields (region, city, district).
 */
function makeRequiredValidator(required) {
  return (rawValue) => {
    const value = (rawValue || '').trim();
    if (!value && required) return 'Required';
    return null;
  };
}

/**
 * Attach validation to a control: run the validator on blur, surface the
 * result via the paired error span, toggle the invalid class on the input,
 * and clear the error as soon as the user starts correcting it.
 */
function attachValidator(control, validator) {
  // Look up the error span lazily — at attach time the row may not yet be
  // in the document (renderFields appends the whole form at the end), so
  // getElementById would return null. Reading it on each call means we
  // always get the live element once the form is mounted.
  const getErrEl = () => document.getElementById(`${control.id}-error`);

  const run = () => {
    const msg = validator(control.value);
    const errEl = getErrEl();
    if (msg) {
      control.classList.add('address-validator__field-input--invalid');
      if (errEl) errEl.textContent = msg;
    } else {
      control.classList.remove('address-validator__field-input--invalid');
      if (errEl) errEl.textContent = '';
    }
  };

  control.addEventListener('blur', run);
  control.addEventListener('input', () => {
    // Clear invalid styling the moment the user starts typing. Re-runs on
    // the next blur.
    control.classList.remove('address-validator__field-input--invalid');
    const errEl = getErrEl();
    if (errEl) errEl.textContent = '';
  });
  // On <select> change, validate immediately — selects don't fire blur
  // reliably after a keyboard pick.
  if (control.tagName === 'SELECT') {
    control.addEventListener('change', run);
  }
}

/**
 * Build a single labelled row (label + form control) — the unit used by
 * every level of the address layout.
 */
function makeRow({ id, label, required, control }) {
  const isInput = control.tagName === 'INPUT';

  const cell = document.createElement('div');
  cell.className = isInput
    ? 'address-validator__cell address-validator__cell--floating'
    : 'address-validator__cell';

  const lbl = document.createElement('label');
  lbl.className = 'address-validator__field-label';
  lbl.setAttribute('for', id);
  lbl.textContent = required ? `${label} *` : label;

  control.id = id;
  control.name = id;
  control.classList.add('address-validator__field-input');

  // Floating-label pattern: inputs need a non-empty placeholder so
  // `:placeholder-shown` can distinguish "empty" from "filled". A single
  // space is invisible to the user but lets the CSS sibling selector
  // float the label back into the field when the value clears. Hidden
  // by the SCSS `::placeholder { color: transparent }` rule.
  if (isInput && !control.getAttribute('placeholder')) {
    control.setAttribute('placeholder', ' ');
  }

  // Error message span — hidden until the field blurs in an invalid state.
  const errEl = document.createElement('span');
  errEl.className = 'address-validator__error';
  errEl.id = `${id}-error`;
  errEl.setAttribute('aria-live', 'polite');

  // Floating-label pattern requires the label to come AFTER the input in
  // DOM order so `input:focus + label` and `input:not(:placeholder-shown) + label`
  // can reach it. Selects keep the traditional label-above layout.
  if (isInput) {
    cell.appendChild(control);
    cell.appendChild(lbl);
  } else {
    cell.appendChild(lbl);
    cell.appendChild(control);
  }
  cell.appendChild(errEl);

  const row = document.createElement('div');
  row.className = 'address-validator__row';
  row.appendChild(cell);
  return row;
}

/**
 * Build a region <select> populated from libaddressinput subdivisions if
 * present, otherwise from the override's seeded `regions` array. Returns
 * a plain text input if neither source has values.
 */
function makeRegionControl(metadata, override) {
  const subdivisions = (metadata && metadata.subdivisions) || [];
  const seeded = (override && Array.isArray(override.regions)) ? override.regions : [];
  const values = subdivisions.length > 0 ? subdivisions : seeded;

  if (values.length === 0) {
    const input = document.createElement('input');
    input.type = 'text';
    input.setAttribute('autocomplete', 'off');
    return input;
  }

  const sel = document.createElement('select');
  const placeholder = document.createElement('option');
  placeholder.value = '';
  placeholder.textContent = '-- Select --';
  sel.appendChild(placeholder);
  values
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name))
    .forEach(({ code, name }) => {
      const opt = document.createElement('option');
      opt.value = code;
      opt.textContent = name;
      sel.appendChild(opt);
    });
  return sel;
}

/**
 * Render the full address-fields stack in fixed biggest → smallest order.
 */
function renderFields(container, code, metadata) {
  container.innerHTML = '';

  const override = getOverride(code);
  const labels = resolveLabels(metadata, override);
  const show = decideRowVisibility(metadata, override);

  const form = document.createElement('div');
  form.className = 'address-validator__form';

  // Engine-backed inits are captured here and run AFTER the form is
  // appended to the container — the engine needs its mount point to be
  // in the DOM for getComputedStyle / width measurement to work.
  const deferredInits = [];

  // 1. Region — three rendering paths:
  //    (a) Country has subdivisionCategories override (currently US only):
  //        render a Type combobox + a Region combobox; Type filters Region.
  //    (b) Country has subdivisions (libaddressinput or seeded) but no
  //        categories: render a single Region combobox.
  //    (c) Country has no subdivisions at all: free-form text input.
  if (show.region) {
    const subdivisions = (metadata && metadata.subdivisions) || [];
    const seeded = (override && Array.isArray(override.regions)) ? override.regions : [];
    const supplemental = (override && Array.isArray(override.supplementalRegions))
      ? override.supplementalRegions
      : [];
    // Union libaddressinput + supplemental + (only-if-no-libaddress) seeded,
    // deduped by code.
    const baseValues = subdivisions.length > 0 ? subdivisions : seeded;
    const allValues = mergeRegionsByCode(baseValues, supplemental);
    const regionRequired = isRequired(metadata, 'S');
    const categories = override && override.subdivisionCategories;

    if (categories && allValues.length > 0) {
      // (a) Single Region combobox with visual section separators
      // between the categories. The empty-string '' between groups is
      // the engine's separator sentinel — renders as a blank row,
      // skipped by filter / keyboard nav / selection.
      const placeholderId = 'addr-region-combobox-container';
      const row = document.createElement('div');
      row.className = 'address-validator__row address-validator__row--combobox';
      const cell = document.createElement('div');
      cell.className = 'address-validator__cell';
      const placeholder = document.createElement('div');
      placeholder.id = placeholderId;
      cell.appendChild(placeholder);
      row.appendChild(cell);
      form.appendChild(row);

      // Build per-group display lists in the order declared by the
      // override. Each item is 'Name (CODE)'.
      const codeToName = new Map();
      allValues.forEach(({ code: rcode, name }) => codeToName.set(rcode, name));
      const groupedItems = categories.groups.map((g) =>
        g.codes
          .map((c) => {
            const name = codeToName.get(c);
            return name ? formatRegionItem(name, c) : null;
          })
          .filter(Boolean)
          .sort((a, b) => a.localeCompare(b))
      );

      // Flatten with empty-string separators between non-empty groups.
      // No separators at start/end and no double-separators in a row.
      const items = [];
      groupedItems.forEach((groupList, idx) => {
        if (groupList.length === 0) return;
        if (items.length > 0) items.push('');  // separator
        items.push(...groupList);
      });

      deferredInits.push(() => {
        componentFactory.createListFloatingLabel(placeholderId, {
          id: 'addr-field-region',
          label: labels.region,
          placeholder: labels.region,
          items,
          onChange: (_name) => {
            // Strict-mode commits one item from the grouped list.
            // Read engine.options.value at submit time for required check.
          },
        });
      });
    } else if (allValues.length > 0) {
      // (b) Single Region combobox — no categories.
      const placeholderId = 'addr-region-combobox-container';
      const row = document.createElement('div');
      row.className = 'address-validator__row address-validator__row--combobox';
      const cell = document.createElement('div');
      cell.className = 'address-validator__cell';
      const placeholder = document.createElement('div');
      placeholder.id = placeholderId;
      cell.appendChild(placeholder);
      row.appendChild(cell);
      form.appendChild(row);

      const items = [];
      const nameToCode = new Map();
      const seen = new Set();
      allValues
        .slice()
        .sort((a, b) => a.name.localeCompare(b.name))
        .forEach(({ code: rcode, name }) => {
          if (seen.has(rcode)) return;  // dedupe by canonical code
          // Display 'Name (CODE)' so the code is visible and filterable
          // (typing 'tx' matches 'Texas (TX)', etc.) — same pattern as
          // the country picker. formatRegionItem strips any trailing
          // '(<code>)' that libaddressinput included in the name, so
          // names like 'Armed Forces (AA)' don't double up.
          const display = formatRegionItem(name, rcode);
          items.push(display);
          nameToCode.set(display, rcode);
          seen.add(rcode);
        });

      deferredInits.push(() => {
        componentFactory.createListFloatingLabel(placeholderId, {
          id: 'addr-field-region',
          label: labels.region,
          placeholder: labels.region,
          items,
          onChange: (_name) => {
            // Strict-mode commit. See note above for required-validation.
          },
        });
      });
    } else {
      // (c) Free-form text input.
      const control = makeRegionControl(metadata, override);
      form.appendChild(makeRow({
        id:       'addr-field-region',
        label:    labels.region,
        required: regionRequired,
        control,
      }));
      attachValidator(control, makeRequiredValidator(regionRequired));
    }
  }

  // 2. District / county / council — only when the override defines it.
  if (show.district) {
    const input = document.createElement('input');
    input.type = 'text';
    input.setAttribute('autocomplete', 'off');
    form.appendChild(makeRow({
      id:       'addr-field-district',
      label:    labels.district,
      required: false,
      control:  input
    }));
    // District is always optional — no validator attached.
  }

  // 3. City / town / suburb.
  if (show.city) {
    const input = document.createElement('input');
    input.type = 'text';
    input.setAttribute('autocomplete', 'off');
    const cityRequired = isRequired(metadata, 'C');
    form.appendChild(makeRow({
      id:       'addr-field-city',
      label:    labels.city,
      required: cityRequired,
      control:  input
    }));
    attachValidator(input, makeRequiredValidator(cityRequired));
  }

  // 4. Postal code / ZIP / postcode.
  if (show.postal) {
    const input = document.createElement('input');
    input.type = 'text';
    input.setAttribute('autocomplete', 'off');
    const postalRequired = isRequired(metadata, 'Z');
    form.appendChild(makeRow({
      id:       'addr-field-postal',
      label:    labels.postal,
      required: postalRequired,
      control:  input
    }));
    attachValidator(input, makePostalValidator(metadata, postalRequired));
  }

  container.appendChild(form);

  // Engine-backed fields render after mount so getComputedStyle on their
  // wrappers reads real values (the engine measures the longest-item width
  // at construction). Type and Region pickers register their inits in
  // deferredInits during the build phase above.
  deferredInits.forEach((init) => init());
}

/**
 * Compose 'Name (CODE)' for a region item. If the libaddressinput-supplied
 * name already ends with '(<CODE>)' (case-insensitive — e.g. the US military
 * entries arrive as 'Armed Forces (AA)'), strip the trailing parens before
 * appending so we don't double up: 'Armed Forces (AA) (AA)'.
 */
function formatRegionItem(name, code) {
  const escaped = String(code).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const trailing = new RegExp('\\s*\\(' + escaped + '\\)\\s*$', 'i');
  const cleanName = String(name).replace(trailing, '').trim();
  return `${cleanName} (${code})`;
}

/**
 * Merge two arrays of {code, name} region records, deduped by code (the
 * first occurrence wins). Used to add the override's supplementalRegions
 * to whatever libaddressinput returned without dropping libaddressinput's
 * canonical names if a code appears in both.
 */
function mergeRegionsByCode(primary, supplemental) {
  const seen = new Set();
  const out = [];
  (primary || []).forEach((r) => {
    if (!r || !r.code || seen.has(r.code)) return;
    seen.add(r.code);
    out.push(r);
  });
  (supplemental || []).forEach((r) => {
    if (!r || !r.code || seen.has(r.code)) return;
    seen.add(r.code);
    out.push(r);
  });
  return out;
}

/**
 * Main initialisation entry point — called from main.js on subpageLoaded
 * for tasks/create/address-validations.
 */
export async function initializeAddressValidations() {
  console.log('[address-validations] init');

  const containerEl = document.getElementById('address-country-container');
  const fieldsEl = document.getElementById('address-fields-container');
  if (!containerEl || !fieldsEl) {
    console.error('[address-validations] Required DOM nodes missing.');
    return;
  }

  // 1. Fetch the master country list and build the combobox feed.
  const codes = await fetchCountryCodes();
  const { pinned, common, all } = buildCountryGroups(codes);
  const { items, nameToCode } = buildCountryComboboxData(pinned, common, all);

  // 2. Render the country picker as a list_floating_label_component_engine
  //    combobox. The engine handles typeahead filter, keyboard nav, and the
  //    floating label. Selection callback fires with the country NAME — we
  //    look up the ISO code for libaddressinput's per-country metadata fetch.
  componentFactory.createListFloatingLabel('address-country-container', {
    id: 'address-country-list',
    label: 'Country',
    placeholder: 'Country',
    items,
    onChange: async (name) => {
      const code = nameToCode.get(name);
      if (!code) {
        // No selection (or selection cleared) — empty the fields area.
        fieldsEl.innerHTML = '';
        return;
      }
      fieldsEl.innerHTML = '<p class="address-validator__hint">Loading fields…</p>';
      const metadata = await fetchCountryMetadata(code);
      renderFields(fieldsEl, code, metadata);
    },
  });

  console.log(`[address-validations] ready — ${items.length} countries available via combobox`);
}

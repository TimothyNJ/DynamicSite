/**
 * country-overrides.js
 *
 * Per-country UI metadata that joins onto libaddressinput data by ISO 3166-1
 * alpha-2 code. libaddressinput is a postal-label dataset — accurate at saying
 * "this country has a state field" but indifferent to "what should that field
 * be called for an end user?". For several common countries the dataset is
 * either silent (e.g. Canada has no `state_name_type`) or one-dimensional
 * (Australia's `state_name_type: state` doesn't acknowledge the territories
 * that are in the dropdown). This file is the override layer for those gaps.
 *
 * Shape of an override entry — every field optional:
 *   {
 *     regionLabel:   string,    // label for the %S row (state / province / etc.)
 *     districtLabel: string,    // label for an extra county/council/district row
 *                               // (rendered only when this is set)
 *     cityLabel:     string,    // label for the %C row
 *     postalLabel:   string,    // label for the %Z row
 *     regions: [                // seeded subdivision list when libaddressinput
 *       { code, name },         //   has none (e.g. GB)
 *       ...
 *     ]
 *   }
 *
 * Resolution order at render time, per label:
 *   1. This file's override.
 *   2. libaddressinput's `*_name_type` mapped to a display label.
 *   3. Hard-coded fallback ("Region" / "City" / "Postal code").
 *
 * Resolution for the region dropdown values:
 *   1. libaddressinput subdivisions if present (US, CA, AU, JP, etc.).
 *   2. This file's `regions` array if defined (GB).
 *   3. Plain text input.
 */

// Ordered list of common countries shown in the "Common" group of the
// country dropdown, alphabetical by display name. US is pinned above this
// group separately and is intentionally NOT in this list — the "All
// Countries" group is the only place countries appear more than once.
export const COMMON_COUNTRIES = [
  'AU', // Australia
  'CA', // Canada
  'FR', // France
  'DE', // Germany
  'IN', // India
  'IE', // Ireland
  'JP', // Japan
  'MX', // Mexico
  'NZ', // New Zealand
  'GB'  // United Kingdom
];

export const COUNTRY_OVERRIDES = {
  US: {
    regionLabel:  'State / District / Territory',
    cityLabel:    'City',
    postalLabel:  'ZIP code',

    // Supplemental subdivision entries — added to whatever libaddressinput
    // returns. Compact-of-Free-Association states (FM, MH, PW) are
    // sovereign Pacific nations whose addresses USPS treats as
    // US-domestic for routing. libaddressinput sometimes omits them from
    // the US subdivisions list, so we ensure they're always present here.
    // Entries are deduped by code at runtime.
    supplementalRegions: [
      { code: 'FM', name: 'Federated States of Micronesia' },
      { code: 'MH', name: 'Marshall Islands' },
      { code: 'PW', name: 'Palau' },
    ],

    // Type / Region two-step picker for US. The address validator renders
    // a Type combobox (one of the four group names below), and on selection
    // populates the Region combobox with that group's subdivisions. Codes
    // not listed in any group fall through to "States" as a default.
    subdivisionCategories: {
      label: 'Type',
      groups: [
        {
          name: 'States',
          codes: [
            'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA',
            'HI','ID','IL','IN','IA','KS','KY','LA','ME','MD',
            'MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ',
            'NM','NY','NC','ND','OH','OK','OR','PA','RI','SC',
            'SD','TN','TX','UT','VT','VA','WA','WV','WI','WY',
          ],
        },
        {
          name: 'Districts',
          codes: ['DC'],
        },
        {
          name: 'Territories',
          // Five US territories + three Compact-of-Free-Association
          // sovereign nations whose addresses USPS treats as US-domestic.
          // FM/MH/PW also appear as countries in their own right in the
          // country picker — both routes are intentional.
          codes: ['AS', 'GU', 'MP', 'PR', 'VI', 'FM', 'MH', 'PW'],
        },
        {
          name: 'Military',
          // APO / FPO routing pseudo-states for service members posted
          // outside the continental US. Not geographic places — mail
          // routes through a military hub which forwards to the actual
          // physical destination (a base in Germany, a ship at sea, etc.).
          codes: ['AA', 'AE', 'AP'],
        },
      ],
    },
  },
  CA: {
    regionLabel:  'Province / Territory',
    cityLabel:    'City',
    postalLabel:  'Postal code'
  },
  AU: {
    regionLabel:  'State / Territory',
    cityLabel:    'Suburb',
    postalLabel:  'Postcode'
  },
  GB: {
    // libaddressinput returns no subdivisions for the UK at all. Seed the
    // four constituent countries ourselves so the user has something to
    // pick from at the region level. County / council remains a free-text
    // row below it.
    regionLabel:   'Country',
    districtLabel: 'County / Council',
    cityLabel:     'Town / City',
    postalLabel:   'Postcode',
    regions: [
      { code: 'ENG', name: 'England' },
      { code: 'SCT', name: 'Scotland' },
      { code: 'WLS', name: 'Wales' },
      { code: 'NIR', name: 'Northern Ireland' }
    ],
    // Common informal abbreviations users may type. Listed BEFORE the
    // ISO code in the display so 'UK' comes first ('United Kingdom (UK/GB)').
    // The combobox filter matches any code in the parens, so typing 'uk'
    // or 'gb' both surface United Kingdom.
    aliasCodes: ['UK']
  },
  IE: {
    regionLabel:  'County',
    cityLabel:    'Town / City',
    postalLabel:  'Eircode'
  },
  JP: {
    regionLabel:  'Prefecture',
    cityLabel:    'City / Ward',
    postalLabel:  'Postal code'
  },
  IN: {
    regionLabel:  'State / Union Territory',
    cityLabel:    'City',
    postalLabel:  'PIN code'
  },
  MX: {
    regionLabel:  'State',
    cityLabel:    'City',
    postalLabel:  'Postal code'
  },
  DE: {
    // No region row — DE addresses don't carry a state for postal use.
    cityLabel:    'City',
    postalLabel:  'Postal code'
  },
  FR: {
    cityLabel:    'City',
    postalLabel:  'Postal code'
  },
  NZ: {
    cityLabel:    'City',
    postalLabel:  'Postcode'
  },
  CN: {
    regionLabel:  'Province',
    cityLabel:    'City',
    postalLabel:  'Postal code'
  },
  HK: {
    regionLabel:  'District',
    cityLabel:    'Area',
    postalLabel:  'Postal code'
  },
  TW: {
    regionLabel:  'County / City',
    cityLabel:    'District',
    postalLabel:  'Postal code'
  },
  KR: {
    regionLabel:  'Province / Metropolitan City',
    cityLabel:    'City / District',
    postalLabel:  'Postal code'
  },
  SG: {
    cityLabel:    'City',
    postalLabel:  'Postal code'
  },
  AE: {
    regionLabel:  'Emirate',
    cityLabel:    'City',
    postalLabel:  'Postal code'
  },
  IT: {
    regionLabel:  'Province',
    cityLabel:    'City',
    postalLabel:  'Postal code'
  },
  ES: {
    regionLabel:  'Province',
    cityLabel:    'City',
    postalLabel:  'Postal code'
  },
  NL: {
    cityLabel:    'City',
    postalLabel:  'Postal code'
  },
  BR: {
    regionLabel:  'State',
    cityLabel:    'City',
    postalLabel:  'CEP'
  },
  AR: {
    regionLabel:  'Province',
    cityLabel:    'City',
    postalLabel:  'Postal code'
  },
  CH: {
    cityLabel:    'City',
    postalLabel:  'Postal code'
  },
  ZA: {
    regionLabel:  'Province',
    cityLabel:    'City',
    postalLabel:  'Postal code'
  }
};

/**
 * Look up the override for a country code. Returns an empty object if none
 * is defined, so callers can always read fields without null-checks.
 */
export function getOverride(code) {
  return COUNTRY_OVERRIDES[code] || {};
}

// userTimeZone.js — central source of the user's preferred IANA time zone.
//
// Used by the Deployment Index table (and any future feature) to render local
// timestamps consistently with the user's chosen zone. The Settings page
// exposes a placeholder <select> dropdown that updates this value at runtime;
// persistence and the real dropdown engine come later.
//
// Default zone: Portland, Oregon → IANA "America/Los_Angeles". `Intl` picks
// "PDT" or "PST" automatically based on whether DST is active for the date
// being formatted.

const STORAGE_KEY = 'userTimeZone';

// Default = Portland, Oregon (Pacific time).
const DEFAULT_TIME_ZONE = 'America/Los_Angeles';

// Module-level mutable variable. Read via getUserTimeZone() in normal code;
// the named export `User_Time_Zone` is also available for callers that want
// the current value without going through the getter.
export let User_Time_Zone =
  (typeof localStorage !== 'undefined' && localStorage.getItem(STORAGE_KEY)) ||
  DEFAULT_TIME_ZONE;

export function getUserTimeZone() {
  return User_Time_Zone;
}

export function setUserTimeZone(zone) {
  User_Time_Zone = zone;
  try {
    localStorage.setItem(STORAGE_KEY, zone);
  } catch (_) {
    /* localStorage may be blocked in some contexts — silently ignore */
  }
}

// Format an ISO instant as "YYYYMMDD HHMM UTC".
// Example: "2026-04-14T15:35:20Z" -> "20260414 1535 UTC"
export function formatUtcTimestamp(iso) {
  const d = new Date(iso);
  const pad = (n) => String(n).padStart(2, '0');
  const yyyy = d.getUTCFullYear();
  const mm = pad(d.getUTCMonth() + 1);
  const dd = pad(d.getUTCDate());
  const hh = pad(d.getUTCHours());
  const mn = pad(d.getUTCMinutes());
  return `${yyyy}${mm}${dd} ${hh}${mn} UTC`;
}

// Format an ISO instant as "YYYYMMDD HHMM <TZ_ABBR>" in the user's time zone.
// Example: "2026-04-14T15:35:20Z" + "America/Los_Angeles" -> "20260414 0835 PDT"
// The abbreviation (PDT vs PST, BST vs GMT, etc.) is chosen by Intl based on
// whether DST is active for the given date.
export function formatLocalTimestamp(iso, zone = User_Time_Zone) {
  const d = new Date(iso);
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone: zone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZoneName: 'short',
  });
  const parts = Object.fromEntries(
    fmt.formatToParts(d).map((p) => [p.type, p.value])
  );
  // Some implementations return "24" for midnight under hour12:false — normalise.
  const hh = parts.hour === '24' ? '00' : parts.hour;
  return `${parts.year}${parts.month}${parts.day} ${hh}${parts.minute} ${parts.timeZoneName}`;
}

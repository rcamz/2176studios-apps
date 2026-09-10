// URL state helpers.
//
// Every calculator previously decoded numbers as `parseFloat(p.get(k)) || DEFAULT`.
// Since `0 || 500` is `500`, any field with a non-zero default could not be set
// to zero across a reload or a shared link — 62 fields across the suite. That
// silently broke Save/Share: a recipient could see different numbers than the
// sender.
//
// The mortgage calculator had reached for `??` on two fields, but `parseFloat`
// returns NaN rather than null, and `NaN ?? x` is NaN — so those rendered "$NaN"
// on a malformed URL. Both directions need an explicit finite check.

export function num(raw, fallback) {
  const n = parseFloat(raw);
  return Number.isFinite(n) ? n : fallback;
}

export function bool(raw, fallback = false) {
  if (raw === '1' || raw === 'true') return true;
  if (raw === '0' || raw === 'false') return false;
  return fallback;
}

// Decode a short code back to a full value, e.g. { m: 'monthly' }.
export function enumOf(raw, map, fallback) {
  return Object.prototype.hasOwnProperty.call(map, raw) ? map[raw] : fallback;
}

// Clamp on read so a hand-edited URL can't push a value out of range.
export function clamped(raw, fallback, min, max) {
  const n = num(raw, fallback);
  return Math.min(max, Math.max(min, n));
}

// Same finite guard for input handlers. Returns null for an empty field so the
// caller can keep the input blank rather than forcing a 0 while typing.
export function parseInput(raw, { allowEmpty = false } = {}) {
  if (allowEmpty && (raw === '' || raw === null || raw === undefined)) return null;
  const n = parseFloat(raw);
  return Number.isFinite(n) ? n : 0;
}

export function writeUrl(params) {
  const qs = params.toString();
  window.history.replaceState(null, '', `${window.location.pathname}${qs ? '?' + qs : ''}`);
}

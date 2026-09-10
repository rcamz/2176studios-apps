// Shared formatters.
//
// Previously each instance defined its own. Four divergent `fmtShort`
// implementations were in play, differing in decimal places on millions
// ($1.25M vs $1.2M for the same number) and two of them lacked a sub-$1,000
// branch, rendering any value under $1,000 as "$0k".

export const fmt = (n) => '$' + Math.round(n).toLocaleString('en-AU');

export const fmtCents = (n) =>
  '$' + n.toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// Compact currency. Two decimals on millions, and always a real value below
// $1,000 — never "$0k".
export const fmtShort = (n) => {
  const abs = Math.abs(n);
  const sign = n < 0 ? '-' : '';
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(2)}M`;
  if (abs >= 1_000)     return `${sign}$${Math.round(abs / 1_000)}k`;
  return `${sign}$${Math.round(abs)}`;
};

// Takes a fraction (0.325), not a percentage.
export const fmtPct = (n, dp = 1) => (n * 100).toFixed(dp) + '%';

export const fmtKg = (n) => `${n.toFixed(1)} kg`;
export const fmtKcal = (n) => `${Math.round(n).toLocaleString('en-AU')} kcal`;

export function monthsToLabel(months) {
  const y = Math.floor(months / 12);
  const m = Math.round(months % 12);
  const parts = [y && `${y}y`, m && `${m}m`].filter(Boolean);
  return parts.length ? parts.join(' ') : '0m';
}

export function yearsAndMonths(months) {
  const y = Math.floor(months / 12);
  const m = Math.round(months % 12);
  if (y && m) return `${y}yr ${m}mo`;
  if (y) return `${y}yr`;
  if (m) return `${m}mo`;
  return 'less than a month';
}

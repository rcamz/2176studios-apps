// Structured "how this was calculated" output.
//
// Three reasons this earns its place: it lets a user check their own inputs,
// it turns an opaque number into something they can argue with, and it is the
// difference between a calculator asserting an answer and showing its work.
//
// Builders only — no formatting. The component decides presentation.

export const LINE = 'line';
export const SUBTOTAL = 'subtotal';
export const TOTAL = 'total';
export const NOTE = 'note';

export function step(label, value, opts = {}) {
  return { kind: LINE, label, value, note: opts.note ?? null, muted: opts.muted ?? false };
}

export function subtotal(label, value, opts = {}) {
  return { kind: SUBTOTAL, label, value, note: opts.note ?? null };
}

export function total(label, value, opts = {}) {
  return { kind: TOTAL, label, value, note: opts.note ?? null };
}

export function note(text) {
  return { kind: NOTE, label: text, value: null };
}

export function section(heading, steps, opts = {}) {
  return { heading, steps: steps.filter(Boolean), note: opts.note ?? null };
}

export function workings(sections, opts = {}) {
  return {
    sections: sections.filter(Boolean),
    source: opts.source ?? null,
    asAt: opts.asAt ?? null,
  };
}

/**
 * Expand a marginal scale into one line per bracket actually used, showing the
 * slice of income taxed at each rate.
 *
 * This is the single most useful thing a tax calculator can show: people
 * routinely believe crossing a bracket taxes ALL their income at the higher
 * rate, and seeing the slices is what corrects it.
 */
export function bracketBreakdown(taxable, brackets, fmtMoney, fmtRate) {
  const steps = [];
  for (let i = 0; i < brackets.length; i++) {
    const b = brackets[i];
    const next = brackets[i + 1];
    if (taxable <= b.from) break;

    const upper = next ? Math.min(taxable, next.from) : taxable;
    const slice = upper - b.from;
    if (slice <= 0) continue;

    const lowerLabel = fmtMoney(b.from === 0 ? 0 : b.from + 1);
    const upperLabel = next && taxable > next.from ? fmtMoney(next.from) : fmtMoney(taxable);

    steps.push(step(
      `${lowerLabel} to ${upperLabel} at ${fmtRate(b.rate)}`,
      slice * b.rate,
      { note: b.rate === 0 ? 'Tax-free threshold' : `${fmtMoney(slice)} taxed at ${fmtRate(b.rate)}`, muted: b.rate === 0 }
    ));
  }
  return steps;
}

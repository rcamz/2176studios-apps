import { useState } from 'react';
import { fmt } from './lib/format.js';
import { LINE, SUBTOTAL, TOTAL, NOTE } from './lib/workings.js';

// Collapsible "how this was calculated" panel. Follows the existing
// schedule-card pattern so it reads as part of the results, not a bolt-on.
export default function Workings({ data, title = 'How this was calculated', defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  if (!data || !data.sections?.length) return null;

  return (
    <div className="schedule-card">
      <div className="schedule-header" onClick={() => setOpen((v) => !v)}>
        <span className="schedule-title">{title}</span>
        <span className="schedule-toggle">{open ? '▲ Hide' : '▼ Show'}</span>
      </div>

      {open && (
        <div className="workings">
          {data.sections.map((sec, i) => (
            <div key={i} className="workings-section">
              <div className="workings-heading">{sec.heading}</div>
              <table className="workings-table">
                <tbody>
                  {sec.steps.map((s, j) => {
                    if (s.kind === NOTE) {
                      return (
                        <tr key={j}>
                          <td className="workings-note" colSpan={2}>{s.label}</td>
                        </tr>
                      );
                    }
                    const cls =
                      s.kind === TOTAL ? 'workings-row workings-row--total'
                      : s.kind === SUBTOTAL ? 'workings-row workings-row--subtotal'
                      : `workings-row${s.muted ? ' workings-row--muted' : ''}`;
                    return (
                      <tr key={j} className={cls}>
                        <td className="workings-label">
                          {s.label}
                          {s.note && <span className="workings-sub">{s.note}</span>}
                        </td>
                        <td className="workings-value">
                          {typeof s.value === 'number' ? fmt(s.value) : s.value}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {sec.note && <p className="workings-section-note">{sec.note}</p>}
            </div>
          ))}

          {(data.source || data.asAt) && (
            <p className="workings-source">
              {data.source}
              {data.source && data.asAt ? ' · ' : ''}
              {data.asAt && `Rates as at ${data.asAt}`}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

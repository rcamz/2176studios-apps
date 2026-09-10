# 2176 Studios — Logo & App Icon Brief

Hand this file to Claude Desktop to generate the logo and app icons.

---

## Brand overview

**Studio name:** 2176 Studios  
**What it is:** A suite of Australian financial calculator apps (web + native mobile)  
**Tone:** Clean, modern, trustworthy — not corporate. Feels like a small independent studio that knows what it's doing. Not flashy, not generic.

---

## 1. Studio wordmark / logo

Needed for the website header and app store developer name.

**Style:**
- Logotype only — no icon needed, just the wordmark
- "2176" prominent, "Studios" subordinate (smaller weight or size)
- Typeface feel: geometric sans, tight letter-spacing, confident — similar to Plus Jakarta Sans or Söhne
- Should work on both dark (`#0D0D10`) and light (`#F2F1EA`) backgrounds
- A single small accent mark is fine (e.g. a dot, a subtle underline on "2176", or a geometric shape) — nothing elaborate
- Deliver in SVG, dark version and light version

---

## 2. App icons — family of 10

Each calculator gets its own icon. They must look like a **family** — same structure, different colour + symbol per app.

### Shared structure (apply to all 10)
- **Shape:** rounded square badge. At 72px use ~18px corner radius. Scale proportionally for larger sizes (512px, 1024px).
- **Background:** light tint (see per-app colours below)
- **Border:** 1.5px in the mid-tone colour (see below)
- **Icon symbol:** centred line icon in the dark tone (see below), 1.5–2px stroke, round caps
- **Family mark:** small solid dark dot, bottom-right corner of every icon — this is the one consistent element across all 10. It's the "same studio" signal.
- **Deliver:** SVG at 512×512, and PNG at 1024×1024

### Per-app specs

| # | App name | Background | Border | Icon colour | Symbol |
|---|---|---|---|---|---|
| 1 | Mortgage Repayment + Offset | `#E6F1FB` | `#378ADD` | `#0C447C` | House with a dollar sign inside |
| 2 | Pay / Tax Calculator | `#EAF3DE` | `#639922` | `#27500A` | Banknotes or cash stack |
| 3 | Novated Lease Calculator | `#FAEEDA` | `#BA7517` | `#633806` | Car outline |
| 4 | Borrowing Power Calculator | `#FAECE7` | `#D85A30` | `#712B13` | Upward staircase / steps |
| 5 | First Home Super Saver (FHSSS) | `#E6F1FB` | `#378ADD` | `#0C447C` | Key (distinct from #1 — different symbol, same palette) |
| 6 | Retirement / Super Projection | `#EEEDFE` | `#7F77DD` | `#3C3489` | Plant/seedling growing |
| 7 | Rent vs. Buy Calculator | `#E1F5EE` | `#1D9E75` | `#085041` | House outline (simple roof, no dollar) |
| 8 | Capital Gains Tax Calculator | `#FBEAF0` | `#D4537E` | `#72243E` | Line chart going up |
| 9 | Redundancy / Termination Pay | `#FCEBEB` | `#E24B4A` | `#791F1F` | Briefcase with an X or off symbol |
| 10 | Salary Sacrifice Calculator | `#F1EFE8` | `#888780` | `#444441` | Piggy bank |

---

## Notes for Claude Desktop

- Keep icon symbols simple and geometric — these are app icons, not illustrations. Think Tabler or Lucide icon style, not emoji.
- The family mark dot should be small (about 6–8% of icon width), solid, in the dark icon colour, bottom-right corner, inside the badge border.
- All icons should feel cohesive at a glance — same padding, same stroke weight, same corner radius treatment.
- If generating SVG code, make it clean and minimal (no unnecessary groups, IDs, or Illustrator cruft).
- Dark versions of each icon (for dark-mode app use): swap background to the dark tone at 15% opacity, border to mid-tone at 60% opacity, icon symbol to mid-tone solid.

import { describe, it, expect } from 'vitest';
import { calcRentVsBuy, explainRentVsBuy } from './rentvbuy.js';
import { amortize, summarize } from './amortize.js';
import { stampDutyFor } from './stampduty.js';

const BASE = {
  purchasePrice: 800000, state: 'NSW', deposit: 160000,
  mortgageRate: 6.0, loanTerm: 30, propertyGrowth: 4,
  annualRent: 36000, rentIncrease: 3, investmentReturn: 7,
  ongoingCosts: 8000, sellingCosts: 2, comparisonYears: 10,
  grossIncome: 120000, contractDate: '2026-09-10',
};

describe('stamp duty comes from the shared module', () => {
  it('matches calcStampDuty for the same inputs', () => {
    const r = calcRentVsBuy(BASE);
    expect(r.stampDuty).toBeCloseTo(stampDutyFor('NSW', 800000, { propertyType: 'established' }), 2);
  });

  it('applies the first home buyer exemption', () => {
    expect(calcRentVsBuy({ ...BASE, firstHomeBuyer: true }).stampDuty).toBe(0);
  });

  it('varies by jurisdiction', () => {
    const nsw = calcRentVsBuy({ ...BASE, state: 'NSW' }).stampDuty;
    const vic = calcRentVsBuy({ ...BASE, state: 'VIC' }).stampDuty;
    const nt  = calcRentVsBuy({ ...BASE, state: 'NT'  }).stampDuty;
    expect(new Set([nsw, vic, nt]).size).toBe(3);
  });
});

describe('[regression] uses real amortisation, not yearly interest on the opening balance', () => {
  it('matches the shared engine over the comparison window', () => {
    const r = calcRentVsBuy({ ...BASE, comparisonYears: 10 });
    const rows = amortize({
      loanAmount: r.loanAmount, annualRatePercent: 6.0, termYears: 30,
      includeOffset: false, includeExtras: false,
    });
    const tenYears = rows.slice(0, 120).reduce((s, x) => s + x.interest, 0);
    expect(r.cumulativeInterest).toBeCloseTo(Math.round(tenYears), 0);
  });

  it('reports less interest than the old opening-balance method would', () => {
    // The previous model charged rate x opening balance for the whole year,
    // ignoring every principal repayment made within it.
    const r = calcRentVsBuy(BASE);
    const naive = r.loanAmount * 0.06 * 10;
    expect(r.cumulativeInterest).toBeLessThan(naive);
  });
});

describe('[regression] the renter is taxed on returns, not contributions', () => {
  it('adds the full surplus to the portfolio — contributions are after-tax money', () => {
    // The old model added `surplus * 0.7`, taxing the CONTRIBUTION. With a zero
    // return there is no gain and therefore no CGT, so one year should move the
    // portfolio by exactly the surplus.
    const r = calcRentVsBuy({
      ...BASE, comparisonYears: 1, investmentReturn: 0, annualRent: 20000,
    });
    const start = r.chartData[0]['Renter wealth'];
    const end = r.chartData[1]['Renter wealth'];
    const surplus = r.annualMortgage + BASE.ongoingCosts - 20000;
    expect(end - start).toBeCloseTo(Math.round(surplus), -1);
  });

  it('compounds the return on the whole balance', () => {
    const flat = calcRentVsBuy({ ...BASE, comparisonYears: 10, investmentReturn: 0 });
    const grown = calcRentVsBuy({ ...BASE, comparisonYears: 10, investmentReturn: 8 });
    expect(grown.renterPortfolioGross).toBeGreaterThan(flat.renterPortfolioGross * 1.5);
  });

  it('charges CGT on the renter portfolio at the horizon', () => {
    const r = calcRentVsBuy(BASE);
    expect(r.renterCgt).toBeGreaterThan(0);
    expect(r.renterWealth).toBeLessThan(r.renterPortfolioGross);
  });
});

describe('[regression] surplus is signed, so the renter draws down', () => {
  it('shrinks the portfolio when rent exceeds the cost of owning', () => {
    const r = calcRentVsBuy({
      ...BASE, annualRent: 200000, rentIncrease: 0,
      investmentReturn: 0, comparisonYears: 3,
    });
    const wealth = r.chartData.map((d) => d['Renter wealth']);
    // Previously floored at zero, so the portfolio could only ever grow.
    expect(wealth[3]).toBeLessThan(wealth[0]);
  });

  it('grows it when owning costs more than renting', () => {
    const r = calcRentVsBuy({ ...BASE, annualRent: 10000, investmentReturn: 0, comparisonYears: 3 });
    const wealth = r.chartData.map((d) => d['Renter wealth']);
    expect(wealth[3]).toBeGreaterThan(wealth[0]);
  });
});

describe('main residence CGT exemption', () => {
  it('leaves the buyer untaxed on growth while the renter is taxed', () => {
    const r = calcRentVsBuy({ ...BASE, propertyGrowth: 8, comparisonYears: 15 });
    // The buyer's equity carries no CGT deduction; the renter's does.
    expect(r.renterCgt).toBeGreaterThan(0);
    expect(r.buyerEquity).toBeGreaterThan(0);
  });

  it('favours buying more as property growth rises, all else equal', () => {
    const low  = calcRentVsBuy({ ...BASE, propertyGrowth: 2 }).wealthGap;
    const high = calcRentVsBuy({ ...BASE, propertyGrowth: 8 }).wealthGap;
    expect(high).toBeGreaterThan(low);
  });
});

describe('upfront costs and LMI', () => {
  it('charges LMI above 80% LVR and capitalises it into the loan', () => {
    const r = calcRentVsBuy({ ...BASE, deposit: 40000 }); // 95% LVR
    expect(r.lmiPayable).toBe(true);
    expect(r.lmiPremium).toBeGreaterThan(0);
    expect(r.loanAmount).toBeGreaterThan(800000 - 40000);
  });

  it('charges none at or below 80%', () => {
    expect(calcRentVsBuy({ ...BASE, deposit: 160000 }).lmiPayable).toBe(false);
  });

  it('waives it under the First Home Guarantee', () => {
    const r = calcRentVsBuy({ ...BASE, deposit: 40000, firstHomeGuarantee: true });
    expect(r.lmiPayable).toBe(false);
  });

  it('counts stamp duty as cash unless explicitly capitalised', () => {
    const cash = calcRentVsBuy({ ...BASE, capitaliseStampDuty: false });
    const cap  = calcRentVsBuy({ ...BASE, capitaliseStampDuty: true });
    expect(cash.buyerUpfrontCash).toBeGreaterThan(cap.buyerUpfrontCash);
    expect(cap.loanAmount).toBeGreaterThan(cash.loanAmount);
  });

  it('gives the renter the same starting capital the buyer spends upfront', () => {
    const r = calcRentVsBuy(BASE);
    expect(r.chartData[0]['Renter wealth']).toBe(Math.round(r.buyerUpfrontCash));
  });
});

describe('negative gearing quarantine', () => {
  it('warns for a contract after the 12 May 2026 cutoff', () => {
    const r = calcRentVsBuy({ ...BASE, contractDate: '2026-09-10' });
    expect(r.warnings.some((w) => /negatively geared|rental losses|rent this property out/i.test(w.title + w.body))).toBe(true);
  });

  it('stays silent for a contract before it', () => {
    const r = calcRentVsBuy({ ...BASE, contractDate: '2026-05-01' });
    expect(r.warnings.length).toBe(0);
  });
});

describe('break-even', () => {
  it('reports a year when buying overtakes renting', () => {
    const r = calcRentVsBuy({ ...BASE, propertyGrowth: 7, comparisonYears: 30 });
    expect(r.breakEvenYear).toBeGreaterThan(0);
  });

  it('reports null when it never does within the horizon', () => {
    const r = calcRentVsBuy({
      ...BASE, propertyGrowth: 0, investmentReturn: 12, comparisonYears: 5,
    });
    expect(r.breakEvenYear).toBeNull();
  });
});

describe('explainRentVsBuy', () => {
  const allSteps = (w) => w.sections.flatMap((s) => s.steps);
  const sec = (w, re) => w.sections.find((s) => re.test(s.heading));
  const find = (w, re) => allSteps(w).find((s) => re.test(s.label));
  const noteText = (w) =>
    [...allSteps(w).filter((s) => s.kind === 'note').map((s) => s.label),
     ...allSteps(w).map((s) => s.note ?? ''),
     ...w.sections.map((s) => s.note ?? '')].join(' ');
  // Sum the plain lines above a section's first total.
  const reconciles = (section) => {
    const t = section.steps.find((s) => s.kind === 'total');
    const sum = section.steps
      .slice(0, section.steps.indexOf(t))
      .filter((s) => s.kind === 'line' && typeof s.value === 'number' && !s.muted)
      .reduce((a, s) => a + s.value, 0);
    return { sum, total: t.value };
  };

  const w = explainRentVsBuy(calcRentVsBuy(BASE), BASE);

  it('produces the expected sections', () => {
    const headings = w.sections.map((s) => s.heading);
    expect(headings).toContain('Cash the buyer needs upfront');
    expect(headings).toContain('The loan');
    expect(headings).toContain('Buyer equity after 10 years');
    expect(headings).toContain('Renter wealth after 10 years');
    expect(headings).toContain('The difference');
  });

  it('the upfront components reconcile to the cash needed', () => {
    const { sum, total } = reconciles(sec(w, /Cash the buyer needs upfront/));
    expect(sum).toBeCloseTo(total, 6);
    expect(total).toBeCloseTo(calcRentVsBuy(BASE).buyerUpfrontCash, 6);
  });

  it('the loan components reconcile to the loan amount', () => {
    const r = calcRentVsBuy({ ...BASE, deposit: 40000 });
    const lw = explainRentVsBuy(r, { ...BASE, deposit: 40000 });
    const s = sec(lw, /^The loan$/);
    const t = s.steps.filter((x) => x.kind === 'total').at(-1);
    const sum = s.steps
      .slice(0, s.steps.indexOf(t))
      .filter((x) => x.kind === 'line' && typeof x.value === 'number' && !x.muted)
      .reduce((a, x) => a + x.value, 0);
    expect(sum).toBeCloseTo(t.value, 6);
    expect(t.value).toBeCloseTo(r.loanAmount, 6);
    expect(s.steps.some((x) => /LMI/.test(x.label))).toBe(true);
  });

  it('drops the LMI line at a 20% deposit', () => {
    const s = sec(w, /^The loan$/);
    expect(s.steps.some((x) => /LMI/.test(x.label))).toBe(false);
    expect(s.note).toMatch(/No LMI/i);
  });

  it('capitalised stamp duty moves out of cash and into the loan', () => {
    const inp = { ...BASE, capitaliseStampDuty: true };
    const r = calcRentVsBuy(inp);
    const cw = explainRentVsBuy(r, inp);
    const upfrontSec = sec(cw, /Cash the buyer needs upfront/);
    expect(upfrontSec.steps.some((x) => /Stamp duty/.test(x.label) && x.kind === 'line')).toBe(false);
    expect(reconciles(upfrontSec).sum).toBeCloseTo(r.buyerUpfrontCash, 6);
    expect(sec(cw, /^The loan$/).steps.some((x) => /stamp duty, capitalised/.test(x.label))).toBe(true);
  });

  it('reaches buyer equity from property value, balance and selling costs', () => {
    const r = calcRentVsBuy(BASE);
    const { sum, total } = reconciles(sec(w, /Buyer equity after/));
    // The total is the published (rounded) equity while the components are
    // exact, so the two can sit a dollar apart. Both display identically.
    expect(Math.abs(sum - total)).toBeLessThanOrEqual(1);
    expect(total).toBe(r.buyerEquity);
    expect(find(w, /less mortgage balance/).value).toBeCloseTo(-r.mortgageBalance, 6);
  });

  it('reaches renter wealth from capital, contributions, growth and CGT', () => {
    const r = calcRentVsBuy(BASE);
    const s = sec(w, /Renter wealth after/);
    const val = (re) => s.steps.find((x) => re.test(x.label)).value;

    expect(val(/^Starting capital$/)).toBeCloseTo(r.buyerUpfrontCash, 6);
    // Capital + contributions = cost base.
    expect(val(/^Starting capital$/) + val(/Contributions|Drawdowns/))
      .toBeCloseTo(r.renterCostBase, 6);
    // Cost base + growth = the portfolio before tax.
    expect(r.renterCostBase + val(/Investment growth/)).toBeCloseTo(r.renterPortfolioGross, 6);
    // Portfolio less CGT = renter wealth, to within the rounding the result
    // object already applies to each of those three figures.
    expect(Math.abs(r.renterPortfolioGross + val(/capital gains tax on the gain/)
      - s.steps.find((x) => x.kind === 'total').value)).toBeLessThanOrEqual(1);
    expect(s.steps.find((x) => x.kind === 'total').value).toBe(r.renterWealth);
  });

  it('the contributions match owner outgoings less rent', () => {
    const r = calcRentVsBuy(BASE);
    const { sum, total } = reconciles(sec(w, /Cash out over/));
    expect(sum).toBeCloseTo(total, 6);
    expect(total).toBeCloseTo(r.renterCostBase - r.buyerUpfrontCash, 0);
  });

  it('shows drawdowns rather than contributions when rent costs more', () => {
    const inp = { ...BASE, annualRent: 200000, rentIncrease: 0, comparisonYears: 3 };
    const dw = explainRentVsBuy(calcRentVsBuy(inp), inp);
    expect(find(dw, /Drawdowns to cover rent/).value).toBeLessThan(0);
  });

  it('makes the main residence exemption explicit and quantified', () => {
    const r = calcRentVsBuy(BASE);
    const s = sec(w, /Capital gains tax/);
    expect(s.steps.find((x) => /Tax the buyer pays/.test(x.label)).value).toBe(0);
    expect(s.steps.find((x) => /Tax the renter pays/.test(x.label)).value).toBe(r.renterCgt);
    expect(s.steps.find((x) => /Growth on the home/.test(x.label)).value)
      .toBe(r.projectedPropertyValue - BASE.purchasePrice);
    expect(noteText(w)).toMatch(/main residence exemption/i);
  });

  it('the difference reconciles to the reported wealth gap', () => {
    const r = calcRentVsBuy(BASE);
    const { sum, total } = reconciles(sec(w, /^The difference$/));
    expect(sum).toBeCloseTo(total, 6);
    expect(total).toBe(r.wealthGap);
  });

  it('every numeric step is finite, across very different scenarios', () => {
    const variants = [
      BASE,
      { ...BASE, deposit: 40000, firstHomeBuyer: true },
      { ...BASE, deposit: 40000, capitaliseStampDuty: true },
      { ...BASE, annualRent: 200000, rentIncrease: 0, comparisonYears: 3 },
      { ...BASE, propertyGrowth: 0, investmentReturn: 12, comparisonYears: 30 },
      { ...BASE, deposit: 800000 },
    ];
    for (const inp of variants) {
      const ew = explainRentVsBuy(calcRentVsBuy(inp), inp);
      for (const s of allSteps(ew)) {
        if (typeof s.value === 'number') {
          expect(Number.isFinite(s.value), `${s.label} in ${JSON.stringify(inp.deposit)}`).toBe(true);
        }
      }
      for (const section of ew.sections) {
        const t = section.steps.find((x) => x.kind === 'total');
        if (t) expect(Number.isFinite(t.value) || typeof t.value === 'string').toBe(true);
      }
    }
  });
});

describe('no dead output', () => {
  it('returns only defined values', () => {
    const r = calcRentVsBuy(BASE);
    for (const [k, v] of Object.entries(r)) {
      expect(v, `${k} should not be undefined`).toBeDefined();
      if (typeof v === 'number') expect(Number.isFinite(v), `${k} should be finite`).toBe(true);
    }
  });
});

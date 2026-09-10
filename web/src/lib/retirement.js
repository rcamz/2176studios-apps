// Retirement / superannuation projection.
//
// Rewritten against FY2026-27-rates-audit-v2.md (§1.4, §1.11, §3.5, §4.2) and
// calc-suite-audit.md §B7. Five things the previous version got structurally
// wrong, in rough order of how much money they moved:
//
//  1. SALARY NEVER GREW. SG is a percentage of salary, so a flat salary held
//     for up to 45 years understates every contribution after the first.
//  2. THE HEADLINE WAS NOMINAL. $1.2m at 65 is ~$573k in today's money at 2.5%
//     over 30 years. Both are returned; the caller is expected to lead with real.
//  3. THE AGE PENSION WAS THE SUPER BALANCE MEASURED AGAINST SINGLE-HOMEOWNER
//     ASSETS THRESHOLDS. Both means tests are now calculated and the LOWER is
//     paid, with deeming, partner status and homeownership all in play.
//  4. DRAWDOWN WAS `balance × 4%` FOREVER. It is now a year-by-year decumulation
//     at the legislated minimum factors, which RISE with age, with depletion.
//  5. NO CAP CHECK, NO DIVISION 293.
//
// Two deliberate non-features:
//
//  - DIVISION 296 IS FLAGGED, NOT COMPUTED (audit §4.2 / §7.4). It is levied on
//    REALISED earnings, a fund-level figure that can differ from total return by
//    an order of magnitude. Computing it here would mean inventing the input
//    that determines the answer.
//  - THE WORK BONUS IS NOT MODELLED. The audit records the $300/ft figure as
//    UNVERIFIED with a conflicting source at $460.
//
// Payday Super (1 July 2026): SG is now paid each payday on qualifying earnings
// rather than quarterly on OTE. Annual salary × SG% is still right in aggregate
// for a projection at this resolution — it is the timing and the base that
// changed, not the rate — so that is what is used, and said out loud.

import { ratesFor, toISO } from './rates/index.js';
import { calcPayTax, division293On } from './paytax.js';
import { sgContributionFor, carryForwardAvailable } from './salarysacrifice.js';

const round2 = (n) => Math.round(n * 100) / 100;
const FORTNIGHTS = 26;

// ─── ASFA Retirement Standard ────────────────────────────────────────────────
//
// NOT part of the FY2026-27 rates audit — these are ASFA's own published
// figures, carried here as indicative reference lines only. Both the annual
// budgets and the lump sums are in TODAY'S dollars, so they belong against the
// real projection, not the nominal one. The lump sums assume you own your home
// outright and draw a part Age Pension.
export const ASFA_RETIREMENT_STANDARD = {
  source: 'ASFA Retirement Standard',
  confidence: 'UNVERIFIED',
  basis: 'today\'s dollars, age 65-84, own your home outright, part Age Pension assumed',
  note: 'ASFA Retirement Standard figures are indicative and are not part of the FY2026-27 rates audit. ' +
        'The lump sums assume you own your home outright and receive a part Age Pension.',
  comfortable: {
    single: { annual: 52383, lumpSum: 595000 },
    couple: { annual: 73875, lumpSum: 690000 },
  },
  modest: {
    single: { annual: 33386, lumpSum: 100000 },
    couple: { annual: 48184, lumpSum: 100000 },
  },
};

// ─── Age Pension ─────────────────────────────────────────────────────────────

export function normaliseStatus(status) {
  const s = String(status ?? 'single').toLowerCase();
  return s.includes('couple') || s.includes('partner') || s.includes('married')
    ? 'couple'
    : 'single';
}

// Deeming. Financial assets are assumed to earn a rate regardless of what they
// actually earn: the lower rate up to the threshold, the upper rate above it.
//
// TRAP: the RATES moved on 20 September 2026 (1.25/3.25 → 1.75/3.75). The
// THRESHOLDS did not — they are 1 July figures. Resolving both against the same
// indexation date is the mistake this is written to avoid; the registry keeps
// them in separate fields for exactly that reason.
export function deemedIncome({ financialAssets = 0, status = 'single', date = new Date(), rates } = {}) {
  const r = rates ?? ratesFor(date);
  const ap = r.agePension;
  const couple = normaliseStatus(status) === 'couple';
  const threshold = couple ? ap.deemingThresholdCouple : ap.deemingThresholdSingle;
  const assets = Math.max(0, financialAssets);

  const lower = Math.min(assets, threshold);
  const upper = Math.max(0, assets - threshold);
  const perYear = lower * ap.deemingLowerRate + upper * ap.deemingUpperRate;

  return {
    perYear: round2(perYear),
    perFortnight: round2(perYear / FORTNIGHTS),
    threshold,
    lowerRate: ap.deemingLowerRate,
    upperRate: ap.deemingUpperRate,
    financialAssets: assets,
    status: couple ? 'couple' : 'single',
  };
}

function maxRateFortnightly(status, ap) {
  if (status === 'couple') {
    if (ap.maxRateCoupleCombined != null) return ap.maxRateCoupleCombined;
    if (ap.maxRateCoupleEach != null) return ap.maxRateCoupleEach * 2;
    return null;
  }
  return ap.maxRateSingle ?? null;
}

function assetsThresholds(status, homeowner, ap) {
  const key = `${status === 'couple' ? 'Couple' : 'Single'}${homeowner ? 'Homeowner' : 'NonHomeowner'}`;
  return {
    free: ap[`assetsThresholdFull${key}`],
    cutOff: ap[`assetsCutOff${key}`] ?? null,
  };
}

// Both means tests, with the LOWER result paid (audit §1.11, method
// `lowerOfIncomeAndAssetsTest`).
//
// `incomePerFortnight`, when supplied, is the TOTAL assessable income per
// fortnight and overrides deeming — that is the form the published anchors in
// §8.12 take. Otherwise assessable income is deemed income on financial assets
// plus any other income supplied.
//
// Couples are assessed on COMBINED income and COMBINED assets and the figure
// returned is the COMBINED fortnightly rate; `perPersonFortnight` splits it.
// The income taper is 50c per dollar on the combined excess, which is the same
// thing as the published "25c each".
export function agePensionEntitlement({
  status = 'single',
  homeowner = true,
  assets = 0,
  financialAssets = 0,
  otherIncomeAnnual = 0,
  incomePerFortnight = null,
  age = null,
  date = new Date(),
  rates,
} = {}) {
  const r = rates ?? ratesFor(date);
  const ap = r.agePension;
  const s = normaliseStatus(status);
  const couple = s === 'couple';

  const maxRate = maxRateFortnightly(s, ap);
  const deemed = deemedIncome({ financialAssets, status: s, rates: r });

  const assessableIncome = incomePerFortnight != null
    ? Math.max(0, incomePerFortnight)
    : round2(deemed.perFortnight + Math.max(0, otherIncomeAnnual) / FORTNIGHTS);

  const freeArea = couple ? ap.incomeFreeAreaCouple : ap.incomeFreeAreaSingle;
  const assetsBands = assetsThresholds(s, homeowner, ap);

  const eligibleByAge = age == null ? true : age >= ap.pensionAge;

  // The pre-20-September window in the registry has a verified single rate but
  // no couple rate and no cut-offs. Rather than invent them, say so.
  if (maxRate == null) {
    return {
      status: s, homeowner, eligibleByAge, pensionAge: ap.pensionAge,
      estimateUnavailable: true,
      reason: `No published maximum rate for a ${s} at ${r.__date}. ` +
              'The registry covers this window for singles only.',
      fortnightly: null, annual: null, bindingTest: null,
      maxRateFortnightly: null, deemed,
      incomeTest: null, assetsTest: null,
      confidence: ap.confidence, source: ap.source,
    };
  }

  // Income test.
  const incomeExcess = Math.max(0, assessableIncome - freeArea);
  const incomeReduction = incomeExcess * ap.incomeTaperPerDollar;
  const incomeCutOut = (couple ? ap.incomeCutOutCouple : ap.incomeCutOutSingle)
    ?? round2(freeArea + maxRate / ap.incomeTaperPerDollar);
  const incomeTestRate = Math.max(0, maxRate - incomeReduction);

  // Assets test. $3.00 per fortnight per $1,000 over the free area, applied to
  // combined assets for a couple (not per person). The family home is exempt
  // and is expected to have been excluded by the caller.
  const assetsExcess = Math.max(0, Math.max(0, assets) - assetsBands.free);
  const assetsReduction = (assetsExcess / 1000) * ap.assetsTaperPerThousandPerFortnight;
  const assetsCutOff = assetsBands.cutOff
    ?? round2(assetsBands.free + (maxRate / ap.assetsTaperPerThousandPerFortnight) * 1000);
  let assetsTestRate = Math.max(0, maxRate - assetsReduction);
  // Published cut-offs are rounded to the nearest $250 and sit a little above
  // the point the taper reaches zero. Past the published cut-off, nil.
  if (assets >= assetsCutOff) assetsTestRate = 0;

  const lower = Math.min(incomeTestRate, assetsTestRate);
  const fortnightly = eligibleByAge ? round2(lower) : 0;

  return {
    status: s,
    homeowner,
    eligibleByAge,
    pensionAge: ap.pensionAge,
    estimateUnavailable: false,
    maxRateFortnightly: maxRate,
    fortnightly,
    perPersonFortnight: round2(fortnightly / (couple ? 2 : 1)),
    annual: round2(fortnightly * FORTNIGHTS),
    bindingTest: !eligibleByAge
      ? 'ineligible'
      : incomeTestRate === assetsTestRate ? 'equal'
      : incomeTestRate < assetsTestRate ? 'income' : 'assets',
    full: eligibleByAge && round2(lower) === round2(maxRate),
    nil: eligibleByAge && round2(lower) === 0,
    deemed,
    incomeTest: {
      assessableIncome,
      deemedFortnight: deemed.perFortnight,
      freeArea,
      excess: round2(incomeExcess),
      taperPerDollar: ap.incomeTaperPerDollar,
      reduction: round2(incomeReduction),
      cutOut: incomeCutOut,
      cutOutDerived: (couple ? ap.incomeCutOutCouple : ap.incomeCutOutSingle) == null,
      result: round2(incomeTestRate),
    },
    assetsTest: {
      assets: Math.max(0, assets),
      freeArea: assetsBands.free,
      excess: round2(assetsExcess),
      taperPerThousand: ap.assetsTaperPerThousandPerFortnight,
      reduction: round2(assetsReduction),
      cutOff: assetsCutOff,
      cutOffDerived: assetsBands.cutOff == null,
      result: round2(assetsTestRate),
    },
    effectiveFrom: ap.effective_from,
    confidence: ap.confidence,
    source: ap.source,
    workBonusModelled: false,
  };
}

// ─── Minimum drawdown ────────────────────────────────────────────────────────

// Legislated minimum for an account-based pension (audit §3.5). Indicative —
// the SIS Regulations govern pro-rating in the commencement year and rounding,
// and neither is modelled. No temporary reduction is in force.
export function minimumDrawdownFactor(age, rates) {
  const table = rates.superannuation.minimumDrawdown;
  let factor = table[0].factor;
  for (const band of table) if (age >= band.fromAge) factor = band.factor;
  return factor;
}

// ─── Main entry ──────────────────────────────────────────────────────────────

export function calcRetirement(inputs = {}) {
  const {
    currentAge = 35,
    retirementAge = 65,
    currentBalance = 80000,
    grossSalary = 90000,
    salaryGrowth = 3,
    sgRate = 12,
    extraContributions = 0,
    extraIsPreTax = true,
    indexExtraContributions = true,
    investmentReturn = 7,
    inflationRate = 2.5,
    // Fees as flat dollars PLUS a percentage — most funds charge both, and a
    // percentage-only model understates the drag on small balances badly.
    feeFlat = 100,
    insurancePremium = 0,
    // Decumulation
    drawdownMode = 'minimum',   // 'minimum' | 'target'
    targetIncome = 60000,       // today's dollars, total including Age Pension
    planToAge = 95,
    // Age Pension
    includeAgePension = true,
    relationshipStatus = 'single',
    homeowner = true,
    partnerSuperBalance = 0,
    otherFinancialAssets = 0,
    otherNonFinancialAssets = 0,
    otherIncomeAnnual = 0,
    // Caps
    priorUnusedCap = 0,
    useCarryForward = false,
    division293FromSuper = false,
    date = new Date(),
    residency = 'resident',
  } = inputs;

  // `fees` was the old percentage-only field name; keep it working.
  const feePercent = inputs.feePercent ?? inputs.fees ?? 0.5;

  const rates = inputs.rates ?? ratesFor(date);
  const s = rates.superannuation;
  const contributionsTax = s.contributionsTax;
  const preservationAge = s.preservationAge;
  const pensionAge = rates.agePension.pensionAge;
  const status = normaliseStatus(relationshipStatus);

  const yearsToRetire = Math.max(0, Math.round(retirementAge - currentAge));
  // Super cannot be drawn before preservation age, so someone retiring at 57
  // has three years of no salary and no access. Modelling a drawdown from 57
  // would be modelling a retirement they cannot legally fund.
  const accessAge = Math.max(retirementAge, preservationAge, currentAge);
  const beforePreservation = retirementAge < preservationAge;
  const horizonEnd = Math.max(accessAge, Math.round(planToAge));

  // The Age Pension is drawn years from now, so it is assessed against the
  // rates in force WHEN IT STARTS, not today. This matters at the moment: a
  // date before 20 September 2026 resolves to a window the registry only
  // covers for singles, and nobody retiring in the future is paid those rates
  // anyway. An explicit `rates` from the caller always wins.
  const pensionStartsIn = Math.max(0, Math.max(pensionAge, accessAge) - currentAge);
  const baseISO = toISO(date);
  const pensionISO = `${+baseISO.slice(0, 4) + pensionStartsIn}${baseISO.slice(4)}`;
  const pensionRates = inputs.rates ? rates : ratesFor(pensionISO);

  const growth = salaryGrowth / 100;
  const inflation = inflationRate / 100;
  const netReturn = (investmentReturn - feePercent) / 100;
  const monthlyReturn = netReturn / 12;
  const flatDragMonthly = (Math.max(0, feeFlat) + Math.max(0, insurancePremium)) / 12;

  // ── Year one: caps, Division 293 ──
  const sgYearOne = sgContributionFor(grossSalary, sgRate, rates);
  const extraPreTaxYearOne = extraIsPreTax ? Math.max(0, extraContributions) : 0;
  const extraPostTaxYearOne = extraIsPreTax ? 0 : Math.max(0, extraContributions);
  const concessionalYearOne = sgYearOne + extraPreTaxYearOne;

  const carryForward = carryForwardAvailable({
    priorUnusedCap,
    totalSuperBalance: currentBalance,
    rates,
  });
  const effectiveCap = s.concessionalCap + (useCarryForward ? carryForward.available : 0);
  const capExceeded = concessionalYearOne > effectiveCap;
  const capExcess = Math.max(0, concessionalYearOne - effectiveCap);
  const capHeadroom = Math.max(0, effectiveCap - sgYearOne);

  const nonConcessionalCap = s.nonConcessionalCap;
  const nonConcessionalExceeded = extraPostTaxYearOne > nonConcessionalCap;
  const nonConcessionalExcess = Math.max(0, extraPostTaxYearOne - nonConcessionalCap);

  // ── Transfer balance cap ──
  // Only what is transferred into retirement phase earns tax-free; the balance
  // above the cap stays in accumulation and keeps paying 15% on earnings. The
  // share is fixed at the point the pension commences.
  const transferBalanceCap = s.transferBalanceCap;
  const fundEarningsTax = s.fundEarningsTaxRate ?? contributionsTax;

  // ── The projection ─────────────────────────────────────────────────────────
  const path = [];
  let bal = Math.max(0, currentBalance);
  let balNoExtra = Math.max(0, currentBalance);
  let peakBalance = bal;
  let totalContributions = 0;
  let totalContributionsTax = 0;
  let totalDivision293 = 0;
  let division293YearOne = 0;
  let capBreachAge = null;
  let depletionAge = null;
  let retirementPhaseShare = 1;
  let balanceAtAccess = null;
  let totalPensionReceived = 0;
  let totalWithdrawn = 0;

  // The concessional cap is AWOTE-indexed in $2,500 increments. Holding it
  // static while salary grows for 30 years would fire a cap warning at every
  // realistic salary — so the projection indexes it, and says that it has.
  const indexedCap = (yr) => {
    const raw = s.concessionalCap * Math.pow(1 + growth, yr);
    return Math.floor(raw / 2500) * 2500;
  };

  for (let age = currentAge; age <= horizonEnd; age++) {
    const yr = age - currentAge;
    const deflator = Math.pow(1 + inflation, yr);
    const phase = age < retirementAge ? 'accumulation'
      : age < accessAge ? 'preserved'
      : 'drawdown';

    let contribution = 0;
    let salaryThisYear = 0;
    let withdrawal = 0;
    let pensionAnnual = 0;
    let pensionDetail = null;
    let minimumFactor = null;
    let division293 = 0;

    if (phase === 'accumulation') {
      salaryThisYear = grossSalary * Math.pow(1 + growth, yr);
      const indexFactor = indexExtraContributions ? Math.pow(1 + growth, yr) : 1;
      const extraPreTax = extraIsPreTax ? Math.max(0, extraContributions) * indexFactor : 0;
      const extraPostTax = extraIsPreTax ? 0 : Math.max(0, extraContributions) * indexFactor;

      const sg = sgContributionFor(salaryThisYear, sgRate, rates);
      const concessional = sg + extraPreTax;
      if (capBreachAge === null && concessional > indexedCap(yr)) capBreachAge = age;

      const pay = calcPayTax({
        grossIncome: salaryThisYear,
        salarySacrifice: extraPreTax,
        sgRate,
        residency,
        rates,
      });
      division293 = division293On(pay.taxableIncome, concessional, rates);
      if (yr === 0) division293YearOne = division293;
      totalDivision293 += division293;

      const tax = concessional * contributionsTax;
      totalContributionsTax += tax;
      contribution = concessional - tax + extraPostTax;
      totalContributions += contribution;
    }

    if (phase === 'drawdown') {
      if (balanceAtAccess === null) {
        balanceAtAccess = bal;
        retirementPhaseShare = bal > 0 ? Math.min(1, transferBalanceCap / bal) : 1;
      }
      minimumFactor = minimumDrawdownFactor(age, rates);

      if (includeAgePension && age >= pensionAge) {
        // The means tests are applied in TODAY'S DOLLARS. Free areas,
        // thresholds and cut-offs are all indexed in reality, so testing a
        // nominal 2056 balance against 2026 thresholds would show almost
        // everybody as ineligible — the single biggest way to get a long-run
        // Age Pension projection wrong. Assets and income are deflated to
        // today, tested, and the resulting entitlement is inflated back.
        // `bal` is nominal and is deflated; the other asset inputs are entered
        // in today's dollars and are held constant in real terms.
        const financialReal = bal / deflator +
          Math.max(0, partnerSuperBalance) + Math.max(0, otherFinancialAssets);
        pensionDetail = agePensionEntitlement({
          status,
          homeowner,
          assets: financialReal + Math.max(0, otherNonFinancialAssets),
          financialAssets: financialReal,
          otherIncomeAnnual,
          age,
          rates: pensionRates,
        });
        pensionAnnual = (pensionDetail.annual ?? 0) * deflator;
        totalPensionReceived += pensionAnnual;
      }

      const minimumWithdrawal = bal * minimumFactor;
      if (drawdownMode === 'target') {
        const targetNominal = Math.max(0, targetIncome) * deflator;
        const shortfall = Math.max(0, targetNominal - pensionAnnual);
        withdrawal = Math.min(bal, Math.max(minimumWithdrawal, shortfall));
      } else {
        withdrawal = minimumWithdrawal;
      }
      withdrawal = Math.min(bal, withdrawal);
      totalWithdrawn += withdrawal;
    }

    path.push({
      age,
      phase,
      balance: Math.round(bal),
      balanceNoExtra: Math.round(balNoExtra),
      realBalance: Math.round(bal / deflator),
      realBalanceNoExtra: Math.round(balNoExtra / deflator),
      salary: Math.round(salaryThisYear),
      contribution: Math.round(contribution),
      withdrawal: Math.round(withdrawal),
      agePension: Math.round(pensionAnnual),
      totalIncome: Math.round(withdrawal + pensionAnnual),
      realTotalIncome: Math.round((withdrawal + pensionAnnual) / deflator),
      minimumFactor,
      pensionDetail,
    });

    peakBalance = Math.max(peakBalance, bal);
    if (phase === 'drawdown' && bal <= 0 && depletionAge === null) depletionAge = age;

    // ── Advance one year ──
    if (phase === 'drawdown') {
      bal = Math.max(0, bal - withdrawal);
      if (division293FromSuper) bal = Math.max(0, bal - division293);
      // Retirement-phase earnings are tax-free; anything above the transfer
      // balance cap stays in accumulation and keeps paying 15%.
      const earningsTax = fundEarningsTax * (1 - retirementPhaseShare);
      const r = netReturn * (1 - earningsTax);
      bal = Math.max(0, bal * (1 + r) - (flatDragMonthly * 12));
      // The comparison line draws its own minimum, so the two paths stay
      // comparable without re-running the pension for a balance nobody has.
      const wNo = balNoExtra * minimumDrawdownFactor(age, rates);
      balNoExtra = Math.max(0, balNoExtra - wNo);
      balNoExtra = Math.max(0, balNoExtra * (1 + r) - (flatDragMonthly * 12));
    } else {
      const contribMonthly = contribution / 12;
      const sgOnly = phase === 'accumulation'
        ? sgContributionFor(salaryThisYear, sgRate, rates) * (1 - contributionsTax) / 12
        : 0;
      for (let m = 0; m < 12; m++) {
        bal = Math.max(0, bal * (1 + monthlyReturn) + contribMonthly - flatDragMonthly);
        balNoExtra = Math.max(0, balNoExtra * (1 + monthlyReturn) + sgOnly - flatDragMonthly);
      }
      if (division293FromSuper) bal = Math.max(0, bal - division293);
    }
  }

  const atRetirement = path.find((p) => p.age === accessAge) ?? path[0];
  const projectedBalance = atRetirement.balance;
  const projectedBalanceNoExtra = atRetirement.balanceNoExtra;
  const realBalance = atRetirement.realBalance;
  const realBalanceNoExtra = atRetirement.realBalanceNoExtra;
  const yearsToAccess = accessAge - currentAge;
  const inflationFactor = Math.pow(1 + inflation, yearsToAccess);

  const drawdownYears = path.filter((p) => p.phase === 'drawdown');
  const firstDrawdown = drawdownYears[0] ?? null;
  const lastFunded = [...drawdownYears].reverse().find((p) => p.balance > 0) ?? null;
  const moneyLastsToAge = depletionAge != null ? depletionAge : (lastFunded ? horizonEnd : accessAge);
  const runsOut = depletionAge != null && depletionAge <= horizonEnd;

  // First-year retirement income, which is the number people actually live on.
  const firstYearDrawdown = firstDrawdown?.withdrawal ?? 0;
  const firstYearPension = firstDrawdown?.agePension ?? 0;
  const firstYearIncome = firstYearDrawdown + firstYearPension;
  const firstYearIncomeReal = firstDrawdown?.realTotalIncome ?? 0;

  // Age Pension assessed at the moment drawdown starts, for the headline card.
  // In today's dollars, for the same reason the yearly assessment is.
  const pensionAssetsReal = realBalance +
    Math.max(0, partnerSuperBalance) + Math.max(0, otherFinancialAssets);
  const pensionAtRetirement = includeAgePension
    ? agePensionEntitlement({
        status,
        homeowner,
        assets: pensionAssetsReal + Math.max(0, otherNonFinancialAssets),
        financialAssets: pensionAssetsReal,
        otherIncomeAnnual,
        age: Math.max(accessAge, pensionAge),
        rates: pensionRates,
      })
    : null;

  // ── Division 296 — FLAG ONLY (audit §4.2) ──
  const d296 = s.division296;
  // The $3m threshold is indexed in $150,000 increments, so measuring a nominal
  // balance 30 years out against a static $3m over-flags. Both views are given.
  const thresholdIndexed = Math.floor(
    (d296.threshold1 * Math.pow(1 + inflation, yearsToAccess)) / d296.threshold1Indexation
  ) * d296.threshold1Indexation;
  const crossing = path.find((p) => p.balance >= d296.threshold1) ?? null;
  const division296Flag = {
    triggered: d296.compute === false && peakBalance >= d296.threshold1,
    triggeredIndexed: d296.compute === false && peakBalance >= thresholdIndexed,
    threshold: d296.threshold1,
    thresholdIndexed,
    indexationIncrement: d296.threshold1Indexation,
    ageAtCrossing: crossing?.age ?? null,
    peakBalance: Math.round(peakBalance),
    compute: d296.compute,
    note: d296.note,
  };

  // ── ASFA reference ──
  const asfaKey = status === 'couple' ? 'couple' : 'single';
  const comfortable = ASFA_RETIREMENT_STANDARD.comfortable[asfaKey];
  const modest = ASFA_RETIREMENT_STANDARD.modest[asfaKey];
  const asfa = {
    ...ASFA_RETIREMENT_STANDARD,
    status: asfaKey,
    comfortableLumpSum: comfortable.lumpSum,
    modestLumpSum: modest.lumpSum,
    comfortableAnnual: comfortable.annual,
    modestAnnual: modest.annual,
    // Nominal equivalents, for plotting on the nominal chart.
    comfortableLumpSumNominal: Math.round(comfortable.lumpSum * inflationFactor),
    modestLumpSumNominal: Math.round(modest.lumpSum * inflationFactor),
    meetsComfortable: realBalance >= comfortable.lumpSum,
    meetsModest: realBalance >= modest.lumpSum,
    incomeMeetsComfortable: firstYearIncomeReal >= comfortable.annual,
    incomeMeetsModest: firstYearIncomeReal >= modest.annual,
  };

  // ── Chart series ──
  const chartDataNominal = path.map((p) => ({
    age: p.age,
    'Balance': p.balance,
    'Without extra': p.balanceNoExtra,
  }));
  const chartDataReal = path.map((p) => ({
    age: p.age,
    'Balance': p.realBalance,
    'Without extra': p.realBalanceNoExtra,
  }));
  const incomeData = drawdownYears.map((p) => ({
    age: p.age,
    'Super drawdown': p.withdrawal,
    'Age Pension': p.agePension,
  }));

  // ── Milestones the UI can actually use ──
  // The old version computed `milestoneAges` and the UI ignored it in favour of
  // a hardcoded [50, 55, 60].
  const milestones = [
    { age: preservationAge, label: `Preservation ${preservationAge}` },
    { age: retirementAge,   label: `Retire ${retirementAge}` },
    { age: pensionAge,      label: `Age Pension ${pensionAge}` },
    runsOut ? { age: depletionAge, label: 'Runs out' } : null,
  ]
    .filter((m) => m && m.age > currentAge && m.age <= horizonEnd)
    .filter((m, i, arr) => arr.findIndex((o) => o.age === m.age) === i)
    .sort((a, b) => a.age - b.age);

  return {
    // ── Headline ──
    projectedBalance,
    projectedBalanceNoExtra,
    realBalance,
    realBalanceNoExtra,
    extraSuperBoost: projectedBalance - projectedBalanceNoExtra,
    realExtraSuperBoost: realBalance - realBalanceNoExtra,
    inflationFactor,

    // ── Ages and phases ──
    currentAge,
    retirementAge,
    accessAge,
    preservationAge,
    pensionAge,
    planToAge: horizonEnd,
    yearsToRetire,
    yearsToAccess,
    beforePreservation,
    preservationWarning: beforePreservation
      ? `Preservation age is ${preservationAge}. Retiring at ${retirementAge} means ` +
        `${preservationAge - retirementAge} year(s) with no salary and no access to super — ` +
        'this projection compounds the balance untouched over that gap.'
      : null,

    // ── Contributions and caps ──
    salaryGrowth,
    sgContributionYearOne: sgYearOne,
    totalContributions: Math.round(totalContributions),
    totalContributionsTax: Math.round(totalContributionsTax),
    finalSalary: Math.round(grossSalary * Math.pow(1 + growth, Math.max(0, yearsToRetire - 1))),
    contributionCap: {
      concessionalCap: s.concessionalCap,
      effectiveCap,
      totalConcessional: concessionalYearOne,
      exceeded: capExceeded,
      excess: capExcess,
      headroom: capHeadroom,
      carryForward,
      useCarryForward,
      firstBreachAge: capBreachAge,
      capIndexationAssumed: true,
      capIndexationIncrement: 2500,
      nonConcessionalCap,
      nonConcessionalExceeded,
      nonConcessionalExcess,
    },

    // ── Division 293 ──
    division293: division293YearOne,
    division293Total: Math.round(totalDivision293),
    division293Applies: division293YearOne > 0,
    division293Threshold: s.division293.threshold,
    division293FromSuper,

    // ── Decumulation ──
    drawdownMode,
    firstYearDrawdown: Math.round(firstYearDrawdown),
    firstYearPension: Math.round(firstYearPension),
    firstYearIncome: Math.round(firstYearIncome),
    firstYearIncomeReal: Math.round(firstYearIncomeReal),
    firstYearMinimumFactor: firstDrawdown?.minimumFactor ?? null,
    totalWithdrawn: Math.round(totalWithdrawn),
    totalPensionReceived: Math.round(totalPensionReceived),
    runsOut,
    depletionAge,
    moneyLastsToAge,
    transferBalanceCap,
    retirementPhaseShare,
    aboveTransferBalanceCap: projectedBalance > transferBalanceCap,

    // ── Age Pension ──
    agePension: pensionAtRetirement,
    includeAgePension,
    relationshipStatus: status,
    homeowner,
    agePensionRates: pensionRates.agePension,
    agePensionAssessedAt: pensionRates.__date,
    agePensionEffectiveFrom: pensionRates.agePension.effective_from,

    // ── Flags and reference ──
    division296Flag,
    asfa,
    paydaySuper: s.paydaySuper,

    // ── Series ──
    path,
    chartData: chartDataNominal,   // legacy alias
    chartDataNominal,
    chartDataReal,
    incomeData,
    milestones,
    milestoneAges: milestones.map((m) => m.age),

    rates,
  };
}

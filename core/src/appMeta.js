// App store and web metadata — one source, two consumers.
//
// Every calculator in this suite ships twice: as a route on the web site, where
// these fields drive the <head> tags, and as a standalone Google Play listing,
// where `play` drives the store entry. Keeping both in one object is the only
// way the two stay in agreement.
//
// Lives in core, alongside appRoutes.js, because each standalone app build and
// any listing-upload script needs these strings — not just the web app.
//
// The Play limits below are hard. Google rejects a listing whose title exceeds
// 30 characters or whose short description exceeds 80. Run `validateAppMeta()`
// before shipping; it is mechanical on purpose, because counting characters by
// eye is exactly the thing humans get wrong.
//
// Copy rules baked into what follows, and worth keeping if you edit it:
//   - Never claim financial advice, guaranteed accuracy, or any ATO / government
//     endorsement or affiliation. These are estimates.
//   - The health calculator is general fitness, not medical advice. Play holds
//     health listings to a stricter standard than finance.
//   - No keyword stuffing. Play penalises it and it reads badly.

import { APP_ROUTES } from './appRoutes.js';

/** Suffix appended to every web <title>. 15 characters including the space. */
export const TITLE_SUFFIX = ' — 2176 Studios';

/** Character limits, from the Play Console and from search-snippet practice. */
export const LIMITS = {
  title: 60,
  descriptionMin: 140,
  descriptionMax: 158,
  ogTitleMax: 70,
  ogDescriptionMin: 100,
  ogDescriptionMax: 200,
  keywordsMin: 4,
  keywordsMax: 14,
  keywordMax: 40,
  playTitle: 30,
  playShortDescription: 80,
  playFullDescriptionMin: 1200,
  playFullDescriptionMax: 4000,
  playTagsMax: 5,
  playTagMax: 30,
};

/** Categories we are allowed to file under. */
export const PLAY_CATEGORIES = ['FINANCE', 'HEALTH_AND_FITNESS'];

// The single list of ids, from appRoutes.js. A calculator added there and
// forgotten here is caught by the validator rather than shipping without a
// listing.
const EXPECTED_IDS = APP_ROUTES.map((r) => r.id);

// Repeated at the foot of every finance full description. Kept as one constant
// so the wording cannot drift between listings.
const FINANCE_DISCLAIMER =
  'Estimates only. This app is a calculator, not financial or tax advice, and ' +
  'it is not affiliated with or endorsed by the ATO, Services Australia or any ' +
  'government agency. Figures depend on the assumptions you enter. Check ' +
  'anything that matters with a registered tax agent or licensed adviser.';

const PRIVACY_LINE =
  'No account, no sign-up, no tracking of your figures. Every calculation runs ' +
  'on your device and nothing you type is sent anywhere.';

export const APP_META = {
  home: {
    // ── Web ──
    title: `Australian Financial Calculators${TITLE_SUFFIX}`,
    description:
      'Twelve free Australian calculators for tax, mortgages, super, property and ' +
      'health, built on verified FY2026-27 rates. No account, nothing leaves your device.',
    ogTitle: 'Australian Financial Calculators — FY2026-27',
    ogDescription:
      'Take-home pay, mortgage offset, borrowing power, CGT, redundancy, salary ' +
      'sacrifice, novated lease and more. Free, current for FY2026-27, and no account needed.',
    keywords: [
      'australian tax calculator',
      'financial calculators australia',
      'take home pay calculator',
      'mortgage calculator australia',
      'fy2026-27 tax rates',
      'free calculators no signup',
    ],
    // The site index, not a shippable app.
    play: null,
  },

  // Not a calculator. It exists so every page — and every Play listing — has a
  // single stable place to point at for contact and privacy.
  about: {
    // ── Web ──
    title: `About, Contact & Privacy${TITLE_SUFFIX}`,
    description:
      'Who builds these Australian calculators, how to reach support, and the ' +
      'privacy policy: no accounts, no tracking, and your figures never leave your device.',
    ogTitle: 'About 2176 Studios — Contact & Privacy Policy',
    ogDescription:
      'Free Australian financial calculators with no sign-up. Who makes them, how to ' +
      'contact support at support@2176studios.com, and the full privacy policy.',
    keywords: [
      '2176 studios',
      'contact support',
      'privacy policy',
      'about 2176 studios',
      'australian financial calculators',
    ],
    // A policy page, not a shippable app.
    play: null,
  },

  mortgage: {
    // ── Web ──
    title: `Mortgage Repayment & Offset Calculator${TITLE_SUFFIX}`,
    description:
      'Work out Australian home loan repayments with an offset account, split and ' +
      'fixed loans, extra repayments, interest-only periods, LMI and rate rises.',
    ogTitle: 'Mortgage Repayment & Offset Calculator (Australia)',
    ogDescription:
      'Model an offset account, split and fixed loans, extra repayments and interest-only ' +
      'periods. See the interest saved, the years cut off, and how a rate rise changes it.',
    keywords: [
      'mortgage calculator australia',
      'offset account calculator',
      'home loan repayment calculator',
      'extra repayments calculator',
      'split loan calculator',
      'interest only calculator',
      'lmi calculator',
      'fortnightly repayments',
    ],
    // ── Google Play ──
    play: {
      title: 'Mortgage Offset Calculator AU',
      shortDescription: 'See what an offset account and extra repayments really save on your loan.',
      fullDescription: [
        'An offset account and an extra $200 a month sound small. Over a 30-year loan they are often worth tens of thousands of dollars and several years off the term — but only a full amortisation shows you by how much.',
        '',
        'This calculator builds the whole repayment schedule, month by month, for the loan you actually have: variable, fixed with a revert rate, or split across both. Then it shows the two numbers that matter — interest saved and time saved.',
        '',
        'WHAT IT MODELS',
        '• Offset accounts, including a starting balance and a monthly top-up from your salary',
        '• Extra repayments, and weekly, fortnightly or monthly repayment schedules',
        '• Split loans — a fixed portion and a variable portion, priced separately',
        '• Fixed periods with a revert rate when the fixed term ends',
        '• Interest-only periods, and the repayment jump when principal and interest start',
        '• Lenders mortgage insurance estimated from your loan-to-value ratio',
        '• Rate sensitivity — what happens to the repayment if rates move up or down',
        '• The full schedule, with interest, principal, balance and offset for every period',
        '',
        'HOW IT IS DIFFERENT',
        'A step-by-step "how this was calculated" panel opens beside the result and shows the working, so you can check the number rather than trust it. You can save and share a scenario as a link, and compare several scenarios side by side.',
        '',
        PRIVACY_LINE,
        '',
        'WHO IT IS FOR',
        'First home buyers sizing up a loan, owners deciding whether to park savings in an offset or pay down the principal, and anyone about to roll off a fixed rate and wanting to know what the repayment becomes.',
        '',
        FINANCE_DISCLAIMER,
      ].join('\n'),
      category: 'FINANCE',
      tags: ['mortgage', 'offset account', 'home loan', 'amortisation', 'australia'],
    },
  },

  paytax: {
    // ── Web ──
    title: `Take Home Pay & Tax Calculator${TITLE_SUFFIX}`,
    description:
      'Australian take-home pay for FY2026-27: income tax on the new 15% bracket, ' +
      'Medicare levy and surcharge, HECS/HELP, super and salary sacrifice.',
    ogTitle: 'Australian Take Home Pay & Tax Calculator (FY2026-27)',
    ogDescription:
      'Gross to net pay on verified FY2026-27 rates — the 15% bracket, Medicare levy and ' +
      'surcharge, the current HELP repayment system, super guarantee and salary sacrifice.',
    keywords: [
      'take home pay calculator',
      'australian tax calculator',
      'income tax calculator 2026',
      'hecs repayment calculator',
      'medicare levy calculator',
      'net pay calculator australia',
      'salary calculator australia',
      'super guarantee calculator',
    ],
    // ── Google Play ──
    play: {
      title: 'Tax & Take Home Pay Calculator',
      shortDescription: 'Gross to net pay on current FY2026-27 rates, including HECS and Medicare.',
      fullDescription: [
        'Type in a salary and see what actually lands in your account. This calculator runs the full FY2026-27 Australian scale — including the bottom bracket cut to 15% — and shows income tax, the Medicare levy, the Medicare levy surcharge, HECS/HELP and super separately, so you can see where every dollar went.',
        '',
        'Most pay calculators are a year or two behind. The HELP repayment system in particular was rebuilt from 1 July 2025, and the old percentage-of-total-income tables overstate a graduate repayment by hundreds or thousands of dollars a year. This one uses the current system.',
        '',
        'WHAT IT COVERS',
        '• Income tax on the FY2025-26, FY2026-27 and FY2027-28 scales, switchable',
        '• Medicare levy, the low-income reduction, and the surcharge if you have no private hospital cover',
        '• HECS/HELP, VSL, SFSS and SSL on the current repayment system',
        '• Super guarantee at 12%',
        '• Salary sacrifice, with a concessional cap warning',
        '• Bonuses and commissions, at whatever frequency you are paid them',
        '• Work-related deductions',
        '• Australian resident, foreign resident and working holiday maker rates',
        '• Weekly, fortnightly, monthly and annual views, and net-to-gross in reverse',
        '',
        'THE THING NOBODY TELLS YOU',
        'Salary sacrificing to super does not reduce your HELP repayment — reportable super contributions are added back for that purpose. This calculator shows that line explicitly rather than quietly getting it wrong in your favour.',
        '',
        'A step-by-step "how this was calculated" panel shows the working behind the figure, bracket by bracket. ' + PRIVACY_LINE,
        '',
        'WHO IT IS FOR',
        'Anyone comparing a job offer, negotiating a pay rise, checking a payslip, or working out what a bonus is worth after tax.',
        '',
        FINANCE_DISCLAIMER,
      ].join('\n'),
      category: 'FINANCE',
      tags: ['tax', 'take home pay', 'hecs', 'payroll', 'australia'],
    },
  },

  borrowingpower: {
    // ── Web ──
    title: `Borrowing Power Calculator${TITLE_SUFFIX}`,
    description:
      'Estimate how much you can borrow in Australia: income, HECS, credit cards and ' +
      'car loans, living expenses, the APRA buffer, your deposit and LMI.',
    ogTitle: 'Borrowing Power Calculator (Australia)',
    ogDescription:
      'How much can you borrow? Serviceability under the APRA buffer, plus the deposit ' +
      'limit and LMI — with HECS, credit card limits and existing loans taken into account.',
    keywords: [
      'borrowing power calculator',
      'how much can i borrow',
      'home loan serviceability',
      'apra buffer calculator',
      'deposit calculator australia',
      'hecs borrowing power',
      'lmi calculator',
    ],
    // ── Google Play ──
    play: {
      title: 'Borrowing Power Calculator',
      shortDescription: 'How much a lender will lend you — serviceability, deposit and LMI.',
      fullDescription: [
        'Lenders do not lend against your salary. They lend against what is left after tax, HECS, your living expenses and your credit card limits, tested at a rate several percentage points above the one you will actually pay. This calculator applies the same tests.',
        '',
        'Two limits are worked out and the smaller one wins: what your income can service, and what your deposit can support once stamp duty and lenders mortgage insurance come out of it. Most people are constrained by one and assume they are constrained by the other.',
        '',
        'WHAT IT TAKES INTO ACCOUNT',
        '• Single or joint applicants, with tax calculated separately for each',
        '• PAYG, casual and self-employed income treatment',
        '• Rental and other taxable income',
        '• HECS/HELP repayments — a real and commonly ignored hit to serviceability',
        '• Credit card limits, which count at the limit and not the balance',
        '• Personal and car loan repayments',
        '• Dependants and monthly living expenses, floored at a HEM-style minimum',
        '• The APRA serviceability buffer added to your assessment rate',
        '• Principal and interest or interest-only, and the loan term',
        '• Your deposit, the resulting loan-to-value ratio, and estimated LMI',
        '',
        'It also shows how far your limit moves if rates rise or fall, which is usually the difference between a comfortable purchase and a stressful one.',
        '',
        'Tax is computed on verified FY2026-27 rates, including the 15% bracket and the current HELP repayment system. A step-by-step "how this was calculated" panel shows the working. ' + PRIVACY_LINE,
        '',
        'WHO IT IS FOR',
        'Buyers working out a realistic price range before they start inspecting, and anyone who wants to understand a pre-approval number rather than just receive it. A lender assessment will differ — credit policies vary between banks.',
        '',
        FINANCE_DISCLAIMER,
      ].join('\n'),
      category: 'FINANCE',
      tags: ['borrowing power', 'home loan', 'serviceability', 'deposit', 'australia'],
    },
  },

  rentvbuy: {
    // ── Web ──
    title: `Rent vs. Buy Calculator${TITLE_SUFFIX}`,
    description:
      'Compare renting and buying in Australia over time, with stamp duty for all eight ' +
      'states, LMI, the CGT a renter pays and the year buying breaks even.',
    ogTitle: 'Rent vs. Buy Calculator (Australia)',
    ogDescription:
      'The honest comparison: stamp duty for your state and contract date, LMI, ongoing ' +
      'costs, rent rises, what your deposit would earn invested, and the break-even year.',
    keywords: [
      'rent vs buy calculator',
      'stamp duty calculator',
      'is it better to rent or buy',
      'break even property calculator',
      'first home buyer stamp duty',
      'property vs shares',
      'deposit opportunity cost',
    ],
    // ── Google Play ──
    play: {
      title: 'Rent vs Buy Calculator AU',
      shortDescription: 'Rent or buy? Stamp duty, LMI and the break-even year, for your state.',
      fullDescription: [
        '"Rent money is dead money" and "you will never save enough" are both slogans. The honest answer is a break-even year, and it turns on stamp duty in your state, what your deposit would have earned somewhere else, and how long you stay.',
        '',
        'This calculator runs both paths side by side for as long as you choose, then tells you the year at which buying pulls ahead — if it ever does on your figures.',
        '',
        'WHAT IT INCLUDES',
        '• Stamp duty for all eight states and territories, keyed to the contract date, with first-home-buyer concessions and thresholds applied where they qualify',
        '• Established, new-build, off-the-plan and vacant land treated separately, because the concessions differ',
        '• Lenders mortgage insurance where the deposit is under 20%',
        '• Upfront costs — conveyancing, inspections, loan fees',
        '• Ongoing costs — council rates, strata, maintenance, insurance',
        '• Full mortgage amortisation, not a flat interest estimate',
        '• Rent, and the annual rent increase',
        '• The return your deposit and any cost difference would have earned invested instead',
        '• Capital gains tax on those investments — a real cost of the renting path that most comparisons leave out, while the owner-occupier main residence exemption means the home is not taxed the same way',
        '• Property growth and selling costs at the end of the period',
        '',
        'Stamp duty rules change often and by jurisdiction. This app keys them to the contract date you enter rather than assuming today, so a comparison run in advance still reflects the right schedule.',
        '',
        'A step-by-step "how this was calculated" panel shows the working. ' + PRIVACY_LINE,
        '',
        'WHO IT IS FOR',
        'Renters wondering whether to buy, buyers deciding how long they need to stay to make the costs back, and anyone who wants the stamp duty number for their state before they fall in love with a listing.',
        '',
        FINANCE_DISCLAIMER,
      ].join('\n'),
      category: 'FINANCE',
      tags: ['rent vs buy', 'stamp duty', 'property', 'first home buyer', 'australia'],
    },
  },

  cgt: {
    // ── Web ──
    title: `Capital Gains Tax Calculator${TITLE_SUFFIX}`,
    description:
      'Estimate Australian CGT on shares, crypto or property: the 50% discount, main ' +
      'residence exemption, six-year rule, carried losses and your marginal rate.',
    ogTitle: 'Capital Gains Tax Calculator (Australia)',
    ogDescription:
      'Work out CGT on a sale — the 12-month 50% discount, main residence exemption and ' +
      'six-year absence rule, carry-forward losses, and tax at your FY2026-27 marginal rate.',
    keywords: [
      'capital gains tax calculator',
      'cgt calculator australia',
      'cgt 50% discount',
      'main residence exemption',
      'six year rule cgt',
      'crypto capital gains tax',
      'shares capital gains tax',
    ],
    // ── Google Play ──
    play: {
      title: 'Capital Gains Tax Calculator',
      shortDescription: 'CGT on shares, crypto or property, with the 50% discount and your rate.',
      fullDescription: [
        'Capital gains tax is not a separate rate. The gain is added to your income and taxed at your marginal rate, which is why selling in a high-income year and selling in a low-income year produce very different bills — and why a sale eleven months after purchase can cost far more than one at thirteen.',
        '',
        'This calculator works out the gain, applies the discount if you have earned it, adds the result to your other income, and taxes it properly.',
        '',
        'WHAT IT HANDLES',
        '• Shares, crypto, investment property and other CGT assets',
        '• The 50% discount for assets held more than 12 months, measured contract date to contract date — the dates that count, not settlement',
        '• A proper cost base: purchase costs, stamp duty, brokerage, legal fees and capital improvements',
        '• The main residence exemption, including a partial exemption for periods the property was rented out',
        '• The six-year absence rule',
        '• Carry-forward capital losses, and a net capital loss position carried to future years',
        '• Individual, joint and SMSF ownership',
        '• Resident, foreign resident and working holiday maker treatment — foreign residents lose the discount on assets acquired after 8 May 2012',
        '• Medicare levy on the assessable gain',
        '',
        'Tax on the gain is computed on verified FY2026-27 rates, including the bottom bracket at 15%. A step-by-step "how this was calculated" panel shows the cost base, the discount and the tax, line by line. ' + PRIVACY_LINE,
        '',
        'WHO IT IS FOR',
        'Anyone about to sell an investment property, a parcel of shares or a crypto holding who wants the tax figure before rather than after. Useful for deciding whether to wait past the 12-month mark, or to sell across two financial years.',
        '',
        FINANCE_DISCLAIMER,
      ].join('\n'),
      category: 'FINANCE',
      tags: ['capital gains tax', 'cgt', 'investing', 'property', 'australia'],
    },
  },

  redundancy: {
    // ── Web ──
    title: `Redundancy Pay Calculator${TITLE_SUFFIX}`,
    description:
      'Estimate an Australian redundancy payout: NES severance, notice, unused leave, ' +
      'the tax-free limit for a genuine redundancy and tax on the ETP balance.',
    ogTitle: 'Redundancy Pay Calculator (Australia)',
    ogDescription:
      'What you take home if you are made redundant — NES severance by years of service, ' +
      'notice, leave payout, the genuine redundancy tax-free limit, and the ETP tax that follows.',
    keywords: [
      'redundancy calculator australia',
      'redundancy pay nes',
      'genuine redundancy tax free',
      'etp tax calculator',
      'notice period pay',
      'long service leave payout',
      'annual leave payout tax',
    ],
    // ── Google Play ──
    play: {
      title: 'Redundancy Pay Calculator',
      shortDescription: 'Your redundancy payout after tax — severance, notice and leave.',
      fullDescription: [
        'A redundancy payout is four or five different payments stacked together, and each is taxed on a different basis. Severance has a tax-free limit that grows with your years of service. Unused annual leave is taxed at a capped rate. Long service leave depends on when it accrued. Anything left over is an employment termination payment with its own caps.',
        '',
        'Guessing is common and expensive. This calculator builds the payout as a waterfall, so you can see each component, the tax on it, and what actually reaches your account.',
        '',
        'WHAT IT WORKS OUT',
        '• NES severance scaled to your years of continuous service',
        '• The small-business exemption for employers with fewer than 15 employees',
        '• Notice paid in lieu, at the full rate of pay, with the extra week for over-45s',
        '• Unused annual leave and leave loading',
        '• Long service leave, split by accrual period where the older concessional rates still apply',
        '• The genuine redundancy tax-free limit — a base amount plus an amount per year of service',
        '• Employment termination payment tax, with the ETP cap and the whole-of-income cap',
        '• The concessional rate up to the cap, and the top marginal rate above it',
        '• Genuine redundancy, non-genuine redundancy, resignation and dismissal treated differently, because the tax outcome is not the same',
        '• Ex gratia payments on top of the NES minimum',
        '',
        'Tax uses verified FY2026-27 rates, including the 15% bracket and current termination payment caps. A step-by-step "how this was calculated" panel shows the working, which is handy for checking an employer letter. ' + PRIVACY_LINE,
        '',
        'WHO IT IS FOR',
        'Anyone who has been told their role is going, anyone weighing a voluntary redundancy offer, and managers who need a realistic figure before a conversation.',
        '',
        FINANCE_DISCLAIMER,
      ].join('\n'),
      category: 'FINANCE',
      tags: ['redundancy', 'termination pay', 'etp', 'employment', 'australia'],
    },
  },

  salarysacrifice: {
    // ── Web ──
    title: `Salary Sacrifice Calculator${TITLE_SUFFIX}`,
    description:
      'See what salary sacrificing to super costs and saves: tax saved, the hit to your ' +
      'take-home pay, Division 293, carry-forward and the concessional cap.',
    ogTitle: 'Salary Sacrifice to Super Calculator (Australia)',
    ogDescription:
      'Tax saved versus the real cut to your take-home pay, per fortnight. Includes the ' +
      'concessional cap, unused carry-forward, and Division 293 if you earn over $250,000.',
    keywords: [
      'salary sacrifice calculator',
      'super contributions calculator',
      'concessional cap calculator',
      'division 293 calculator',
      'carry forward concessional',
      'salary packaging super',
    ],
    // ── Google Play ──
    play: {
      title: 'Salary Sacrifice Calculator',
      shortDescription: 'What sacrificing to super really costs your pay, and what it saves.',
      fullDescription: [
        'Salary sacrificing $10,000 to super does not cost you $10,000 of take-home pay. Depending on your marginal rate it might cost around $6,000 — the rest was going to tax anyway. Seeing that gap as a fortnightly number is usually what makes the decision obvious.',
        '',
        'This calculator shows both sides at once: the annual tax saved, and the exact reduction in the pay that reaches your account each fortnight.',
        '',
        'WHAT IT ACCOUNTS FOR',
        '• Tax saved at your marginal rate, against the 15% contributions tax on the way in',
        '• The concessional contributions cap, counting your employer super guarantee towards it',
        '• Unused carry-forward cap from the previous five years, if your total super balance qualifies',
        '• Division 293 — the extra 15% that applies once income plus contributions passes $250,000, and which roughly halves the benefit for high earners who do not know about it',
        '• Your take-home pay before and after, side by side, per year and per fortnight',
        '• How much actually lands in super after contributions tax',
        '• A long-run projection of what the sacrificed amount grows to, at a return you choose',
        '',
        'It is also honest about the catch: money in super is preserved and generally cannot be touched until you are 60 and retired. The app says so, rather than presenting the tax saving as free money.',
        '',
        'Built on verified FY2026-27 rates, including the 15% bottom bracket. A step-by-step "how this was calculated" panel shows every line. ' + PRIVACY_LINE,
        '',
        'WHO IT IS FOR',
        'Employees deciding how much to sacrifice this year, high earners who need to check whether Division 293 applies to them, and anyone with unused cap sitting there from previous years.',
        '',
        FINANCE_DISCLAIMER,
      ].join('\n'),
      category: 'FINANCE',
      tags: ['salary sacrifice', 'superannuation', 'tax saving', 'retirement', 'australia'],
    },
  },

  fhsss: {
    // ── Web ──
    title: `First Home Super Saver (FHSSS) Calculator${TITLE_SUFFIX}`,
    description:
      'Work out your First Home Super Saver deposit: releasable contributions, ' +
      'associated earnings, the tax you save and what reaches your bank account.',
    ogTitle: 'First Home Super Saver (FHSSS) Calculator',
    ogDescription:
      'How much extra deposit the FHSS scheme is worth to you — releasable voluntary ' +
      'contributions, associated earnings, withdrawal tax, and the net amount you receive.',
    keywords: [
      'first home super saver calculator',
      'fhsss calculator',
      'fhss scheme',
      'first home deposit super',
      'voluntary super contributions',
      'first home buyer australia',
    ],
    // ── Google Play ──
    play: {
      title: 'First Home Super Saver FHSSS',
      shortDescription: 'How much extra first home deposit the FHSS scheme is worth to you.',
      fullDescription: [
        'The First Home Super Saver scheme lets you save a deposit inside super, where contributions are taxed at 15% instead of your marginal rate, and then release it to buy your first home. On a 30% or 37% marginal rate that difference is real money — often several thousand dollars more deposit for the same pay sacrificed.',
        '',
        'The rules are fiddly, though: annual and total release caps, deemed earnings rather than your fund actual return, and withdrawal tax at your marginal rate less a 30% offset. This calculator applies them and gives you the net figure.',
        '',
        'WHAT IT WORKS OUT',
        '• Voluntary concessional (salary sacrifice) and non-concessional (after-tax) contributions, which are released and taxed differently',
        '• The annual amount eligible for release, and the lifetime total cap',
        '• Associated earnings, calculated on the deemed rate rather than an assumed investment return',
        '• Withdrawal tax on the concessional portion, with the 30% tax offset applied',
        '• The tax you saved on the way in, at your marginal rate',
        '• A year-by-year accumulation table, so you can see how many years of contributing get you to your target',
        '• The net deposit that reaches your bank account at the end',
        '',
        'It also flags the eligibility conditions and the interaction with your concessional cap, because contributing above the cap is a common and avoidable mistake.',
        '',
        'Built on verified FY2026-27 rates, including the 15% bottom bracket. A step-by-step "how this was calculated" panel shows the working. ' + PRIVACY_LINE,
        '',
        'WHO IT IS FOR',
        'First home buyers deciding whether to save inside super or in a savings account, and anyone already contributing who wants to know what they can release and when.',
        '',
        FINANCE_DISCLAIMER,
      ].join('\n'),
      category: 'FINANCE',
      tags: ['fhsss', 'first home buyer', 'superannuation', 'deposit', 'australia'],
    },
  },

  retirement: {
    // ── Web ──
    title: `Retirement & Super Calculator${TITLE_SUFFIX}`,
    description:
      'Project your super to retirement and beyond: contributions, fees, investment ' +
      'returns, inflation, drawdown, the Age Pension and how long the money lasts.',
    ogTitle: 'Retirement & Superannuation Calculator (Australia)',
    ogDescription:
      'Project your super balance to retirement, then draw it down. Includes fees, ' +
      'insurance premiums, inflation, an Age Pension estimate, and the age the money runs out.',
    keywords: [
      'retirement calculator australia',
      'superannuation projection',
      'how much super do i need',
      'age pension calculator',
      'super drawdown calculator',
      'retirement income calculator',
      'preservation age',
    ],
    // ── Google Play ──
    play: {
      title: 'Super & Retirement Planner',
      shortDescription: 'Project your super, draw it down, and see what age the money runs out.',
      fullDescription: [
        'Most super calculators stop at a balance. A balance is not the answer — the answer is how long the money lasts, and what income it pays you each year in money worth what today money is worth.',
        '',
        'This app projects your super to retirement and then keeps going, drawing it down year by year alongside an Age Pension estimate, until either you reach the age you planned for or the balance hits zero.',
        '',
        'THE ACCUMULATION PHASE',
        '• Employer super guarantee at 12%, growing with your salary',
        '• Extra personal contributions, pre-tax or after-tax, held flat or indexed to your pay',
        '• Unused carry-forward concessional cap from previous years',
        '• Division 293 for higher earners, paid personally or released from the fund',
        '• Percentage fees, flat administration fees and insurance premiums inside super — the drag most projections omit, and it compounds',
        '• Investment return and inflation modelled separately, so results appear in both nominal and today dollars',
        '',
        'THE RETIREMENT PHASE',
        '• Drawdown at the legislated minimum, or at a target income you set',
        '• An Age Pension estimate under the income and assets tests, single or couple, homeowner or not',
        '• Other assessable assets and income included in the means test',
        '• The age your balance is exhausted, and the income per year until then',
        '',
        'It also states preservation age plainly: if you plan to retire before 60, the app tells you how many years you would need to fund from outside super.',
        '',
        'Built on verified FY2026-27 rates and thresholds. A step-by-step "how this was calculated" panel shows the working. ' + PRIVACY_LINE,
        '',
        'WHO IT IS FOR',
        'Anyone from their 30s to their 60s who wants a realistic picture rather than a comforting one, and anyone deciding whether extra contributions now are worth the cut to their pay.',
        '',
        FINANCE_DISCLAIMER,
      ].join('\n'),
      category: 'FINANCE',
      tags: ['retirement', 'superannuation', 'age pension', 'projection', 'australia'],
    },
  },

  novatedlease: {
    // ── Web ──
    title: `Novated Lease Calculator${TITLE_SUFFIX}`,
    description:
      'Compare a novated lease with buying the car outright: the EV FBT exemption, GST ' +
      'saved, employee contributions, the residual and the reportable benefit.',
    ogTitle: 'Novated Lease Calculator (Australia)',
    ogDescription:
      'Is a novated lease actually cheaper? GST saved, the EV FBT exemption, employee ' +
      'contributions, the residual, and the reportable benefit that affects HECS and Medicare.',
    keywords: [
      'novated lease calculator',
      'ev novated lease',
      'fbt exemption electric vehicle',
      'employee contribution method',
      'salary packaging car',
      'novated lease vs buying',
      'reportable fringe benefit',
    ],
    // ── Google Play ──
    play: {
      title: 'Novated Lease Calculator',
      shortDescription: 'Novated lease vs buying outright, including the reportable benefit.',
      fullDescription: [
        'Novated lease quotes are built to look good. They show a fortnightly figure and a tax saving, and they usually do not show the residual you owe at the end, the interest inside the rental, or the reportable fringe benefit that follows you onto your tax return.',
        '',
        'This calculator compares the lease against the two realistic alternatives — a car loan, or paying cash and claiming work kilometres — over the full term, and gives a net annual cost for each.',
        '',
        'WHAT IT MODELS',
        '• The FBT exemption for eligible electric vehicles under the luxury car tax threshold, and the ordinary statutory method for everything else',
        '• Plug-in hybrids treated correctly — the PHEV exemption ended for new arrangements from 1 April 2025',
        '• GST saved on the purchase price and on running costs',
        '• The employee contribution method, where post-tax contributions reduce the FBT liability',
        '• ATO minimum residual values by lease term, and the GST payable on the residual payout',
        '• Finance rate, administration fees and running costs',
        '• The reportable fringe benefit amount, and its knock-on effect on your HELP repayment, Medicare levy surcharge and Division 293 — the single biggest thing quotes leave out',
        '• Super forgone, because a pre-tax deduction reduces the salary your employer pays super on',
        '• Early exit: the lease balance and payout figure if you leave the job or the car partway through',
        '',
        'Tax is computed on verified FY2026-27 rates and the current FBT year settings. A step-by-step "how this was calculated" panel shows the working, which is exactly what you want beside a broker quote. ' + PRIVACY_LINE,
        '',
        'WHO IT IS FOR',
        'Anyone offered salary packaging on a car, EV buyers checking whether the FBT exemption is as good as it sounds, and anyone comparing a lease quote against simply buying the thing.',
        '',
        FINANCE_DISCLAIMER,
      ].join('\n'),
      category: 'FINANCE',
      tags: ['novated lease', 'salary packaging', 'fbt', 'electric vehicle', 'australia'],
    },
  },

  savings: {
    // ── Web ──
    title: `Savings & Compound Interest Calculator${TITLE_SUFFIX}`,
    description:
      'Project a savings balance with compound interest, regular deposits, tax on ' +
      'interest and inflation, plus what it takes to hit a goal by a chosen date.',
    ogTitle: 'Savings & Compound Interest Calculator',
    ogDescription:
      'Grow a balance with regular deposits and compound interest, then see it after tax ' +
      'and after inflation. Set a target and the app solves the deposit needed to reach it.',
    keywords: [
      'compound interest calculator',
      'savings calculator australia',
      'savings goal calculator',
      'interest calculator',
      'tax on savings interest',
      'real value inflation calculator',
    ],
    // ── Google Play ──
    play: {
      title: 'Savings Interest Calculator',
      shortDescription: 'Compound interest with deposits, tax and inflation — and goal solving.',
      fullDescription: [
        'A compound interest calculator that does not stop at the gross number. Interest on a savings account is taxable income, and a balance in ten years is not worth what the same figure is worth today. Both are usually the difference between a projection and a plan.',
        '',
        'Enter what you have, what you add and what rate you earn, and the app projects the balance year by year — gross, after tax on the interest, and in today dollars.',
        '',
        'WHAT IT DOES',
        '• Starting balance plus regular deposits, at the start or the end of each period',
        '• Daily, monthly, quarterly and annual compounding',
        '• Deposits indexed to grow each year, or held flat',
        '• Tax on interest earned, at the marginal rate you set',
        '• Inflation, so the projection appears in real terms as well as nominal',
        '• The effective annual rate once compounding is taken into account',
        '• A breakdown of how much of the final balance was your money and how much was interest',
        '',
        'GOAL SOLVING',
        'Set a target amount and a date, and the app solves the missing piece — the monthly deposit you would need, or how long the target takes at your current rate. If the goal is not reachable on those numbers, it says so, instead of quietly returning something implausible.',
        '',
        PRIVACY_LINE + ' A step-by-step "how this was calculated" panel shows the working.',
        '',
        'WHO IT IS FOR',
        'Anyone saving for a house deposit, a car, a wedding or an emergency fund, and anyone comparing savings account rates who wants the after-tax difference rather than the advertised one.',
        '',
        FINANCE_DISCLAIMER,
      ].join('\n'),
      category: 'FINANCE',
      tags: ['savings', 'compound interest', 'budgeting', 'goals', 'australia'],
    },
  },

  health: {
    // ── Web ──
    title: `Calorie, Macro & BMR Calculator${TITLE_SUFFIX}`,
    description:
      'Estimate your BMR and TDEE, then get daily calorie and macro targets for losing ' +
      'fat, maintaining or building muscle, with a realistic weekly projection.',
    ogTitle: 'Calorie, Macro & BMR Calculator',
    ogDescription:
      'BMR and TDEE from your height, weight, age and activity, then daily calorie and ' +
      'protein, carb and fat targets for your goal — with a week-by-week weight projection.',
    keywords: [
      'calorie calculator',
      'macro calculator',
      'bmr calculator',
      'tdee calculator',
      'protein intake calculator',
      'bmi calculator',
      'weight loss calculator',
    ],
    // ── Google Play ──
    play: {
      title: 'Calorie & Macro Calculator',
      shortDescription: 'BMR, TDEE and daily calorie and macro targets for your goal.',
      fullDescription: [
        'Work out how much energy your body uses, then what to eat for the goal you have — lose fat, maintain, or gain muscle. The app gives you a daily calorie target and a protein, carbohydrate and fat split, plus a week-by-week projection of where your weight is heading.',
        '',
        'WHAT IT CALCULATES',
        '• Basal metabolic rate using the Mifflin-St Jeor equation, or Katch-McArdle if you know your body fat percentage',
        '• Total daily energy expenditure across five activity levels',
        '• A daily calorie target for weight loss, maintenance or muscle gain',
        '• Protein, carbohydrate and fat targets in grams, scaled to your bodyweight and goal',
        '• BMI, with an optional WHO Asian-adjusted reference range',
        '• A week-by-week projection to your goal weight, and the date you would reach it',
        '• Metric and imperial units',
        '',
        'WHY THE PROJECTION IS DIFFERENT',
        'Most calculators assume your energy expenditure stays constant while you lose weight. It does not — a smaller body burns less, and roughly a fifth of what you lose is lean mass, so your BMR falls as you go. This app re-simulates each week against your updated weight, which is why its timelines are longer, and more realistic, than a simple deficit divided by 7,700.',
        '',
        'It also refuses to produce a number it should not. If your inputs would require an intake below safe minimums, or a rate of loss above roughly 1% of bodyweight per week, the app tells you rather than printing the figure anyway.',
        '',
        PRIVACY_LINE,
        '',
        'IMPORTANT',
        'This is a general fitness and nutrition estimator. It is not medical advice, and it is not a diagnostic or treatment tool. Energy needs vary widely between individuals. Talk to a doctor or an accredited practising dietitian before starting a weight-loss programme, and especially if you are pregnant or breastfeeding, under 18, or managing a health condition such as diabetes, an eating disorder, or heart or kidney disease.',
      ].join('\n'),
      category: 'HEALTH_AND_FITNESS',
      tags: ['calorie counter', 'macros', 'bmr', 'tdee', 'fitness'],
    },
  },
};

/* ────────────────────────── validation ────────────────────────── */

// Count by code point, not UTF-16 unit. The em dashes and bullets here are BMP
// characters so the two agree today, but an emoji in a Play title would make
// `.length` disagree with what the console counts.
const len = (s) => (typeof s === 'string' ? [...s].length : -1);

function checkString(problems, id, field, value, { min = 1, max } = {}) {
  if (typeof value !== 'string' || value.trim() === '') {
    problems.push(`${id}.${field}: missing or not a string`);
    return;
  }
  const n = len(value);
  if (max != null && n > max) {
    problems.push(`${id}.${field}: ${n} chars, limit ${max} (over by ${n - max})`);
  }
  if (n < min) {
    problems.push(`${id}.${field}: ${n} chars, minimum ${min} (short by ${min - n})`);
  }
}

/**
 * Check every entry in APP_META against the character limits.
 *
 * Returns an array of human-readable problems, empty when clean. Exceeding a
 * Play limit gets a listing rejected at submission, so this is deliberately
 * mechanical — do not eyeball the counts.
 *
 * @param {object} [meta] metadata to validate; defaults to APP_META.
 * @returns {string[]} problems, empty when clean.
 */
export function validateAppMeta(meta = APP_META) {
  const problems = [];

  const ids = Object.keys(meta);
  for (const expected of EXPECTED_IDS) {
    if (!ids.includes(expected)) problems.push(`missing entry for id "${expected}"`);
  }
  for (const id of ids) {
    if (!EXPECTED_IDS.includes(id)) problems.push(`unknown id "${id}" — not in appRoutes.js`);
  }

  const playTitles = new Map();

  for (const [id, entry] of Object.entries(meta)) {
    if (!entry || typeof entry !== 'object') {
      problems.push(`${id}: entry is not an object`);
      continue;
    }

    // ── Web ──
    checkString(problems, id, 'title', entry.title, { max: LIMITS.title });
    checkString(problems, id, 'description', entry.description, {
      min: LIMITS.descriptionMin,
      max: LIMITS.descriptionMax,
    });
    checkString(problems, id, 'ogTitle', entry.ogTitle, { max: LIMITS.ogTitleMax });
    checkString(problems, id, 'ogDescription', entry.ogDescription, {
      min: LIMITS.ogDescriptionMin,
      max: LIMITS.ogDescriptionMax,
    });

    if (!Array.isArray(entry.keywords)) {
      problems.push(`${id}.keywords: not an array`);
    } else {
      if (entry.keywords.length < LIMITS.keywordsMin) {
        problems.push(
          `${id}.keywords: ${entry.keywords.length} entries, minimum ${LIMITS.keywordsMin}`
        );
      }
      if (entry.keywords.length > LIMITS.keywordsMax) {
        problems.push(
          `${id}.keywords: ${entry.keywords.length} entries, maximum ${LIMITS.keywordsMax}`
        );
      }
      entry.keywords.forEach((k, i) => {
        checkString(problems, id, `keywords[${i}]`, k, { max: LIMITS.keywordMax });
        if (typeof k === 'string' && k !== k.trim()) {
          problems.push(`${id}.keywords[${i}]: has leading or trailing whitespace`);
        }
      });
      const seen = new Set();
      for (const k of entry.keywords) {
        const key = String(k).toLowerCase();
        if (seen.has(key)) problems.push(`${id}.keywords: duplicate "${k}"`);
        seen.add(key);
      }
    }

    // ── Google Play ──
    // `null` is the deliberate "this is not an app" marker; undefined is a
    // forgotten field, and those should not read the same.
    if (entry.play === null) continue;
    if (!entry.play || typeof entry.play !== 'object') {
      problems.push(`${id}.play: must be an object or explicitly null`);
      continue;
    }

    const p = entry.play;
    checkString(problems, id, 'play.title', p.title, { max: LIMITS.playTitle });
    checkString(problems, id, 'play.shortDescription', p.shortDescription, {
      max: LIMITS.playShortDescription,
    });
    checkString(problems, id, 'play.fullDescription', p.fullDescription, {
      min: LIMITS.playFullDescriptionMin,
      max: LIMITS.playFullDescriptionMax,
    });

    if (!PLAY_CATEGORIES.includes(p.category)) {
      problems.push(
        `${id}.play.category: "${p.category}" is not one of ${PLAY_CATEGORIES.join(', ')}`
      );
    }

    if (!Array.isArray(p.tags) || p.tags.length === 0) {
      problems.push(`${id}.play.tags: not a non-empty array`);
    } else {
      if (p.tags.length > LIMITS.playTagsMax) {
        problems.push(`${id}.play.tags: ${p.tags.length} tags, maximum ${LIMITS.playTagsMax}`);
      }
      p.tags.forEach((t, i) =>
        checkString(problems, id, `play.tags[${i}]`, t, { max: LIMITS.playTagMax })
      );
    }

    // Play rejects two apps from one developer account sharing a title.
    if (typeof p.title === 'string') {
      if (playTitles.has(p.title)) {
        problems.push(`${id}.play.title: duplicate of ${playTitles.get(p.title)}`);
      }
      playTitles.set(p.title, id);
    }
  }

  return problems;
}

/** Convenience lookup. Returns undefined for an unknown id. */
export function metaFor(id) {
  return APP_META[id];
}

/**
 * Web `<head>` fields for one calculator, ready to spread into a head manager.
 * Returns null for an unknown id.
 */
export function headMetaFor(id) {
  const m = APP_META[id];
  if (!m) return null;
  return {
    title: m.title,
    description: m.description,
    ogTitle: m.ogTitle,
    ogDescription: m.ogDescription,
    keywords: m.keywords.join(', '),
  };
}

/** Every entry that ships as its own Play listing, as `[id, play]` pairs. */
export function playListings(meta = APP_META) {
  return Object.entries(meta)
    .filter(([, entry]) => entry && entry.play)
    .map(([id, entry]) => [id, entry.play]);
}

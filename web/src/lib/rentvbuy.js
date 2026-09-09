// Rent vs Buy calculator — 2026-27 stamp duty rates

// Stamp duty calculators per state (2026-27 estimated, general rates)
function stampDutyNSW(price, firstHome) {
  if (firstHome && price <= 800000) return 0;
  if (firstHome && price <= 1000000) return ((price - 800000) / 200000) * stampDutyNSW(1000000, false);
  if (price <= 16000)  return price * 0.0125;
  if (price <= 35000)  return 200 + (price - 16000) * 0.015;
  if (price <= 93000)  return 485 + (price - 35000) * 0.0175;
  if (price <= 351000) return 1500 + (price - 93000) * 0.035;
  if (price <= 1168000) return 10530 + (price - 351000) * 0.045;
  return 47295 + (price - 1168000) * 0.055;
}

function stampDutyVIC(price, firstHome) {
  if (firstHome && price <= 600000) return 0;
  if (firstHome && price <= 750000) {
    const full = stampDutyVIC(price, false);
    return full * (1 - (750000 - price) / 150000);
  }
  if (price <= 25000)  return price * 0.014;
  if (price <= 130000) return 350 + (price - 25000) * 0.024;
  if (price <= 960000) return 2870 + (price - 130000) * 0.06;
  return 55000 + (price - 960000) * 0.065;
}

function stampDutyQLD(price, firstHome) {
  let duty = 0;
  if (price <= 5000)        duty = 0;
  else if (price <= 75000)  duty = (price - 5000) * 0.015;
  else if (price <= 540000) duty = 1050 + (price - 75000) * 0.035;
  else if (price <= 1000000) duty = 17325 + (price - 540000) * 0.045;
  else                       duty = 38025 + (price - 1000000) * 0.0575;
  // QLD first home grant: rebate up to $8,750 for new homes under $750k
  if (firstHome && price <= 750000) duty = Math.max(0, duty - 8750);
  return duty;
}

function stampDutySA(price) {
  if (price <= 12000)  return price * 0.01;
  if (price <= 30000)  return 120 + (price - 12000) * 0.02;
  if (price <= 50000)  return 480 + (price - 30000) * 0.03;
  if (price <= 100000) return 1080 + (price - 50000) * 0.035;
  if (price <= 200000) return 2830 + (price - 100000) * 0.04;
  if (price <= 250000) return 6830 + (price - 200000) * 0.045;
  if (price <= 300000) return 9080 + (price - 250000) * 0.05;
  if (price <= 500000) return 11580 + (price - 300000) * 0.055;
  return 22580 + (price - 500000) * 0.055;
}

function stampDutyWA(price, firstHome) {
  let duty = 0;
  if (price <= 80000)        duty = price * 0.019;
  else if (price <= 100000)  duty = 1520 + (price - 80000) * 0.0285;
  else if (price <= 250000)  duty = 2090 + (price - 100000) * 0.03;
  else if (price <= 500000)  duty = 6590 + (price - 250000) * 0.0415;
  else                        duty = 16965 + (price - 500000) * 0.0515;
  if (firstHome && price <= 430000) duty = 0;
  else if (firstHome && price <= 530000) duty = duty * (price - 430000) / 100000;
  return duty;
}

function stampDutyACT(price) {
  if (price <= 200000)  return price * 0.006;
  if (price <= 300000)  return 1200 + (price - 200000) * 0.023;
  if (price <= 500000)  return 3500 + (price - 300000) * 0.028;
  if (price <= 750000)  return 9100 + (price - 500000) * 0.038;
  if (price <= 1000000) return 18600 + (price - 750000) * 0.043;
  if (price <= 1455000) return 29350 + (price - 1000000) * 0.055;
  return 54375 + (price - 1455000) * 0.057;
}

function stampDutyTAS(price) {
  if (price <= 3000)    return 50;
  if (price <= 25000)   return 50 + (price - 3000) * 0.015;
  if (price <= 75000)   return 380 + (price - 25000) * 0.0225;
  if (price <= 200000)  return 1505 + (price - 75000) * 0.035;
  if (price <= 375000)  return 5880 + (price - 200000) * 0.04;
  if (price <= 725000)  return 12880 + (price - 375000) * 0.0425;
  return 27755 + (price - 725000) * 0.045;
}

function stampDutyNT(price) {
  if (price < 525000) return (price * 0.065 - 710) * price / 525000;
  return price * 0.065 - 710;
}

function getStampDuty(price, state, firstHome) {
  switch (state) {
    case 'NSW': return stampDutyNSW(price, firstHome);
    case 'VIC': return stampDutyVIC(price, firstHome);
    case 'QLD': return stampDutyQLD(price, firstHome);
    case 'SA':  return stampDutySA(price);
    case 'WA':  return stampDutyWA(price, firstHome);
    case 'ACT': return stampDutyACT(price);
    case 'TAS': return stampDutyTAS(price);
    case 'NT':  return stampDutyNT(price);
    default:    return stampDutyNSW(price, firstHome);
  }
}

function monthlyPI(principal, annualRate, termYears) {
  const r = annualRate / 100 / 12;
  const n = termYears * 12;
  if (r === 0) return principal / n;
  return principal * r / (1 - Math.pow(1 + r, -n));
}

export function calcRentVsBuy(inputs) {
  const {
    purchasePrice = 700000,
    state = 'NSW',
    firstHome = false,
    deposit = 140000,
    mortgageRate = 6.0,
    loanTerm = 30,
    propertyGrowth = 4,
    annualRent = 30000,
    rentIncrease = 3,
    depositReturn = 7,
    ongoingCosts = 8000,
    sellingCosts = 2,
    comparisonYears = 10,
  } = inputs;

  const stampDuty = Math.max(0, getStampDuty(purchasePrice, state, firstHome));
  const loanAmount = purchasePrice - deposit + stampDuty;
  const monthlyMortgage = monthlyPI(loanAmount, mortgageRate, loanTerm);

  let buyerEquity = deposit - stampDuty;
  let renterWealth = deposit;
  let currentPropertyValue = purchasePrice;
  let mortgageBalance = loanAmount;
  let cumulativeRent = 0;
  let cumulativeInterest = 0;
  let cumulativeMortgagePayments = 0;
  let currentRent = annualRent;

  const chartData = [{ year: 0, 'Buyer equity': Math.round(buyerEquity), 'Renter wealth': Math.round(renterWealth) }];
  let breakEvenYear = null;

  for (let yr = 1; yr <= comparisonYears; yr++) {
    // Buyer: property appreciates, mortgage reduces
    currentPropertyValue *= (1 + propertyGrowth / 100);
    const yearlyMortgage = monthlyMortgage * 12;
    const yearlyInterest = mortgageBalance * mortgageRate / 100;
    const yearlyPrincipal = Math.min(yearlyMortgage - yearlyInterest, mortgageBalance);
    mortgageBalance = Math.max(0, mortgageBalance - yearlyPrincipal);
    cumulativeInterest += yearlyInterest;
    cumulativeMortgagePayments += yearlyMortgage;
    const sellingCostAmount = currentPropertyValue * (sellingCosts / 100);
    buyerEquity = currentPropertyValue - mortgageBalance - sellingCostAmount;

    // Renter: invests deposit at depositReturn, pays rent (vs. mortgage + costs)
    const renterSurplus = yearlyMortgage + ongoingCosts - currentRent;
    renterWealth = renterWealth * (1 + depositReturn / 100) + Math.max(0, renterSurplus) * 0.7; // rough tax on investment gains
    cumulativeRent += currentRent;
    currentRent *= (1 + rentIncrease / 100);

    chartData.push({ year: yr, 'Buyer equity': Math.round(buyerEquity), 'Renter wealth': Math.round(renterWealth) });

    if (breakEvenYear === null && buyerEquity > renterWealth) {
      breakEvenYear = yr;
    }
  }

  const finalPropertyValue = currentPropertyValue;
  const projectedPropertyValue = purchasePrice * Math.pow(1 + propertyGrowth / 100, comparisonYears);

  return {
    stampDuty,
    loanAmount,
    monthlyMortgage,
    buyerEquity: Math.round(buyerEquity),
    renterWealth: Math.round(renterWealth),
    wealthGap: Math.round(buyerEquity - renterWealth),
    breakEvenYear,
    cumulativeInterest: Math.round(cumulativeInterest),
    cumulativeRent: Math.round(cumulativeRent),
    cumulativeMortgagePayments: Math.round(cumulativeMortgagePayments),
    projectedPropertyValue: Math.round(projectedPropertyValue),
    chartData,
  };
}

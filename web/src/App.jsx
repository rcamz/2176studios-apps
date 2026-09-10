import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import MortgageCalc from './MortgageCalc.jsx';
import PayTaxCalc from './PayTaxCalc.jsx';
import CGTCalc from './CGTCalc.jsx';
import RedundancyCalc from './RedundancyCalc.jsx';
import SalarySacrificeCalc from './SalarySacrificeCalc.jsx';
import FHSSSCalc from './FHSSSCalc.jsx';
import RetirementCalc from './RetirementCalc.jsx';
import BorrowingPowerCalc from './BorrowingPowerCalc.jsx';
import NovatedLeaseCalc from './NovatedLeaseCalc.jsx';
import RentVBuyCalc from './RentVBuyCalc.jsx';
import SavingsCalc from './SavingsCalc.jsx';
import HealthCalc from './HealthCalc.jsx';
import Home from './Home.jsx';
import About from './About.jsx';

// Restores the top of the page on navigation, except when the link carried a
// hash — the footer's About / Contact / Privacy links all point at anchors on
// one page, and scrolling to the top would land on the wrong section. The
// element does not exist until the new route has rendered, so this runs after
// paint and falls back to the top if the id is not found.
function ScrollToTop() {
  const { pathname, hash } = useLocation();

  useEffect(() => {
    if (!hash) { window.scrollTo(0, 0); return; }
    const el = document.getElementById(hash.slice(1));
    if (el) el.scrollIntoView();
    else window.scrollTo(0, 0);
  }, [pathname, hash]);

  return null;
}

export default function App() {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/mortgagecalc" element={<MortgageCalc />} />
        <Route path="/paytaxcalc" element={<PayTaxCalc />} />
        <Route path="/cgtcalc" element={<CGTCalc />} />
        <Route path="/redundancycalc" element={<RedundancyCalc />} />
        <Route path="/salarysacrificecalc" element={<SalarySacrificeCalc />} />
        <Route path="/fhssscalc" element={<FHSSSCalc />} />
        <Route path="/retirementcalc" element={<RetirementCalc />} />
        <Route path="/borrowingpowercalc" element={<BorrowingPowerCalc />} />
        <Route path="/novatedleasecalc" element={<NovatedLeaseCalc />} />
        <Route path="/rentvbuycalc" element={<RentVBuyCalc />} />
        <Route path="/savingscalc" element={<SavingsCalc />} />
        <Route path="/healthcalc" element={<HealthCalc />} />
        <Route path="/about" element={<About />} />
      </Routes>
    </BrowserRouter>
  );
}

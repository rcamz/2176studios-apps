import { BrowserRouter, Routes, Route } from 'react-router-dom';
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

export default function App() {
  return (
    <BrowserRouter>
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
      </Routes>
    </BrowserRouter>
  );
}

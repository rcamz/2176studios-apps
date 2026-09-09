import { BrowserRouter, Routes, Route } from 'react-router-dom';
import MortgageCalc from './MortgageCalc.jsx';
import PayTaxCalc from './PayTaxCalc.jsx';
import Home from './Home.jsx';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/mortgagecalc" element={<MortgageCalc />} />
        <Route path="/paytaxcalc" element={<PayTaxCalc />} />
      </Routes>
    </BrowserRouter>
  );
}

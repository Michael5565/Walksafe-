import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import AnnouncementBar from './components/AnnouncementBar';
import Home from './pages/Home';
import ScaffoldingFleets from './pages/ScaffoldingFleets';
import HaulageTradeFleets from './pages/HaulageTradeFleets';
import Pricing from './pages/Pricing';
import FeaturesPage from './pages/Features';
import HowItWorks from './pages/HowItWorks';

export default function App() {
  return (
    <BrowserRouter>
      <AnnouncementBar />
      <Navbar />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/scaffolding-fleets" element={<ScaffoldingFleets />} />
        <Route path="/haulage-trade-fleets" element={<HaulageTradeFleets />} />
        <Route path="/pricing" element={<Pricing />} />
        <Route path="/features" element={<FeaturesPage />} />
        <Route path="/how-it-works" element={<HowItWorks />} />
      </Routes>
      <Footer />
    </BrowserRouter>
  );
}

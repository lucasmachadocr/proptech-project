import { HashRouter, Navigate, Route, Routes } from 'react-router-dom';
import Layout from './components/Layout';
import DemoPage from './pages/demo/DemoPage';
import BriefPage from './pages/client/BriefPage';
import PlanPage from './pages/client/PlanPage';
import ChangePage from './pages/client/ChangePage';
import InvoicePage from './pages/client/InvoicePage';
import ProviderPage from './pages/provider/ProviderPage';
import OnboardingPage from './pages/provider/OnboardingPage';
import EmployeePage from './pages/employee/EmployeePage';
import VerificationPage from './pages/ops/VerificationPage';
import CompliancePage from './pages/ops/CompliancePage';
import LeasesPage from './pages/ops/LeasesPage';
import LedgerPage from './pages/ops/LedgerPage';
import KpiPage from './pages/ops/KpiPage';
import RisksPage from './pages/ops/RisksPage';
import AboutTechPage from './pages/about/AboutTechPage';

export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Navigate to="/demo" replace />} />
          <Route path="demo" element={<DemoPage />} />
          <Route path="client" element={<Navigate to="/client/brief" replace />} />
          <Route path="client/brief" element={<BriefPage />} />
          <Route path="client/plan" element={<PlanPage />} />
          <Route path="client/change" element={<ChangePage />} />
          <Route path="client/invoice" element={<InvoicePage />} />
          <Route path="provider" element={<ProviderPage />} />
          <Route path="provider/onboarding" element={<OnboardingPage />} />
          <Route path="employee" element={<EmployeePage />} />
          <Route path="ops" element={<Navigate to="/ops/verification" replace />} />
          <Route path="ops/verification" element={<VerificationPage />} />
          <Route path="ops/compliance" element={<CompliancePage />} />
          <Route path="ops/leases" element={<LeasesPage />} />
          <Route path="ops/ledger" element={<LedgerPage />} />
          <Route path="ops/kpis" element={<KpiPage />} />
          <Route path="ops/risks" element={<RisksPage />} />
          <Route path="about-tech" element={<AboutTechPage />} />
          <Route path="*" element={<Navigate to="/demo" replace />} />
        </Route>
      </Routes>
    </HashRouter>
  );
}

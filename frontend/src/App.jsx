import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { ChakraProvider, Box } from '@chakra-ui/react';
import { StateProvider } from './contexts/StateContext';
import theme from './theme';
import Sidebar from './components/Sidebar';
import TopNavigation from './components/TopNavigation';
import PageTransition from './components/PageTransition';
import CookieHandler from './components/CookieHandler';
import Dashboard from './pages/Dashboard';
import AccountDetails from './pages/AccountDetails';
import Transfers from './pages/Transfers';
import BillPay from './pages/BillPay';
import CreditCards from './pages/CreditCards';
import Investments from './pages/Investments';
import Loans from './pages/Loans';
import Statements from './pages/Statements';
import Settings from './pages/Settings';
import MobileDeposit from './pages/MobileDeposit';
import SearchResults from './pages/SearchResults';

function AppContent() {
  const location = useLocation();

  return (
    <Box minH="100vh">
      <CookieHandler />
      <Sidebar />
      <TopNavigation />
      <Box
        ml='250px'
        mt="64px"
        minH="calc(100vh - 64px)"
        bg="gray.50"
      >
        <PageTransition locationKey={location.pathname}>
          <Routes location={location}>
            {/* Dashboard / Home */}
            <Route path="/" element={<Dashboard />} />

            {/* Account routes */}
            <Route path="/accounts" element={<Dashboard />} />
            <Route path="/accounts/:id" element={<AccountDetails />} />

            {/* Other routes */}
            <Route path="/transfers" element={<Transfers />} />
            <Route path="/bill-pay" element={<BillPay />} />
            <Route path="/credit-cards" element={<CreditCards />} />
            <Route path="/investments" element={<Investments />} />
            <Route path="/loans" element={<Loans />} />
            <Route path="/statements" element={<Statements />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/mobile-deposit" element={<MobileDeposit />} />
            <Route path="/search" element={<SearchResults />} />

            {/* Catch all - redirect to home */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </PageTransition>
      </Box>
    </Box>
  );
}

function App() {
  return (
    <ChakraProvider theme={theme} toastOptions={{ defaultOptions: { position: 'top-right' } }}>
      <StateProvider>
        <Router>
          <AppContent />
        </Router>
      </StateProvider>
    </ChakraProvider>
  );
}

export default App;

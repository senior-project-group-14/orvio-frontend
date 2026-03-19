import { useState, useEffect } from 'react';
import LoginScreen from './components/LoginScreen';
import RegisterScreen from './components/RegisterScreen';
import Dashboard from './components/Dashboard';
import FridgeList from './components/FridgeList';
import FridgeDetail from './components/FridgeDetail';
import AlertsScreen from './components/AlertsScreen';
import TransactionsScreen from './components/TransactionsScreen';
import AdminManagementScreen from './components/AdminManagementScreen';
import ProductsScreen from './components/ProductsScreen';
import { clearToken, getCurrentUserRole, getToken } from './api/client';

// Hash → Page mapping
const PAGE_MAPPING: Record<string, string> = {
  '': 'Dashboard',
  'dashboard': 'Dashboard',
  'fridges': 'Fridges',
  'fridge': 'FridgeDetail',
  'alerts': 'Alerts',
  'transactions': 'Transactions',
  'products': 'Products',
  'admin': 'Admin Management',
};

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [showRegister, setShowRegister] = useState(false);
  const [currentPage, setCurrentPage] = useState('Dashboard');
  const [selectedFridgeId, setSelectedFridgeId] = useState<string | null>(null);
  const currentUserRole = getCurrentUserRole();
  const isSystemAdmin = currentUserRole === '1' || currentUserRole === 'SYSTEM_ADMIN';

  // Initialize login state from localStorage on mount
  useEffect(() => {
    const token = getToken();
    if (token) {
      setIsLoggedIn(true);
      syncPageFromHash();
    }
  }, []);

  // Listen to hash changes when logged in
  useEffect(() => {
    const handleHashChange = () => {
      if (isLoggedIn) {
        syncPageFromHash();
      }
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [isLoggedIn]);

  const syncPageFromHash = () => {
    const hash = window.location.hash.slice(1); // Remove #
    const [pageHash, fridgeId] = hash.split('/');
    const normalizedPage = PAGE_MAPPING[pageHash.toLowerCase()];
    
    // Geçersiz page ise, URL'yi dashboard'a sıfırla
    if (!normalizedPage) {
      if (hash !== '' && hash !== 'dashboard') {
        window.location.hash = '#dashboard';
      }
      setCurrentPage('Dashboard');
      setSelectedFridgeId(null);
      return;
    }

    if (normalizedPage === 'Admin Management' && !isSystemAdmin) {
      if (window.location.hash !== '#dashboard') {
        window.location.hash = '#dashboard';
      }
      setCurrentPage('Dashboard');
      setSelectedFridgeId(null);
      return;
    }
    
    if (normalizedPage === 'FridgeDetail' && fridgeId) {
      setSelectedFridgeId(fridgeId);
      setCurrentPage('FridgeDetail');
    } else {
      setCurrentPage(normalizedPage);
      setSelectedFridgeId(null);
    }
  };

  const handleLogin = () => {
    setIsLoggedIn(true);
    setShowRegister(false);
    window.location.hash = '#dashboard';
  };

  const handleRegister = () => {
    setShowRegister(false);
  };

  const handleLogout = () => {
    clearToken();
    setIsLoggedIn(false);
    setCurrentPage('Dashboard');
    setSelectedFridgeId(null);
    window.location.hash = '';
  };

  const handleNavigate = (page: string) => {
    if (page === 'Admin Management' && !isSystemAdmin) {
      window.location.hash = '#dashboard';
      return;
    }
    
    // Map page name to hash
    const pageHash = Object.entries(PAGE_MAPPING)
      .find(([_, p]) => p === page)?.[0] || 'dashboard';
    
    window.location.hash = `#${pageHash}`;
  };

  const handleViewFridge = (fridgeId: string) => {
    window.location.hash = `#fridge/${fridgeId}`;
  };

  return (
    <>
      {!isLoggedIn ? (
        showRegister ? (
          <RegisterScreen 
            onRegister={handleRegister} 
            onBackToLogin={() => setShowRegister(false)}
          />
        ) : (
          <LoginScreen 
            onLogin={handleLogin} 
            onNavigateToRegister={() => setShowRegister(true)}
          />
        )
      ) : (
        <>
          {(currentPage === 'Dashboard' || !Object.values(PAGE_MAPPING).includes(currentPage)) && (
            <Dashboard onLogout={handleLogout} onNavigate={handleNavigate} />
          )}
          {currentPage === 'Fridges' && (
            <FridgeList onLogout={handleLogout} onNavigate={handleNavigate} onViewFridge={handleViewFridge} />
          )}
          {currentPage === 'FridgeDetail' && selectedFridgeId && (
            <FridgeDetail onLogout={handleLogout} onNavigate={handleNavigate} fridgeId={selectedFridgeId} />
          )}
          {currentPage === 'Alerts' && (
            <AlertsScreen onLogout={handleLogout} onNavigate={handleNavigate} />
          )}
          {currentPage === 'Transactions' && (
            <TransactionsScreen onLogout={handleLogout} onNavigate={handleNavigate} />
          )}
          {currentPage === 'Products' && (
            <ProductsScreen onLogout={handleLogout} onNavigate={handleNavigate} />
          )}
          {currentPage === 'Admin Management' && isSystemAdmin && (
            <AdminManagementScreen onLogout={handleLogout} onNavigate={handleNavigate} />
          )}
        </>
      )}
    </>
  );
}
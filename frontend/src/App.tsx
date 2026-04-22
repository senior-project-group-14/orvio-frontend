import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import LoginScreen from './components/LoginScreen';
import RegisterScreen from './components/RegisterScreen';
import { clearToken, getCurrentUserRole, getToken, validateToken } from './api/client';

const Dashboard = lazy(() => import('./components/Dashboard'));
const FridgeList = lazy(() => import('./components/FridgeList'));
const FridgeDetail = lazy(() => import('./components/FridgeDetail'));
const AlertsScreen = lazy(() => import('./components/AlertsScreen'));
const TransactionsScreen = lazy(() => import('./components/TransactionsScreen'));
const AdminManagementScreen = lazy(() => import('./components/AdminManagementScreen'));
const ProductsScreen = lazy(() => import('./components/ProductsScreen'));

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
  const [authStatus, setAuthStatus] = useState<'checking' | 'authenticated' | 'unauthenticated'>('checking');
  const [showRegister, setShowRegister] = useState(false);
  const [currentPage, setCurrentPage] = useState('Dashboard');
  const [selectedFridgeId, setSelectedFridgeId] = useState<string | null>(null);
  const currentUserRole = getCurrentUserRole();
  const isSystemAdmin = currentUserRole === '1' || currentUserRole === 'SYSTEM_ADMIN';

  const syncPageFromHash = useCallback(() => {
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
  }, [isSystemAdmin]);

  useEffect(() => {
    let isMounted = true;

    const bootstrapAuth = async () => {
      const token = getToken();

      if (!token) {
        if (isMounted) {
          setAuthStatus('unauthenticated');
        }
        return;
      }

      try {
        await validateToken();
        if (!isMounted) return;

        setAuthStatus('authenticated');
        syncPageFromHash();
      } catch {
        clearToken();
        if (!isMounted) return;

        setShowRegister(false);
        setCurrentPage('Dashboard');
        setSelectedFridgeId(null);
        window.location.hash = '';
        setAuthStatus('unauthenticated');
      }
    };

    bootstrapAuth();

    return () => {
      isMounted = false;
    };
  }, [syncPageFromHash]);

  useEffect(() => {
    const handleHashChange = () => {
      if (authStatus === 'authenticated') {
        syncPageFromHash();
      }
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [authStatus, syncPageFromHash]);

  const handleLogin = useCallback(() => {
    setAuthStatus('authenticated');
    setShowRegister(false);
    window.location.hash = '#dashboard';
  }, []);

  const handleRegister = useCallback(() => {
    setShowRegister(false);
  }, []);

  const handleLogout = useCallback(() => {
    clearToken();
    setAuthStatus('unauthenticated');
    setCurrentPage('Dashboard');
    setSelectedFridgeId(null);
    window.location.hash = '';
  }, []);

  const handleNavigate = useCallback((page: string) => {
    if (page === 'Admin Management' && !isSystemAdmin) {
      window.location.hash = '#dashboard';
      return;
    }
    
    // Map page name to hash
    const pageHash = Object.entries(PAGE_MAPPING)
      .find(([_, p]) => p === page)?.[0] || 'dashboard';
    
    window.location.hash = `#${pageHash}`;
  }, [isSystemAdmin]);

  const handleViewFridge = useCallback((fridgeId: string) => {
    window.location.hash = `#fridge/${fridgeId}`;
  }, []);

  const pageFallback = useMemo(() => <div className="min-h-screen bg-white" />, []);

  if (authStatus === 'checking') {
    return pageFallback;
  }

  return (
    <>
      {authStatus !== 'authenticated' ? (
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
        <Suspense fallback={pageFallback}>
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
        </Suspense>
      )}
    </>
  );
}
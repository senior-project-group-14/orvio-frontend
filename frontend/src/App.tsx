import { useState } from 'react';
import LoginScreen from './components/LoginScreen';
import RegisterScreen from './components/RegisterScreen';
import Dashboard from './components/Dashboard';
import FridgeList from './components/FridgeList';
import FridgeDetail from './components/FridgeDetail';
import AlertsScreen from './components/AlertsScreen';
import TransactionsScreen from './components/TransactionsScreen';
import AdminManagementScreen from './components/AdminManagementScreen';
import ProductsScreen from './components/ProductsScreen';
import { clearToken, getCurrentUserRole } from './api/client';

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [showRegister, setShowRegister] = useState(false);
  const [currentPage, setCurrentPage] = useState('Dashboard');
  const [selectedFridgeId, setSelectedFridgeId] = useState<string | null>(null);
  const currentUserRole = getCurrentUserRole();
  const isSystemAdmin = currentUserRole === '1' || currentUserRole === 'SYSTEM_ADMIN';

  const handleLogin = () => {
    setIsLoggedIn(true);
    setShowRegister(false);
  };

  const handleRegister = () => {
    setShowRegister(false);
  };

  const handleLogout = () => {
    clearToken();
    setIsLoggedIn(false);
    setCurrentPage('Dashboard');
    setSelectedFridgeId(null);
  };

  const handleNavigate = (page: string) => {
    if (page === 'Admin Management' && !isSystemAdmin) {
      setCurrentPage('Dashboard');
      return;
    }
    setCurrentPage(page);
    if (page !== 'FridgeDetail') {
      setSelectedFridgeId(null);
    }
  };

  const handleViewFridge = (fridgeId: string) => {
    setSelectedFridgeId(fridgeId);
    setCurrentPage('FridgeDetail');
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
          {currentPage === 'Dashboard' && (
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
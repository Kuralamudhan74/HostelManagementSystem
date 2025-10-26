import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import LoginPage from './pages/LoginPage';
import AdminDashboard from './pages/admin/AdminDashboard';
import TenantDashboard from './pages/tenant/TenantDashboard';
import RoomsPage from './pages/admin/RoomsPage';
import TenantsPage from './pages/admin/TenantsPage';
import PaymentsPage from './pages/admin/PaymentsPage';
import ExpensesPage from './pages/admin/ExpensesPage';
import ProfilePage from './pages/ProfilePage';
import LoadingSpinner from './components/LoadingSpinner';

const ProtectedRoute: React.FC<{ children: React.ReactNode; requiredRole?: 'admin' | 'tenant' }> = ({ 
  children, 
  requiredRole 
}) => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (requiredRole && user.role !== requiredRole) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

const AppRoutes: React.FC = () => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <LoadingSpinner />;
  }

  return (
    <Routes>
      <Route path="/login" element={!user ? <LoginPage /> : <Navigate to="/" replace />} />
      
      <Route path="/" element={
        <ProtectedRoute>
          {user?.role === 'admin' ? <AdminDashboard /> : <TenantDashboard />}
        </ProtectedRoute>
      } />

      {/* Admin Routes */}
      <Route path="/admin/rooms" element={
        <ProtectedRoute requiredRole="admin">
          <RoomsPage />
        </ProtectedRoute>
      } />
      
      <Route path="/admin/tenants" element={
        <ProtectedRoute requiredRole="admin">
          <TenantsPage />
        </ProtectedRoute>
      } />
      
      <Route path="/admin/payments" element={
        <ProtectedRoute requiredRole="admin">
          <PaymentsPage />
        </ProtectedRoute>
      } />
      
      <Route path="/admin/expenses" element={
        <ProtectedRoute requiredRole="admin">
          <ExpensesPage />
        </ProtectedRoute>
      } />

      {/* Tenant Routes */}
      <Route path="/tenant/dashboard" element={
        <ProtectedRoute requiredRole="tenant">
          <TenantDashboard />
        </ProtectedRoute>
      } />

      {/* Shared Routes */}
      <Route path="/profile" element={
        <ProtectedRoute>
          <ProfilePage />
        </ProtectedRoute>
      } />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <div className="min-h-screen bg-gray-50">
        <AppRoutes />
      </div>
    </AuthProvider>
  );
};

export default App;

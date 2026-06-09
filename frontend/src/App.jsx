import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './hooks/useAuth';
import AppLayout from './components/layout/AppLayout';
import LoginPage from './pages/LoginPage';
import { RegisterPage, DashboardPage, RequestsPage, RequestDetailPage, TeamPage, PolicyPage, ReportsPage } from './pages/RegisterPage';
import SearchPage from './pages/SearchPage';

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000, retry: 1 } },
});

function ProtectedRoute({ children }) {
  const { profile, loading } = useAuth();
  if (loading) return (
    <div className="min-h-screen bg-navy flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-gold border-t-transparent rounded-full animate-spin" />
    </div>
  );
  if (!profile) return <Navigate to="/login" replace />;
  return children;
}

function PublicRoute({ children }) {
  const { profile, loading } = useAuth();
  if (loading) return null;
  if (profile) return <Navigate to="/" replace />;
  return children;
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Toaster position="bottom-right" toastOptions={{
            style: { background:'#1A2D44', color:'#F0EDE6', border:'1px solid #2A4360', fontFamily:'Inter,sans-serif', fontSize:'13px' },
            success: { iconTheme: { primary:'#C9A84C', secondary:'#0D1B2A' } },
          }} />
          <Routes>
            <Route path="/login"    element={<PublicRoute><LoginPage /></PublicRoute>} />
            <Route path="/register" element={<PublicRoute><RegisterPage /></PublicRoute>} />
            <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
              <Route index               element={<DashboardPage />} />
              <Route path="search"       element={<SearchPage />} />
              <Route path="requests"     element={<RequestsPage />} />
              <Route path="requests/:id" element={<RequestDetailPage />} />
              <Route path="team"         element={<TeamPage />} />
              <Route path="policy"       element={<PolicyPage />} />
              <Route path="reports"      element={<ReportsPage />} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}

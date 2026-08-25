import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute } from './components/common/ProtectedRoute';
import { Layout } from './components/common/Layout';
import { Toaster } from 'react-hot-toast';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { FullPageLoader } from './components/common/FullPageLoader';

// Lazy load pages for code splitting
const AuthPage = lazy(() => import('./pages/AuthPage').then(module => ({ default: module.AuthPage })));
const FeedPage = lazy(() => import('./pages/FeedPage').then(module => ({ default: module.FeedPage })));
const AdminPage = lazy(() => import('./pages/AdminPage').then(module => ({ default: module.AdminPage })));
const AdminAnalyticsDashboard = lazy(() => import('./pages/AdminAnalyticsDashboard'));
const AdminAnalysisChartPage = lazy(() => import('./pages/AdminAnalysisChartPage'));
const AnalysisChartPage = lazy(() => import('./pages/AnalysisChartPage').then(module => ({ default: module.AnalysisChartPage })));
const SettingsPage = lazy(() => import('./pages/SettingsPage').then(module => ({ default: module.SettingsPage })));

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <Toaster position="top-right" />
          <Router>
            <Suspense fallback={<FullPageLoader />}>
              <Routes>
                <Route path="/login" element={<AuthPage />} />
                
                <Route element={<Layout />}>
                  <Route path="/" element={
                    <ProtectedRoute>
                      <FeedPage />
                    </ProtectedRoute>
                  } />
                  
                  <Route path="/settings" element={
                    <ProtectedRoute>
                      <SettingsPage />
                    </ProtectedRoute>
                  } />
                  
                  <Route path="/admin" element={
                    <ProtectedRoute allowedRoles={['admin']}>
                      <AdminPage />
                    </ProtectedRoute>
                  } />

                  <Route path="/admin/analytics" element={
                    <ProtectedRoute allowedRoles={['admin']}>
                      <AdminAnalyticsDashboard />
                    </ProtectedRoute>
                  } />

                  <Route path="/admin/analytics/chart/:chartId" element={
                    <ProtectedRoute allowedRoles={['admin']}>
                      <AdminAnalysisChartPage />
                    </ProtectedRoute>
                  } />
                  
                  <Route path="/analysis/:chartId" element={
                    <ProtectedRoute allowedRoles={['govt']}>
                      <AnalysisChartPage />
                    </ProtectedRoute>
                  } />
                  
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Route>
              </Routes>
            </Suspense>
          </Router>
        </AuthProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import './index.css';
import App from './App.jsx';
import { AuthProvider } from './context/AuthContext.jsx';
import ErrorBoundary from './components/ErrorBoundary.jsx';

// Recover the original client-side route after a static host serves 404.html
// for a deep link refresh.
const pendingSpaRedirect = sessionStorage.getItem('spa-redirect');
if (pendingSpaRedirect && pendingSpaRedirect.startsWith('/')) {
  sessionStorage.removeItem('spa-redirect');
  window.history.replaceState(null, '', pendingSpaRedirect);
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 30 * 1000,
    },
  },
});

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <AuthProvider>
            <App />
            <Toaster
              position="top-right"
              toastOptions={{
                style: {
                  background: 'rgba(20, 20, 25, 0.9)',
                  color: '#f5f5f7',
                  border: '1px solid rgba(255,255,255,0.12)',
                },
              }}
            />
          </AuthProvider>
        </BrowserRouter>
      </QueryClientProvider>
    </ErrorBoundary>
  </StrictMode>
);


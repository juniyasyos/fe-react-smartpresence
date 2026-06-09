import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './hooks/useAuth';
import AppRoutes from './routes/AppRoutes';
import { ToastProvider } from './contexts/ToastContext';
import { LogoProvider } from './contexts/LogoContext';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <LogoProvider>
          <ToastProvider>
            <AppRoutes />
          </ToastProvider>
        </LogoProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;

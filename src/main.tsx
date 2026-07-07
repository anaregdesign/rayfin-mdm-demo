import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import App from '@/App';
import { DependenciesProvider } from '@/di/dependencies';
import { AuthProvider } from '@/usecase/auth/AuthContext';
import { createAppDependencies } from '@/infrastructure/config/create-dependencies';

import './main.css';

/**
 * Composition root: build the dependency graph once, then provide it (and the
 * auth view-model bound to the injected auth port) to the component tree.
 */
const deps = createAppDependencies();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <DependenciesProvider value={deps}>
      <AuthProvider authService={deps.auth}>
        <App />
      </AuthProvider>
    </DependenciesProvider>
  </StrictMode>
);

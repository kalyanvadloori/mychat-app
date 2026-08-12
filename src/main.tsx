import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import CssBaseline from '@mui/material/CssBaseline';
import InitColorSchemeScript from '@mui/material/InitColorSchemeScript';
import { ThemeProvider } from '@mui/material/styles';
import '@fontsource-variable/inter';
import App from './App';
import { AuthProvider } from './auth/AuthProvider';
import { theme } from './theme';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <InitColorSchemeScript attribute="class" />
    <ThemeProvider theme={theme} defaultMode="system">
      <CssBaseline />
      <AuthProvider>
        <App />
      </AuthProvider>
    </ThemeProvider>
  </StrictMode>,
);

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './choco/auth';
import { ChocoApp } from './choco/ChocoApp';
import './choco/styles.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider><ChocoApp /></AuthProvider>
    </BrowserRouter>
  </StrictMode>,
);

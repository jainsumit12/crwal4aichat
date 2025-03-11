import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { ThemeProvider } from '@/context/ThemeContext';
import { UserProvider } from '@/context/UserContext';
import { Toaster } from 'react-hot-toast';
import './styles/index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <ThemeProvider>
        <UserProvider>
          <Toaster 
            position="top-right" 
            toastOptions={{
              style: {
                background: '#363636',
                color: '#fff',
                borderRadius: '8px',
                padding: '16px',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
              },
              success: {
                style: {
                  background: '#1E3A8A',
                  color: '#ffffff',
                },
                iconTheme: {
                  primary: '#4ADE80',
                  secondary: '#1E3A8A',
                },
              },
              error: {
                style: {
                  background: '#7F1D1D',
                  color: '#ffffff',
                },
                iconTheme: {
                  primary: '#F87171',
                  secondary: '#7F1D1D',
                },
              },
            }}
          />
          <App />
        </UserProvider>
      </ThemeProvider>
    </BrowserRouter>
  </React.StrictMode>,
); 
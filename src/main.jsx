import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import { seedDemoAccounts } from './lib/authStore';
import './index.css';

// Dev only: creates the `demo` and `applied` logins if they don't exist yet.
// No-ops in a production build.
seedDemoAccounts();

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>
);

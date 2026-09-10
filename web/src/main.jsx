import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './base.css';
// Side effect: marks <html> for a packaged build before anything renders.
import './lib/appTarget.js';
import App from './App.jsx';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>
);

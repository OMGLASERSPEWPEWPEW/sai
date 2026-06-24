import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './index.css';
import { setSupabaseClient } from './lib/gateway';
import { supabase } from './lib/supabase';
import { initMetricsStore } from './lib/metrics-store';

// Wire Supabase client into the AI gateway before anything renders
setSupabaseClient(supabase);
initMetricsStore();

// Register service worker for PWA + push notifications
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js', { updateViaCache: 'none' });
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>,
);

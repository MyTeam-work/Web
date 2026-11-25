import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import '@fontsource/vazirmatn/300.css';
import '@fontsource/vazirmatn/400.css';
import '@fontsource/vazirmatn/500.css';
import '@fontsource/vazirmatn/700.css';
import '@fontsource/vazirmatn/800.css';
import './styles.css';
import App from './App.jsx';
import { loadHome } from './store.js';

document.documentElement.dir = 'rtl';
document.documentElement.lang = 'fa';

const app = window.Telegram && window.Telegram.WebApp;
if (app) {
  try {
    app.ready();
    app.expand();
    if (typeof app.isVersionAtLeast === 'function' && app.isVersionAtLeast('6.1')) {
      app.setHeaderColor('#F5F7FB');
      app.setBackgroundColor('#F5F7FB');
    }
  } catch (e) {
    console.error('Telegram init failed', e && e.message);
  }
}

// Start loading home data (shop name, currency, isAdmin) before the first render.
loadHome();

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <HashRouter>
      <App />
    </HashRouter>
  </StrictMode>,
);

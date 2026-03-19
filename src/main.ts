import { mount } from 'svelte'
import './app.css'
import App from './App.svelte'

// Handle OAuth callback before mounting the app.
// The server redirects to: https://dashboard.mur.run/auth/callback?access_token=...&state=/route
// GitHub Pages 404.html handles this for fresh page loads, but this handles edge cases
// where the SPA is already loaded (e.g. direct navigation).
function handleOAuthCallback(): boolean {
  const path = window.location.pathname;
  if (path === '/auth/callback' || path === '/auth/callback/') {
    const params = new URLSearchParams(window.location.search);
    const accessToken = params.get('access_token');
    const error = params.get('error');
    const targetRoute = params.get('state') || '/';

    if (accessToken) {
      localStorage.setItem('mur-auth-token', accessToken);
      window.location.replace(window.location.origin + '/#' + targetRoute);
      return true;
    } else if (error) {
      window.location.replace(window.location.origin + '/#/?login_error=' + encodeURIComponent(error));
      return true;
    }
  }
  return false;
}

if (!handleOAuthCallback()) {
  mount(App, {
    target: document.getElementById('app')!,
  })
}

// Init keyboard shortcuts
import('./lib/shortcuts').then(m => m.initShortcuts());

// Register service worker for PWA
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/mur-web/sw.js').catch(() => {});
}

import { navigate } from './router';
import { toggleTheme } from './theme';

// Global keyboard shortcuts
export function initShortcuts() {
  window.addEventListener('keydown', (e) => {
    // Don't capture when typing in inputs
    const tag = (e.target as HTMLElement).tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

    // Navigation shortcuts (g + key)
    if (e.key === 'g') {
      // Wait for second key
      const handler = (e2: KeyboardEvent) => {
        window.removeEventListener('keydown', handler);
        switch (e2.key) {
          case 'd': navigate('/'); break;
          case 'p': navigate('/patterns'); break;
          case 'g': navigate('/graph'); break;
          case 'w': navigate('/workflows'); break;
          case 'i': navigate('/import'); break;
          case 's': navigate('/settings'); break;
        }
      };
      window.addEventListener('keydown', handler, { once: true });
      setTimeout(() => window.removeEventListener('keydown', handler), 1000);
      return;
    }

    // Single key shortcuts
    if (e.key === '/' && !e.metaKey && !e.ctrlKey) {
      e.preventDefault();
      // Focus search bar
      const input = document.querySelector('header input[type="text"]') as HTMLInputElement;
      input?.focus();
    }

    if (e.key === 't' && !e.metaKey && !e.ctrlKey) {
      toggleTheme();
    }
  });
}

export type Theme = 'dark' | 'light';

let _theme: Theme = 'dark';
let _listeners: Array<(t: Theme) => void> = [];

export function getTheme(): Theme {
  return _theme;
}

export function setTheme(t: Theme) {
  _theme = t;
  localStorage.setItem('mur-theme', t);
  document.documentElement.classList.toggle('dark', t === 'dark');
  document.documentElement.classList.toggle('light', t === 'light');
  _listeners.forEach(l => l(t));
}

export function toggleTheme() {
  setTheme(_theme === 'dark' ? 'light' : 'dark');
}

export function initTheme() {
  const saved = localStorage.getItem('mur-theme') as Theme | null;
  setTheme(saved || 'dark');
}

export function onThemeChange(fn: (t: Theme) => void): () => void {
  _listeners.push(fn);
  return () => { _listeners = _listeners.filter(l => l !== fn); };
}

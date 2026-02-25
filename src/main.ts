import { mount } from 'svelte'
import './app.css'
import App from './App.svelte'

const app = mount(App, {
  target: document.getElementById('app')!,
})

export default app

// Register service worker for PWA
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/mur-web/sw.js').catch(() => {});
}

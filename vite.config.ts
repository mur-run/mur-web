import { defineConfig } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [svelte(), tailwindcss()],
  // Custom domain (dashboard.mur.run) uses '/', override with MUR_BASE_PATH if needed
  base: process.env.MUR_BASE_PATH || '/',
  build: {
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks: {
          'mock-data': ['./src/lib/mock-data'],
        },
      },
    },
  },
})

import { defineConfig } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [svelte(), tailwindcss()],
  // Use '/mur-web/' for GitHub Pages, '/' for custom domain or mur serve
  base: process.env.MUR_BASE_PATH || '/mur-web/',
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

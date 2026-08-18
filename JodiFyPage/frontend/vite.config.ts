import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({ mode }) => {
  const isElectron = mode === 'electron';
  const envApiUrl = process.env.VITE_API_URL;

  return {
    plugins: [
      react(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['icons/*.png', 'logo.png'],
        manifest: {
          name: 'JodiFy',
          short_name: 'JodiFy',
          description: 'Free Music For Friends — reproductor social con JAM, ecualizador y modo offline.',
          theme_color: '#050505',
          background_color: '#050507',
          display: 'standalone',
          orientation: 'any',
          start_url: '/',
          scope: '/',
          lang: 'es',
          categories: ['music', 'entertainment', 'social'],
          icons: [
            { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
            { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
            { src: '/icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
          ],
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,woff2,woff,ttf,png,svg,ico}'],
          navigateFallback: '/index.html',
          navigateFallbackDenylist: [/^\/api\//],
          cleanupOutdatedCaches: true,
          maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
        },
      }),
    ],
    base: isElectron ? './' : '/',
    // La URL del backend (Render) se inyecta en build mediante VITE_API_URL
    // (.env.electron, .env.production o variable de entorno del pipeline).
    define: isElectron && envApiUrl
      ? { 'import.meta.env.VITE_API_URL': JSON.stringify(envApiUrl.replace(/\/+$/, '')) }
      : undefined,
    server: {
      port: 5173,
      host: true,
      proxy: {
        '/api': 'http://127.0.0.1:8000',
      },
    },
    preview: {
      port: 4173,
      host: true,
      proxy: {
        '/api': 'http://127.0.0.1:8000',
      },
    },
    build: {
      outDir: isElectron ? 'dist-electron' : 'dist',
      target: 'es2020',
    },
    test: {
      environment: 'jsdom',
      setupFiles: ['./src/test/setup.ts'],
      globals: true,
    },
  };
});
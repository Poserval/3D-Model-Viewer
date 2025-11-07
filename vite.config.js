import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico}']
      },
      manifest: {
        name: '3D Model Viewer',
        short_name: '3DViewer',
        description: 'Минималистичный просмотрщик 3D моделей',
        theme_color: '#007AFF',
        background_color: '#FFFFFF',
        display: 'standalone',
        icons: [
          {
            src: 'src/icons/icon-192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'src/icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      }
    })
  ],
  server: {
    host: true,
    port: 3000
  },
  build: {
    outDir: 'dist',
    sourcemap: false
  }
});

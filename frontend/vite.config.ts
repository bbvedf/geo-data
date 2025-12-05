// frontend/vite.config.ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 5173,
    watch: {
      usePolling: true
    }
  },
  // AÑADE ESTO:
  optimizeDeps: {
    include: ['leaflet', 'leaflet.markercluster']
  },
  build: {
    commonjsOptions: {
      include: [/leaflet/, /leaflet.markercluster/, /node_modules/]
    }
  }
})
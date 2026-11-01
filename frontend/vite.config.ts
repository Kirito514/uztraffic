import path from 'node:path'
import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

/* Dev serverda /dashboard va /dashboard/<sahifa> → dashboard.html (prod’da buni FastAPI qiladi) */
const dashboardRoute = (): Plugin => ({
  name: 'oqim-dashboard-route',
  configureServer(server) {
    server.middlewares.use((req, _res, next) => {
      const m = req.url?.match(/^\/dashboard(?:\/[a-z-]+)?\/?(\?.*)?$/)
      if (m) req.url = `/dashboard.html${m[1] ?? ''}`
      next()
    })
  },
})

export default defineConfig({
  plugins: [react(), tailwindcss(), dashboardRoute()],
  build: {
    assetsDir: '_app', // FastAPI'dagi eski /assets bilan to‘qnashmasin
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, 'index.html'),
        dashboard: path.resolve(__dirname, 'dashboard.html'),
      },
    },
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:8000',
      '/ws': { target: 'ws://localhost:8000', ws: true },
    },
  },
})

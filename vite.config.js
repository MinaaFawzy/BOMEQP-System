import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'http://dev.bomeqp.com',
        changeOrigin: true,
        secure: false,
      },
    },
  },
  optimizeDeps: {
    include: ['fabric'],
    esbuildOptions: {
      target: 'esnext',
    },
  },
  resolve: {
    alias: {
      // Handle fabric.js CommonJS export
    },
  },
})

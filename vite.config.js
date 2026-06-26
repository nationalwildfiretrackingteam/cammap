import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api/cameras': {
        target: 'https://www.udottraffic.utah.gov',
        changeOrigin: true,
        rewrite: () => '/api/v2/get/cameras',
      },
    },
  },
})

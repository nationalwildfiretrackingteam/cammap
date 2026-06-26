import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api/cctv': {
        target: 'https://prod-ut.ibi511.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/cctv/, '/cctv'),
      },
    },
  },
})

import { defineConfig, PluginOption } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react() as PluginOption,
    tailwindcss() as PluginOption,
    
  ],
  server: { port: 5173, proxy: { '/api': { target: 'http://localhost:3001', changeOrigin: true } } }
})

import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite' // 加上這行

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(), // 加上這行
  ],
  //base: '/JJBS/' // 如果要部署到 GitHub Pages，記得加上這行
})

import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import transformTsMorph from "./plugins/transform-ts-morph";

export default defineConfig({
  build: {
    minify: false
  },
  optimizeDeps: {
    include: ['src/**/*.{ts,tsx}'],
    entries: ['src/**/*.{ts,tsx}']
  },
  plugins: [
    transformTsMorph(),
    react()
  ],
})

import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import transformTsMorph from "./plugins/transform-ts-morph";

export default defineConfig({
  build: {
    minify: false,
    rollupOptions: {
      input: {
        index: "index.html",
      }
    }
  },
  plugins: [
    transformTsMorph(),
    react()
  ],
})

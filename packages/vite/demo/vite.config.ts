import {defineConfig} from 'vite'
import react from '@vitejs/plugin-react'
import transformTsMorph from "./plugins/transform-ts-morph";

export default defineConfig({
  build: {
    minify: false,
    rollupOptions: {
      external: ['react', 'react-dom'],
      input: {
        index: "src/.limitless/main.tsx",
        // index: "index.html",
      },
      output: {
        globals: {
          react: 'React',
          'react-dom': 'ReactDOM',
        },
        format: "esm"
      }
    }
  },
  plugins: [
    transformTsMorph(),
    react()
  ],
})

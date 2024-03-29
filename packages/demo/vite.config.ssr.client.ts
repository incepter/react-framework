import {defineConfig} from 'vite'
import react from '@vitejs/plugin-react'
import transformTsMorph from "./plugins/transform-ts-morph";

export default defineConfig({
  build: {
    ssr: true,
    minify: false,
    rollupOptions: {
      external: [
        'react',
        'react-dom',
        'react-dom/server',
        'express'
      ],
      preserveEntrySignatures: "strict",
      input: {
        server: "src/.limitless/server.js",
        client: "index.html",
      },
      output: {
        // inlineDynamicImports: false,
        globals: {
          react: 'React',
          express: 'express',
          'react-dom': 'ReactDOM',
          'react-dom/server': 'ReactDOMServer',
        },
        // format: "esm"
      }
    },
  },
  plugins: [
    transformTsMorph(),
    react()
  ],
})

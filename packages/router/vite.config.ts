import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import routerPlugin from "./src/router-plugin";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    routerPlugin(),
  ],
})

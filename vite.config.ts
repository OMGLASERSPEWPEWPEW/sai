import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import pkg from './package.json' with { type: 'json' }

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: { port: 5203, strictPort: true },
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
    __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
  },
})

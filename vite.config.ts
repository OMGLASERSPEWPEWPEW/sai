import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { readFileSync, writeFileSync } from 'fs'
import { resolve } from 'path'
import { createHash } from 'crypto'
import pkg from './package.json' with { type: 'json' }

function swVersionPlugin(): Plugin {
  return {
    name: 'sw-version',
    writeBundle() {
      const swPath = resolve('dist', 'sw.js');
      try {
        let content = readFileSync(swPath, 'utf-8');
        const hash = createHash('md5').update(Date.now().toString()).digest('hex').slice(0, 8);
        content = content.replace('__SW_VERSION__', hash);
        writeFileSync(swPath, content);
      } catch {
        // sw.js may not exist in dev
      }
    },
  };
}

export default defineConfig({
  plugins: [react(), tailwindcss(), swVersionPlugin()],
  server: { port: 5203, strictPort: true },
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
    __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
  },
})

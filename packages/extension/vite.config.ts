import { defineConfig } from 'vite'
import { resolve } from 'path'
import { copyFileSync, mkdirSync } from 'fs'

export default defineConfig({
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        'background/service-worker': resolve(__dirname, 'background/service-worker.ts'),
        'content/content': resolve(__dirname, 'content/content.ts'),
        'content/auth-bridge': resolve(__dirname, 'content/auth-bridge.ts'),
        'popup/popup': resolve(__dirname, 'popup/popup.ts'),
      },
      output: {
        entryFileNames: '[name].js',
        chunkFileNames: 'chunks/[name]-[hash].js',
        assetFileNames: '[name].[ext]',
      },
    },
  },
  plugins: [
    {
      name: 'copy-content-css',
      closeBundle() {
        mkdirSync(resolve(__dirname, 'dist/content'), { recursive: true })
        copyFileSync(
          resolve(__dirname, 'content/content.css'),
          resolve(__dirname, 'dist/content/content.css'),
        )
      },
    },
  ],
})

import { defineConfig } from 'vite'
import { resolve } from 'path'
import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from 'fs'

// API base is injected at build time so the same source can target prod or localhost.
// Defaults to production; override with INKMARK_EXT_API_URL for local development, e.g.
//   INKMARK_EXT_API_URL=http://localhost:3000 pnpm --filter @inkmark/extension build
const PROD_API_BASE = 'https://inkmark.flaplabs.xyz'
const apiBase = process.env.INKMARK_EXT_API_URL ?? PROD_API_BASE
const isDevBuild = apiBase !== PROD_API_BASE

// The auth-bridge content script only listens on the web app's origin. In dev the web app
// runs on localhost, so a dev build must widen the manifest match to include it.
// Override the dev web origin with INKMARK_EXT_WEB_URL (default: http://localhost:5173).
const DEV_WEB_MATCH = `${process.env.INKMARK_EXT_WEB_URL ?? 'http://localhost:5173'}/*`

export default defineConfig({
  define: {
    __API_BASE__: JSON.stringify(apiBase),
  },
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
    {
      // Dev builds only: rewrite the committed manifest.json in place so the auth-bridge
      // also runs on the local web origin. Default (production) builds never touch it, so
      // the checked-in manifest and prod build output stay identical. Do not commit the
      // dev-patched manifest.
      name: 'inkmark-dev-manifest',
      apply: 'build',
      closeBundle() {
        if (!isDevBuild) return
        const manifestPath = resolve(__dirname, 'manifest.json')
        const manifest = JSON.parse(readFileSync(manifestPath, 'utf8')) as {
          content_scripts?: Array<{ js?: string[]; matches?: string[] }>
        }
        const authBridge = manifest.content_scripts?.find((cs) =>
          cs.js?.some((f) => f.includes('auth-bridge')),
        )
        if (authBridge?.matches && !authBridge.matches.includes(DEV_WEB_MATCH)) {
          authBridge.matches.push(DEV_WEB_MATCH)
          writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`)
          // eslint-disable-next-line no-console
          console.log(`[inkmark] dev manifest: added auth-bridge match ${DEV_WEB_MATCH}`)
        }
      },
    },
  ],
})

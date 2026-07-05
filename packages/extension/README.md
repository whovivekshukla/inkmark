# Inkmark browser extension

The manifest references compiled files under `dist/`. That folder is **not** in git (see root `.gitignore`), so you must build before loading the extension in Chrome.

From the repo root:

```bash
pnpm --filter @inkmark/extension build
```

While developing:

```bash
pnpm --filter @inkmark/extension dev
```

(`vite build --watch` — reload the extension in `chrome://extensions` after each rebuild.)

**Load unpacked:** Extensions → Developer mode → Load unpacked → choose this directory (`packages/extension`), not the repo root.

## Targeting a local API

By default the extension talks to production (`https://inkmark.flaplabs.xyz`). The API base is
injected at build time via Vite `define`, so point it at a local API with `INKMARK_EXT_API_URL`:

```bash
INKMARK_EXT_API_URL=http://localhost:3000 pnpm --filter @inkmark/extension build
```

A dev build (any non-production `INKMARK_EXT_API_URL`) also patches `manifest.json` in place to
add the local web origin to the auth-bridge content script match (default `http://localhost:5173/*`,
override with `INKMARK_EXT_WEB_URL`). **Do not commit the dev-patched `manifest.json`** — run
`git checkout packages/extension/manifest.json` before committing. The default (production) build
never touches the manifest and produces identical output to today's.

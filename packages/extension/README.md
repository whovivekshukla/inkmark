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

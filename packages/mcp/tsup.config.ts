import { defineConfig } from 'tsup'

// Bundles the MCP server into a single self-contained ESM file so it can be
// published to npm and run via `npx -y @inkmark/mcp` without workspace resolution.
// @inkmark/shared is types + one small const object, so we inline it (noExternal);
// the SDK and zod stay as real npm dependencies.
export default defineConfig({
  // `index.ts` is the stdio server (published to npm, run via npx); `http.ts` is
  // the streamable-HTTP server we host ourselves at /mcp.
  entry: ['src/index.ts', 'src/http.ts'],
  format: ['esm'],
  target: 'node18',
  outDir: 'dist',
  clean: true,
  noExternal: ['@inkmark/shared'],
  external: ['@modelcontextprotocol/sdk', 'zod', 'express'],
  // tsup preserves the entry file's `#!/usr/bin/env node` shebang and marks the
  // output executable, so the published `bin` runs directly.
})

import { defineConfig } from 'tsup'

// Bundles the MCP server into a single self-contained ESM file so it can be
// published to npm and run via `npx -y @inkmark/mcp` without workspace resolution.
// @inkmark/shared is types + one small const object, so we inline it (noExternal);
// the SDK and zod stay as real npm dependencies.
export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  target: 'node18',
  outDir: 'dist',
  clean: true,
  noExternal: ['@inkmark/shared'],
  external: ['@modelcontextprotocol/sdk', 'zod'],
  // tsup preserves the entry file's `#!/usr/bin/env node` shebang and marks the
  // output executable, so the published `bin` runs directly.
})

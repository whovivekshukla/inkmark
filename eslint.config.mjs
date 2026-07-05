import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import js from '@eslint/js'
import tseslint from 'typescript-eslint'
import reactHooks from 'eslint-plugin-react-hooks'
import globals from 'globals'

// import.meta.dirname is Node 20.11+; derive it manually so lint also runs on older local Node.
const rootDir = dirname(fileURLToPath(import.meta.url))

const TS_FILES = ['**/*.ts', '**/*.tsx', '**/*.mts', '**/*.cts']

export default tseslint.config(
  {
    ignores: [
      '**/dist/**',
      '**/node_modules/**',
      '**/*.config.js',
      '**/*.config.mjs',
      '**/*.config.ts',
      'eslint.config.mjs',
      'packages/api/prisma/**',
    ],
  },

  js.configs.recommended,
  ...tseslint.configs.recommended,

  // Type-aware linting (TS files only) so no-floating-promises has type information.
  // projectService auto-resolves each file's nearest tsconfig across the monorepo.
  {
    files: TS_FILES,
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: rootDir,
      },
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-floating-promises': 'error',
      // Honour the `_`-prefixed "intentionally unused" convention used across the codebase.
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' },
      ],
    },
  },

  // API: server code — never console.log, use the Winston logger.
  {
    files: ['packages/api/src/**/*.ts'],
    languageOptions: { globals: { ...globals.node } },
    rules: { 'no-console': 'error' },
  },

  // MCP: a stdio server that legitimately logs to stderr via console.error.
  {
    files: ['packages/mcp/src/**/*.ts'],
    languageOptions: { globals: { ...globals.node } },
    rules: { 'no-console': ['error', { allow: ['error'] }] },
  },

  // Web: React SPA in the browser.
  {
    files: ['packages/web/src/**/*.{ts,tsx}'],
    languageOptions: { globals: { ...globals.browser } },
    plugins: { 'react-hooks': reactHooks },
    rules: {
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
    },
  },

  // Extension: browser globals plus the chrome.* extension APIs.
  {
    files: ['packages/extension/**/*.ts'],
    languageOptions: { globals: { ...globals.browser, chrome: 'readonly' } },
  },
)

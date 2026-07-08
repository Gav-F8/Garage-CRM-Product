import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  // dist = build output; functions/ and firestore-tests/ are Node code (their
  // own runtime/globals), linted separately from the browser app if at all.
  // .claude/worktrees are separate git worktrees, not part of this app.
  globalIgnores(['dist', 'dev-dist', 'functions', 'firestore-tests', '.claude']),
  {
    files: ['**/*.{js,jsx,ts,tsx}'],
    extends: [
      js.configs.recommended,
      ...tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
      parserOptions: {
        ecmaVersion: 'latest',
        ecmaFeatures: { jsx: true },
        sourceType: 'module',
      },
    },
    rules: {
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': ['error', { varsIgnorePattern: '^[A-Z_]' }],
      // Transitional: the conversion leans on `any` in a few Firestore-boundary
      // spots; revisit once the app-wide types settle.
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },
])

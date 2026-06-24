import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: {
    alias: {
      '~': '.',
    },
  },
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    reporters: ['verbose'],
    // ponytail: tsconfig.test.json évite de générer .nuxt/ dans le worktree
    tsconfig: './tsconfig.test.json',
  },
})

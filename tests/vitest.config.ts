import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    testTimeout: 20000,
    hookTimeout: 20000,
    // run serially — tests share live DB state and depend on ordering
    pool: 'forks',
    poolOptions: { forks: { singleFork: true } },
    sequence: { concurrent: false },
    reporter: 'verbose',
  },
})

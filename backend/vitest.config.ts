/// <reference types="vitest" />
import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'src/**/*.d.ts',
        '**/*.config.*',
        'prisma/**'
      ]
    },
    // Usar tsx para resolver mejor los módulos TypeScript ESM
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: true
      }
    }
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    },
    extensions: ['.ts', '.js', '.json']
  },
  esbuild: {
    target: 'node18',
    format: 'esm'
  },
  server: {
    deps: {
      inline: ['@prisma/client']
    }
  }
})


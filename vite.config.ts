import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: { port: 5173, host: true },
  build: { target: 'es2020', assetsInlineLimit: 0 },
  test: {
    include: ['test/**/*.test.ts'],
    environment: 'node',
  },
})

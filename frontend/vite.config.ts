import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      // Amazon Cognito Identity JSのポリフィル
      'buffer': 'buffer',
      'process': 'process/browser',
    },
  },
  define: {
    // グローバル変数のポリフィル
    'global': 'globalThis',
    'process.env': {},
  },
  server: {
    port: 5173,
    open: true,
  },
})

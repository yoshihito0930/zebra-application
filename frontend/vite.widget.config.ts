import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// 外部サイト埋め込み用ウィジェットのビルド設定。
// SPA (vite.config.ts) とは別の outDir (dist-widget) に IIFE バンドルを出力する。
// React/Chakra など全依存をバンドルし、ホストは <script>/<link> を置くだけで動く。
export default defineConfig({
  plugins: [react()],
  // ウィジェットは public/ アセット(favicon.svg, icons.svg)を取り込まない。
  // Vite はデフォルトで publicDir 配下を outDir(dist-widget) に丸ごとコピーするため、
  // ウィジェット配信に不要な SVG が混入する。これを無効化して zebra-widget.js のみ出力する。
  publicDir: false,
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      // Amazon Cognito Identity JSのポリフィル（SPA と同一）
      'buffer': 'buffer',
      'process': 'process/browser',
    },
  },
  define: {
    'global': 'globalThis',
    'process.env': {},
  },
  build: {
    outDir: 'dist-widget',
    emptyOutDir: true,
    target: 'es2019',
    minify: true,
    sourcemap: true,
    cssCodeSplit: false,
    lib: {
      entry: path.resolve(__dirname, 'src/widget/embed.tsx'),
      name: 'ZebraReservationWidget',
      formats: ['iife'],
      fileName: () => 'zebra-widget.js',
    },
    rollupOptions: {
      // 全依存をバンドルする（ホストは何も提供しない）
      external: [],
      output: {
        // CSS を単一ファイル zebra-widget.css に固定
        assetFileNames: (assetInfo) =>
          assetInfo.name && assetInfo.name.endsWith('.css')
            ? 'zebra-widget.css'
            : 'assets/[name]-[hash][extname]',
        // IIFE 内に動的 import を含めず単一ファイルに収める（framer-motion 対策）
        inlineDynamicImports: true,
      },
    },
  },
})

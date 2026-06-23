import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import analyzer from 'vite-bundle-analyzer'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react({
      babel: {
        plugins: [['babel-plugin-react-compiler']],
      },
    }),
    analyzer({
      analyzerMode: 'static',
      openAnalyzer: false,
    }),
  ],
  server: {
    port: 3000,
    strictPort: true,
  },
  build: {
    target: 'esnext',
    minify: 'esbuild',
    cssMinify: 'esbuild',
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'firebase': ['firebase/app', 'firebase/auth', 'firebase/firestore', 'firebase/database'],
          'monaco-editor': ['@monaco-editor/react'],
          'ui-vendor': ['framer-motion', 'react-icons', 'clsx', 'tailwind-merge', 'react-hot-toast'],
          'three-vendor': ['three', 'postprocessing'],
        },
      },
    },
  },
  esbuild: {
    drop: ['console', 'debugger'],
  },
})

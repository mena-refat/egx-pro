import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '../../', '');
  const prod = mode === 'production';
  return {
    plugins: [react(), tailwindcss()],
    test: {
      globals: true,
      environment: 'jsdom',
      setupFiles: ['./src/test/setup.ts'],
      coverage: {
        provider: 'v8',
        reporter: ['text', 'html'],
        exclude: [
          'node_modules/',
          'src/test/',
          '**/*.d.ts',
          'prisma/',
          'public/',
        ],
        thresholds: {
          global: {
            branches: 50,
            functions: 50,
            lines: 50,
            statements: 50,
          },
        },
      },
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    optimizeDeps: {
      exclude: ['@sentry/react'],
    },
    build: {
      target: 'es2020',
      esbuild: prod ? { drop: ['console', 'debugger'], legalComments: 'none' } : undefined,
      rollupOptions: {
        output: {
          // Only declare chunks that are truly in the EAGER import graph.
          // Anything listed here gets a <link rel="modulepreload"> in the built HTML,
          // forcing the browser to download AND parse it on every page load.
          // framer-motion, @sentry/react, react-hook-form/zod are all lazy-only →
          // omitting them here lets Rollup auto-split them without eager preloading.
          manualChunks: {
            'vendor-router': ['react-router-dom'],
            'vendor-i18n': ['i18next', 'react-i18next', 'i18next-http-backend', 'i18next-browser-languagedetector'],
            'vendor-charts': ['recharts', 'lightweight-charts'],
            'egx-stocks': ['./src/lib/egxStocks'],
          },
        },
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
    },
  };
});

import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  build: {
    outDir: '../../dist/admin',
    emptyOutDir: false,
    target: 'es2020',
    cssMinify: true,
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react':  ['react', 'react-dom'],
          'vendor-router': ['react-router-dom'],
          'vendor-i18n':   ['i18next', 'react-i18next', 'i18next-browser-languagedetector'],
          'vendor-http':   ['axios'],
          'vendor-icons':  ['lucide-react'],
        },
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
    dedupe: ['react', 'react-dom'],
  },
  optimizeDeps: {
    include: ['qrcode'],
  },
  server: {
    port: 3001,
    proxy: {
      '/api': 'http://localhost:3000',
    },
  },
  preview: {
    port: 4173,
    headers: {
      // Content Security Policy — admin portal never calls external AI/CDN endpoints
      'Content-Security-Policy': [
        "default-src 'self'",
        "script-src 'self'",
        "style-src 'self' 'unsafe-inline'",
        "img-src 'self' data: blob:",
        "connect-src 'self'",
        "font-src 'self'",
        "frame-ancestors 'none'",
        "form-action 'self'",
        "base-uri 'self'",
        "object-src 'none'",
      ].join('; '),
      // Prevent embedding in iframes (clickjacking)
      'X-Frame-Options': 'DENY',
      // Prevent MIME-type sniffing
      'X-Content-Type-Options': 'nosniff',
      // Don't leak admin URL in Referer headers
      'Referrer-Policy': 'no-referrer',
      // Restrict browser APIs the page can use
      'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=(), usb=(), accelerometer=(), gyroscope=(), magnetometer=()',
      // Prevent cross-origin window references (e.g. window.opener attacks)
      'Cross-Origin-Opener-Policy': 'same-origin',
      // Prevent Adobe Flash / Silverlight cross-domain requests
      'X-Permitted-Cross-Domain-Policies': 'none',
      // Force HTTPS (preview is local-only, but mirrors production config)
      'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload',
      // Don't cache admin HTML (sensitive session state)
      'Cache-Control': 'no-store',
    },
  },
});

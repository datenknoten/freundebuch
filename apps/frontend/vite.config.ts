import { readFileSync } from 'node:fs';
import { sentrySvelteKit } from '@sentry/sveltekit';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vitest/config';

const pkg = JSON.parse(readFileSync('./package.json', 'utf-8'));

export default defineConfig({
  plugins: [
    sentrySvelteKit({
      autoUploadSourceMaps: !!process.env.SENTRY_AUTH_TOKEN,
      adapter: 'other', // Using static adapter
      sourceMapsUploadOptions: {
        org: 'datenknoten-it-nx',
        project: 'freundebuch-frontend',
      },
    }),
    sveltekit(),
  ],
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  build: {
    // Generate sourcemaps for Sentry (hidden = not referenced in JS files)
    sourcemap: 'hidden',
    // Ensure content hashes are included in filenames for cache busting
    rollupOptions: {
      output: {
        // Include hash in entry filenames
        entryFileNames: 'assets/[name]-[hash].js',
        // Include hash in chunk filenames
        chunkFileNames: 'assets/[name]-[hash].js',
        // Include hash in asset filenames (CSS, images, etc.)
        assetFileNames: 'assets/[name]-[hash][extname]',
      },
    },
  },
  test: {
    include: ['src/**/*.{test,spec}.{js,ts}'],
    globals: true,
    environment: 'jsdom',
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
});

import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [sveltekit()],
  build: {
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

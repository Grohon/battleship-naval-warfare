import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => ({
  // Relative asset paths in the production build so dist/ can be served from
  // any subfolder (e.g. https://battleship-naval-warfare.test/dist/ via Apache).
  // The dev server keeps absolute paths.
  base: mode === 'production' ? './' : '/',
  server: {
    port: 3000,
    host: '0.0.0.0',
  },
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    }
  }
}));

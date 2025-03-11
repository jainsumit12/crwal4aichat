import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    // Ignore TypeScript errors during build
    sourcemap: true,
    commonjsOptions: {
      transformMixedEsModules: true,
    },
    // Skip type checking during build
    typescript: {
      noEmit: false,
      noUnusedLocals: false,
      noUnusedParameters: false,
    },
  },
}); 
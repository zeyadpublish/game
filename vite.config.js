import { defineConfig } from 'vite';

export default defineConfig({
  base: process.env.VITE_BASE_URL === 'github' ? '/warzone-tactical-fps/' : './',
  build: { outDir: 'dist', sourcemap: true },
});

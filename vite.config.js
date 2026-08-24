import { defineConfig } from 'vite';

const repositoryName = process.env.GITHUB_REPOSITORY?.split('/')[1] || 'game';

export default defineConfig({
  // GitHub Pages serves project sites below /<repository-name>/.
  base: process.env.VITE_BASE_URL === 'github' ? `/${repositoryName}/` : './',
  build: { outDir: 'dist', sourcemap: true },
});

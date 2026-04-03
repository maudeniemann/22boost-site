import { defineConfig } from 'astro/config';

export default defineConfig({
  vite: {
    css: {
      postcss: './postcss.config.cjs',
    },
  },
});

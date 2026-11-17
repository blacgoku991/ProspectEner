import { defineConfig } from 'astro/config';

// Site 100 % statique : `npm run build` produit le dossier dist/.
export default defineConfig({
  devToolbar: { enabled: false },
  server: { host: true },
  vite: {
    build: { chunkSizeWarningLimit: 900 },
  },
});

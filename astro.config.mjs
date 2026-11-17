import { defineConfig } from 'astro/config';

// Adresse publique du site : sert aux aperçus de lien (Discord, réseaux) et à l'URL canonique.
// SITE_URL si elle est définie, sinon le domaine de production fourni par Vercel.
const site =
  process.env.SITE_URL ||
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : undefined);

// Site 100 % statique : `npm run build` produit le dossier dist/.
export default defineConfig({
  site,
  devToolbar: { enabled: false },
  server: { host: true },
  vite: {
    build: { chunkSizeWarningLimit: 900 },
  },
});

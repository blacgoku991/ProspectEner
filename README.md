# Elyra

Site vitrine du serveur **Elyra** (GTA RP francophone sur FiveM) : nuit, néons, 3D temps réel et animations au défilement.

Site 100 % statique, construit avec [Astro](https://astro.build), [three.js](https://threejs.org) (ville et étoile 3D), [GSAP](https://gsap.com) et [Lenis](https://lenis.darkroom.engineering) (défilement fluide).

## Démarrer

```bash
npm install
npm run dev      # http://localhost:4321
npm run build    # génère le dossier dist/
npm run preview  # sert dist/ en local
```

Node 20 ou plus récent.

## Pages

| Adresse | Contenu |
| --- | --- |
| `/` | Accueil : ville 3D, manifeste, points forts, légal / illégal, secteurs, étapes |
| `/metiers` | Entreprises et institutions par secteur, filtre par recrutement |
| `/factions` | Groupes illégaux par type, statuts, création de faction |
| `/reglement` | Vue d'ensemble des trois tomes |
| `/reglement/global`, `/legal`, `/illegal` | Règlements : recherche, filtre par gravité, sommaire, lien direct par règle |
| `/rejoindre` | Guide d'arrivée en cinq étapes |
| `/boutique` | Vitrine : abonnements, Éclats, passes |
| `/aide` | Raccourcis, questions fréquentes, support |
| `/mentions-legales` | Éditeur, hébergeur, confidentialité |

## Ce qu'il faut régler avant la mise en ligne

Tout est dans **`src/config/site.ts`** :

- `links.discord`, `links.fivem` : tant qu'ils sont vides, les boutons « Rejoindre » mènent à la page `/rejoindre`.
- `links.store`, `links.wiki`, réseaux sociaux : un lien vide masque le bouton correspondant.
- `cfxCode` : le code cfx.re du serveur. Renseigné, il affiche le nombre de joueurs en direct.
- `legal` : éditeur, contact, hébergeur (page Mentions légales).

## Modifier le contenu

Les textes vivent dans `src/data/`, sans toucher au design :

| Fichier | Contenu |
| --- | --- |
| `metiers.ts` | Secteurs, entreprises, statuts de recrutement |
| `factions.ts` | Types de groupes, factions, territoires |
| `reglement/global.ts`, `legal.ts`, `illegal.ts` | Chapitres, sections, règles (`level: 'critique'` ou `'importante'`), lexique |
| `boutique.ts` | Paliers, packs, passes, questions fréquentes |

Les noms d'entreprises et de factions, les règles et les offres de la boutique sont une **base de départ** à adapter au serveur. Les règles sont numérotées automatiquement (ex. `G·03.07`).

Les textes de l'accueil, de l'aide et du guide d'arrivée sont dans leurs pages (`src/pages/`).

## Organisation

```
src/
  config/site.ts      Liens, navigation, mentions légales
  data/               Contenus (métiers, factions, règlements, boutique)
  layouts/Base.astro  Gabarit commun : en-tête, pied de page, voile de transition
  components/         En-tête, pied de page, boutons, icônes, en-tête de page 3D, FAQ
  pages/              Une page par fichier
  scripts/
    app.ts            Défilement fluide, transitions, apparitions, curseur, inclinaison 3D
    city.ts           Ville procédurale de l'accueil (three.js)
    crystal.ts        Étoile 3D des pages intérieures (three.js)
    rulebook.ts       Recherche et filtres des règlements
  styles/global.css   Couleurs, typographie, composants partagés
```

Les couleurs et réglages généraux sont en tête de `src/styles/global.css`.

## Accessibilité et performances

- Les animations se coupent quand le système demande moins de mouvement (`prefers-reduced-motion`) : la 3D affiche alors une image fixe.
- Sans JavaScript, tout le contenu reste lisible.
- La 3D se met en pause hors écran et allège son rendu sur les machines modestes.
- Aucun traceur, aucun cookie de suivi ; les polices sont servies par le site.

## Mise en ligne

Le dossier `dist/` se dépose sur n'importe quel hébergeur statique. Sur Vercel, le dépôt se déploie tel quel (`vercel.json` fourni).

L'adresse publique du site (aperçus de lien, URL canonique) est lue dans la variable d'environnement `SITE_URL`, par exemple `https://elyra.fr`. Sur Vercel, elle est déduite automatiquement du domaine de production.

---

Elyra est un projet communautaire indépendant, sans lien avec Rockstar Games, Take-Two Interactive ni Cfx.re.

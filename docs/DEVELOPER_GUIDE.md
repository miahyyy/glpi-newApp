# Guide développeur — Prise en main rapide

Objectif

- Permettre à un nouveau développeur de cloner le projet, lancer l'environnement local, comprendre où ajouter/modifier du code et comment étendre les fonctionnalités.

Installation et exécution

1. Installer les dépendances:

```bash
npm install
```

2. Lancer l'application en développement (front):

```bash
npm run dev
```

3. Lancer le serveur Express local (API / import / administration):

```bash
npm run server
```

Le front et le serveur sont séparés: Vite s'occupe du front (hot-reload), `server.js` expose des routes utiles (/api/import, /api/glpi/\*).

Fichier `.env` (exemple)

```
VITE_GLPI_API_BASE=http://your-glpi-host/apirest.php
VITE_GLPI_APP_TOKEN=your_app_token
VITE_GLPI_USER=admin
VITE_GLPI_PASSWORD=secret
VITE_FRONTEND_ORIGIN=http://localhost:5173
```

Arborescence et responsabilités (rapide)

- `src/` — Front React. `src/main.jsx` démarre l'application, `src/App.jsx` gère la navigation interne.
- `src/components/` — petits composants réutilisables (ex: `TicketsList.jsx`).
- `backoffice/` et `frontoffice/` — pages/features correspondant à interfaces internes/externe.
- `services/` — liaisons côté serveur et utilitaires pour GLPI (ex: `services/glpiService.js`).
- `import/` — scripts côté serveur pour lire/transformer CSV et insérer dans GLPI.
- `uploads/` — fichiers CSV d'exemple/entrées

Ajouter une nouvelle fonctionnalité front-end (ex: nouvelle page)

1. Créer le composant dans `src/components` ou un sous-dossier (ex: `src/backoffice/MyFeature.jsx`).
2. Importer et monter le composant dans `src/App.jsx` (gestion de `page` state) ou ajouter un routeur si vous préférez React Router.
3. Ajouter les styles dans `src/main.css` ou utiliser les classes Tailwind existantes.

Ajouter une API / route serveur

1. Créer un nouveau fichier route Express dans `import/` ou directement modifier `server.js`.
2. Monetiser la logique métier dans `services/` (nouvelle fonction utilitaire), pour garder `server.js` mince.
3. Protéger la route si nécessaire et gérer CORS via `VITE_FRONTEND_ORIGIN`.

Conseils de développement

- Conserver la logique GLPI dans `services/*` pour faciliter les tests et la réutilisation.
- Les réponses GLPI peuvent varier : ajouter des validations/guards avant de lire `res.data.id`.
- Écrire des commits courts et descriptifs; créer une branche par fonctionnalité.

Tests & CI

- Aucun framework de test n'est inclus actuellement. Ajouter `vitest` ou `jest` si vous voulez des tests unitaires.

Ressources utiles (fichiers à connaître)

- [server.js](server.js#L1) — serveur Express principal
- [import/import2.js](import/import2.js#L1) — script d'import monté sur `/api/import`
- [services/glpiService.js](services/glpiService.js#L1) — helpers GLPI
- [src/components/TicketsList.jsx](src/components/TicketsList.jsx#L1) — exemple de composant consommant l'API

Bonnes pratiques pour reviewer / étendre

- Tester en local avec votre instance GLPI lorsque possible.
- Vérifier les variables d'environnement et tokens avant d'exécuter des actions destructrices (ex: purge de tickets).
- Documenter toute nouvelle route API dans `docs/`.

# Présentation du projet — GLPI React App

Résumé

- Application front-end React (Vite) pour interagir avec une API GLPI et des scripts d'import.
- Un serveur Node/Express (server.js) fournit quelques routes d'administration (ex: purge de tickets) et monolithe d'import.

Objectif

- Fournir une interface simple pour visualiser et gérer des tickets GLPI, importer des CSV et exécuter des tâches d'administration.

Technologies principales

- Front-end: React 18 + Vite
- Back-end local: Express (server.js) exposant des routes d'API internes
- Utilitaires: axios, multer, papaparse, csv-parser pour le traitement de fichiers
- CSS: TailwindCSS, PostCSS

Structure clé du dépôt

- [src/](src): code React (entrée: [src/main.jsx](src/main.jsx#L1), composant principal: [src/App.jsx](src/App.jsx#L1))
- [src/components]: composants réutilisables (ex: [src/components/TicketsList.jsx](src/components/TicketsList.jsx#L1))
- [backoffice], [frontoffice]: pages et composants spécifiques aux interfaces internes/externe
- [services]: utilitaires côté serveur/Node pour communiquer avec GLPI (ex: [services/glpiService.js](services/glpiService.js#L1))
- [import/]: scripts d'import côté serveur (ex: import2.js monté sur `/api/import` dans `server.js`)
- [public/]: ressources statiques servies par Vite
- [uploads/]: dossiers CSV d'exemples et fichiers importés

Comment l'application fonctionne (haut niveau)

1. Développement front-end: `npm run dev` lance Vite (port par défaut 5173). L'application React monte `App` via [src/main.jsx](src/main.jsx#L1).
2. API/back-end local: `npm run server` exécute `server.js` (Express). Ce serveur sert les routes d'import et certaines tâches d'administration (ex: `/api/glpi/purge-tickets`).
3. Communication GLPI: les fonctions dans `services/glpiService*.js` utilisent `axios` pour appeler l'API GLPI. Les tokens / credentials peuvent venir de variables d'environnement (voir `.env`).

Variables d'environnement importantes

- GLPI_URL / VITE_GLPI_API_BASE — URL de l'API GLPI
- GLPI_APP_TOKEN / VITE_GLPI_APP_TOKEN — App-Token GLPI
- GLPI_USER / VITE_GLPI_USER et GLPI_PASSWORD — (optionnel) pour initSession
- VITE_FRONTEND_ORIGIN / FRONTEND_ORIGIN — pour config CORS côté serveur

Commandes utiles

- `npm run dev` — lancer le front-end en dev
- `npm run build` — construire le front pour production
- `npm run preview` — prévisualiser la build Vite
- `npm run server` — lancer le serveur Express local

Points d'attention

- Les services GLPI sont best-effort: la structure de réponse GLPI varie selon l'instance. Tester sur votre instance avant automatiser.
- Les scripts d'import utilisent des CSV présents dans `uploads/` et des helpers dans `import/`.
- La gestion des sessions GLPI peut être fournie via variables d'environnement ou via `initSession()` dynamique.

Où modifier/étendre

- UI: ajouter composants dans `src/components` et importer dans `src/App.jsx` ou dans les dossiers `frontoffice` / `backoffice`.
- API / logique serveur: étendre `import/*` ou `server.js`, ajouter route Express et utilitaire dans `services/`.

Ressources rapides

- Fichiers importants: [server.js](server.js#L1), [package.json](package.json#L1), [src/App.jsx](src/App.jsx#L1), [services/glpiService.js](services/glpiService.js#L1)

---

Ce document est un « aperçu » pour un nouvel arrivant. Voir `docs/DEVELOPER_GUIDE.md` pour instructions pas-à-pas.

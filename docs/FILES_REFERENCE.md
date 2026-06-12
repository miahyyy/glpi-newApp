# Référence des fichiers

Ce document présente l'arborescence du projet, la fonction de chaque fichier important et des extraits de code utiles pour un nouveau développeur.

**Arbre du projet (react-app)**

- index.html
- package.json
- package-lock.json
- server.js
- vite.config.mjs
- postcss.config.cjs
- tailwind.config.cjs
- .gitignore
- README.md
- /docs
  - PROJECT_OVERVIEW.md
  - DEVELOPER_GUIDE.md
  - FILES_REFERENCE.md
- /import
  - import.js
  - import2.js
- /services
  - glpiService.js
  - glpiService2.js
- /public
  - /images
    - images/…
- /uploads (exemples CSV)
- /src
  - main.jsx
  - main.css
  - App.jsx
  - /api
    - glpi.js
  - /components
    - Navbar.jsx
    - TicketsList.jsx
    - TicketDetailModal.jsx
    - ItemsList.jsx
    - CreateTicketForm.jsx
  - /frontoffice
    - FrontOffice.jsx
  - /backoffice
    - BackOffice.jsx
    - BackofficeLock.jsx
    - ResetPage.jsx
    - ResetParkPanel.jsx
    - ResetTicketsPanel.jsx

---

## Fichiers clés (description et extraits)

- `package.json` — configuration npm et scripts.

  Extrait (scripts):

  {
  "scripts": {
  "dev": "vite",
  "build": "vite build",
  "preview": "vite preview",
  "server": "node server.js"
  }
  }

- `server.js` — serveur Express léger. Monte le routeur d'import et expose `/api/glpi/purge-tickets`.

  Extrait:

  app.use('/api/import', importRouter)

  app.post('/api/glpi/purge-tickets', async (req, res) => {
  try {
  const token = await glpiService.initSession()
  const result = await glpiService.purgeAllGLPITickets(token)
  await glpiService.killSession()
  res.json(result || { ok: true })
  } catch (err) {
  res.status(500).json({ error: err.message || String(err) })
  }
  })

- `vite.config.mjs` — config Vite + proxy `/api` → `http://localhost:3000`.

- `import/import.js` et `import/import2.js` — endpoints d'import CSV + ZIP côté serveur.
  - Réception de `csvData1`, `csvData2`, `csvData3`, `imageZip` via `multer`.
  - Extraction d'archive, parsing CSV (`Papa.parse` ou `csv-parser`), conversion d'images PNG→JPEG avec `jimp`, puis envoi à GLPI via `services/glpiService2`.

  Extrait (validation des champs upload):

  if (!files || !files['csvData1'] || !files['csvData2'] || !files['csvData3'] || !files['imageZip']) {
  return res.status(400).json({ success: false, message: "Paquet incomplet." });
  }

- `services/glpiService.js` — client GLPI simple (axios). Fournit `initSession`, `createItem`, `createTicket`, `getOrCreate*`.

  Extrait:

  const GLPI_BASE = process.env.GLPI_URL || process.env.VITE_GLPI_API_BASE

  async function createItem(type, payload) {
  const url = `${GLPI_BASE}/${type}`
  const hdrs = { ...headers(SESSION_TOKEN), 'Content-Type': 'application/json' }
  const body = { input: payload }
  const res = await axios.post(url, body, { headers: hdrs })
  return res.data
  }

- `services/glpiService2.js` — client GLPI plus complet et robuste :
  - `initSession()` / `killSession()`
  - CRUD complet (`getItems`, `getItemById`, `createItem`, `updateItem`, `deleteItem`)
  - `purgeAllGLPITickets(sessionToken)` : supprime massivement les tickets
  - Helpers `getOrCreateManufacturer`, `getOrCreateLocation`, `getOrCreateModel`, `getOrCreateUser`

  Extrait (initSession):

  async function initSession() {
  const response = await axios.get(`${GLPI_URL}/initSession`, {
  headers: { Authorization: `user_token ${USER_TOKEN}` },
  params: { app_token: APP_TOKEN }
  })
  sessionToken = response.data.session_token
  return sessionToken
  }

- `src/main.jsx` — point d'entrée React (createRoot → `App`).

- `src/App.jsx` — gestion du menu et rendu conditionnel des pages (`backoffice`, `home`, `import`, `reset`).

- `src/api/glpi.js` — client côté navigateur utilisant `fetch` pour appeler l'API GLPI (BASE = `VITE_GLPI_API_BASE`) et le backend (`VITE_BACKEND_URL`).
  - Fonctions exportées : `fetchTickets`, `createTicket`, `fetchItems`, `deleteItem`, `resetItems`, `resetTickets`, `uploadDocument`.

  Extrait (fetchTickets):

  export async function fetchTickets() {
  return request('/Ticket', { method: 'GET' })
  }

- `src/components/Navbar.jsx` — barre de navigation, boutons appellent `onNavigate('...')`.

- `src/components/TicketsList.jsx` — récupère `fetchTickets()` et affiche des cartes.
  - Gère états, priorités et rend cliquable si `onSelect` fourni.

  Extrait (chargement):

  useEffect(() => {
  fetchTickets()
  .then(data => setTickets(Array.isArray(data) ? data : data.data || []))
  .catch(err => setError(err.message))
  .finally(() => setLoading(false))
  }, [])

- `src/components/TicketDetailModal.jsx` — modal d'affichage détaillé d'un ticket (fermeture `Escape`, click background).

- `src/components/ItemsList.jsx` — liste et filtres pour différents types d'objets GLPI (Computer, Printer, ...).

- `src/components/CreateTicketForm.jsx` — formulaire pour créer un ticket ; appelle `createTicket(payload)` ; permet sélectionner des éléments.

- `src/frontoffice/FrontOffice.jsx` — page front office : onglets `items`, `tickets`, `create`.

- `src/backoffice/*` — pages et panneaux d'administration : statistiques, reset, lock.
  - `BackofficeLock.jsx` utilise `VITE_BACKOFFICE_CODE` et `sessionStorage`.

---

## Exemples d'utilisation rapide

- Lancer le front en dev :

```bash
npm install
npm run dev
```

- Lancer le serveur Express (routes d'import et d'admin) :

```bash
npm run server
```

## Variables d'environnement importantes

- `VITE_GLPI_API_BASE` — URL de l'API GLPI (côté front)
- `VITE_GLPI_APP_TOKEN` — App token pour GLPI (front)
- `VITE_GLPI_SESSION_TOKEN` — Session token si déjà obtenu
- `GLPI_URL`, `GLPI_APP_TOKEN`, `GLPI_USER_TOKEN`, `GLPI_USER`, `GLPI_PASSWORD` — utilisés côté serveur (`services/*`, `import/*`)
- `VITE_BACKEND_URL` — URL du backend pour appel `resetTickets` ou import client→serveur
- `VITE_BACKOFFICE_CODE` — code pour accéder au backoffice via `BackofficeLock`

---

Si vous voulez, je peux maintenant:

- Ajouter un fichier `.env.example` avec ces variables (recommandé).
- Committer ces docs sur une branche dédiée.
- Générer un résumé Markdown plus compact pour la revue de PR.

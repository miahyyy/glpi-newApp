# GLPI React App

Sample React front-end for GLPI 11.0.7 data (Vite + Tailwind)

Features:

- Vite + React 18
- TailwindCSS warm professional theme
- Sticky navbar
- Example `TicketsList` component that fetches from GLPI REST API

Setup

1. Node >=16 installed
2. From `NewApp/react-app` run:

```bash
npm install
npm run dev
```

Environment

Create a `.env` or `.env.local` in `NewApp/react-app` with these variables:

```
VITE_GLPI_API_BASE=http://your-glpi-host/apirest.php
VITE_GLPI_APP_TOKEN=your_app_token
# Optionally, if you obtain a session token for a user:
VITE_GLPI_SESSION_TOKEN=your_session_token
```

Notes about GLPI API

- GLPI REST endpoints are usually under `/apirest.php`. The sample client uses `VITE_GLPI_API_BASE + '/Ticket'` to fetch tickets.
- GLPI requires an `App-Token` header for app authentication; user session tokens may be required for specific user-scoped access.

Next steps

- Improve authentication flow (login, session management)
- Add more components (Entity list, Assets, Ticket details)
- Add routing with React Router if needed

require('dotenv').config(); // 👈 This must be the absolute first line
const express = require('express')
const cors = require('cors')
const path = require('path')
const app = express()
const port = process.env.PORT || 3000

// Parse JSON bodies
app.use(express.json())

// CORS configuration: allow frontend origin from env or default
const origin = process.env.VITE_FRONTEND_ORIGIN || process.env.FRONTEND_ORIGIN || 'http://localhost:5173'
app.use(cors({ origin, credentials: true }))

// If you have other middleware or API routes, mount them here
// Serve import router
const importRouter = require('./import/import2')
app.use('/api/import', importRouter)

// GLPI management endpoint
const glpiService = require('./services/glpiService2')
app.post('/api/glpi/purge-tickets', async (req, res) => {
    try {
        const token = await glpiService.initSession()
        const result = await glpiService.purgeAllGLPITickets(token)
        await glpiService.killSession()
        // result should include deleted/total
        res.json(result || { ok: true })
    } catch (err) {
        console.error('Error in /api/glpi/purge-tickets', err)
        res.status(500).json({ error: err.message || String(err) })
    }
})

// Fetch tickets via backend (wraps services/glpiService2.fetchAllGLPITickets)
app.get('/api/glpi/fetch-tickets', async (req, res) => {
    try {
        const token = await glpiService.initSession()
        const tickets = await glpiService.fetchAllGLPITickets(token)
        await glpiService.killSession()
        res.json(tickets || [])
    } catch (err) {
        console.error('Error in /api/glpi/fetch-tickets', err)
        res.status(500).json({ error: err.message || String(err) })
    }
})

// Serve static files from the React app (optional)
app.use(express.static(path.join(__dirname, 'dist')))

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'))
})

app.listen(port, () => {
    console.log(`Import server listening on http://localhost:${port}`)
})



// ── Kanban SQLite settings ──────────────────────────────────────────────────
const kanbanDb = require('./db/kanban')

app.get('/api/kanban/settings', (req, res) => {
    res.json(kanbanDb.getAllSettings())
})

app.put('/api/kanban/settings', (req, res) => {
    const settings = req.body
    if (!settings || typeof settings !== 'object') return res.status(400).json({ error: 'Invalid body' })
    for (const [key, value] of Object.entries(settings)) {
        kanbanDb.setSetting(key, String(value))
    }
    res.json({ ok: true })
})

// ── Update ticket status ────────────────────────────────────────────────────
app.put('/api/glpi/ticket/:id/status', async (req, res) => {
    const { id } = req.params
    const { status, solution } = req.body
    try {
        const token = await glpiService.initSession()
        const data = { status: parseInt(status) }
        if (solution) data.solution = solution
        const result = await glpiService.updateItem('Ticket', id, data)
        await glpiService.killSession()
        res.json(result || { ok: true })
    } catch (err) {
        console.error('Error updating ticket status', err)
        res.status(500).json({ error: err.message || String(err) })
    }
})



const ticketCostsDb = require('./db/ticketCosts')

app.post('/api/ticket-costs', (req, res) => {
    const { ticket_id, super_cost } = req.body
    if (ticket_id === undefined || super_cost === undefined)
        return res.status(400).json({ error: 'ticket_id et super_cost requis' })
    ticketCostsDb.saveCost(ticket_id, super_cost)
    res.json({ ok: true })
})

app.get('/api/ticket-costs', (req, res) => {
    res.json(ticketCostsDb.getAllCosts())
})
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

// Serve static files from the React app (optional)
app.use(express.static(path.join(__dirname, 'dist')))

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'))
})

app.listen(port, () => {
    console.log(`Import server listening on http://localhost:${port}`)
})

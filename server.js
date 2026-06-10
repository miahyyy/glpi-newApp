require('dotenv').config(); // 👈 This must be the absolute first line
const express = require('express')
const path = require('path')
const app = express()
const port = process.env.PORT || 3000

// If you have other middleware or API routes, mount them here
// Serve import router
const importRouter = require('./import/import')
app.use('/api/import', importRouter)

// Serve static files from the React app (optional)
app.use(express.static(path.join(__dirname, 'dist')))

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'))
})

app.listen(port, () => {
    console.log(`Import server listening on http://localhost:${port}`)
})

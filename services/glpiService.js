const axios = require('axios')

const GLPI_BASE = process.env.GLPI_URL || process.env.VITE_GLPI_API_BASE || 'http://localhost/apirest.php'
const APP_TOKEN = process.env.GLPI_APP_TOKEN || process.env.VITE_GLPI_APP_TOKEN || ''
const SESSION_TOKEN = process.env.GLPI_SESSION_TOKEN || process.env.VITE_GLPI_SESSION_TOKEN || ''

function headers(sessionToken) {
    const h = { 'App-Token': APP_TOKEN }
    if (sessionToken) h['Session-Token'] = sessionToken
    return h
}

async function initSession() {
    // Prefer explicit session token from env
    if (SESSION_TOKEN) return SESSION_TOKEN
    // Attempt to init session via API if credentials provided
    const user = process.env.GLPI_USER || process.env.VITE_GLPI_USER
    const pass = process.env.GLPI_PASSWORD || process.env.VITE_GLPI_PASSWORD
    if (!user || !pass) return null

    try {
        const url = `${GLPI_BASE}/initSession`
        const res = await axios.post(url, { login: user, password: pass }, { headers: headers() })
        // response shape may vary; return token if present
        return res.data?.session_token || res.data?.session || null
    } catch (e) {
        console.warn('[glpiService] initSession failed:', e.message)
        return null
    }
}

async function createItem(type, payload) {
    try {
        const url = `${GLPI_BASE}/${type}`
        // GLPI expects JSON body; some installs accept {input:{...}} — send both where possible
        const hdrs = { ...headers(SESSION_TOKEN), 'Content-Type': 'application/json' }
        const body = { input: payload }
        // Log request for debugging
        console.log('[glpiService] POST', url, JSON.stringify(body))
        const res = await axios.post(url, body, { headers: hdrs })
        // try various response shapes
        if (res.data && (res.data.id || res.data.ID)) return { id: res.data.id || res.data.ID }
        if (res.data && res.data.data && res.data.data.id) return { id: res.data.data.id }
        if (res.data && res.data.session_token) return { id: null }
        return res.data
    } catch (e) {
        // Log detailed error
        if (e.response) {
            console.warn('[glpiService] createItem error', e.response.status, e.response.data)
        } else {
            console.warn('[glpiService] createItem error', e.message)
        }
        throw e
    }
}

async function createTicket(payload) {
    return createItem('Ticket', payload)
}

async function getOrCreateManufacturer(name) {
    if (!name) return null
    try {
        const res = await createItem('Manufacturer', { name })
        return res.id || null
    } catch (e) {
        console.warn('[glpiService] getOrCreateManufacturer failed:', e.message)
        return null
    }
}

async function getOrCreateLocation(name) {
    if (!name) return null
    try {
        const res = await createItem('Location', { name })
        return res.id || null
    } catch (e) {
        console.warn('[glpiService] getOrCreateLocation failed:', e.message)
        return null
    }
}

async function getOrCreateModel(itemtype, name) {
    if (!name || !itemtype) return null
    try {
        // Try to create a generic Model — field naming varies by GLPI install.
        const res = await createItem('Model', { name })
        return res.id || null
    } catch (e) {
        console.warn('[glpiService] getOrCreateModel failed:', e.message)
        return null
    }
}

function getModelFieldNameForItemType(itemtype) {
    // Best-effort mapping. May require tuning per GLPI instance.
    const mapping = {
        Computer: 'computermodels_id',
        Printer: 'printermodels_id'
    }
    return mapping[itemtype] || null
}

async function getOrCreateUser(username) {
    if (!username) return null
    try {
        // This is simplistic: attempt to create user record; better: search first
        const res = await createItem('User', { name: username })
        return res.id || null
    } catch (e) {
        console.warn('[glpiService] getOrCreateUser failed:', e.message)
        return null
    }
}

module.exports = {
    initSession,
    createItem,
    createTicket,
    getOrCreateManufacturer,
    getOrCreateLocation,
    getOrCreateModel,
    getModelFieldNameForItemType,
    getOrCreateUser
}

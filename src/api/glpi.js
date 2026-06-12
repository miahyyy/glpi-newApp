const BASE = import.meta.env.VITE_GLPI_API_BASE || 'http://localhost/glpi/apirest.php'
const BACKEND = import.meta.env.VITE_BACKEND_URL || ''
const APP_TOKEN = import.meta.env.VITE_GLPI_APP_TOKEN || ''
const SESSION_TOKEN = import.meta.env.VITE_GLPI_SESSION_TOKEN || ''

async function request(path, opts = {}) {
    const headers = {
        'Content-Type': 'application/json',
        ...(APP_TOKEN ? { 'App-Token': APP_TOKEN } : {}),
        ...(SESSION_TOKEN ? { 'Session-Token': SESSION_TOKEN } : {})
    }
    const res = await fetch(`${BASE}${path}`, {
        ...opts,
        headers: {
            ...headers,
            ...(opts.headers || {})
        }
    })

    if (!res.ok) {
        const text = await res.text()
        throw new Error(`GLPI API error ${res.status}: ${text}`)
    }

    const json = await res.json()
    return json
}

export async function fetchTickets() {
    // Prefer calling the backend which runs fetchAllGLPITickets server-side.
    // Fallback to direct GLPI REST call if no backend is configured.
    if (BACKEND) {
        const url = `${BACKEND}/api/glpi/fetch-tickets`
        const res = await fetch(url, { method: 'GET', headers: { 'Content-Type': 'application/json' } })
        if (!res.ok) {
            const text = await res.text()
            throw new Error(`Backend fetchTickets error ${res.status}: ${text}`)
        }
        const json = await res.json()
        return Array.isArray(json) ? json : json.data || json
    }

    // GLPI REST for tickets: usually GET /Ticket
    return request('/Ticket', { method: 'GET' })
}

export default { fetchTickets }

export async function deleteTicket(id) {
    if (!id) throw new Error('Missing ticket id')
    // GLPI REST delete
    return request(`/Ticket/${id}`, { method: 'DELETE', body: JSON.stringify({ force_purge: 1 }) })
}

// export async function purgeTicket(id) {  
//     if (!id) throw new Error('Missing ticket id')
//     return request(`/Ticket/${id}`, {
//         method: 'DELETE',
//         body: JSON.stringify({ force_purge: 1 }),
//     })
// }

export async function resetTickets(onProgress) {
    // Use backend endpoint which triggers purgeAllGLPITickets on the server
    const url = `${BACKEND}/api/glpi/purge-tickets`
    const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' } })
    if (!res.ok) {
        const text = await res.text()
        throw new Error(`Purge API error ${res.status}: ${text}`)
    }
    const json = await res.json()
    if (typeof onProgress === 'function') onProgress(json.deleted || 0, json.total || 0, null)
    return { deleted: json.deleted || 0, total: json.total || 0 }
}

export async function deleteItem(type, id) {
    if (!type) throw new Error('Missing item type')
    if (!id) throw new Error('Missing item id')
    return request(`/${type}/${id}`, { method: 'DELETE', body: JSON.stringify({ force_purge: 1 }) })
}

export async function fetchItems(type) {
    if (!type) throw new Error('Missing item type')
    return request(`/${type}`, { method: 'GET' })
}

export async function resetItems(type, onProgress) {
    // Generic reset for GLPI object type (e.g., Computer, Printer)
    const data = await fetchItems(type)
    const list = Array.isArray(data) ? data : data.data || []
    const total = list.length
    let done = 0

    for (const item of list) {
        const id = item.id || item.ID
        if (!id) continue
        try {
            await deleteItem(type, id)
        } catch (e) {
            console.error('Failed to delete', type, id, e)
        }
        done += 1
        if (typeof onProgress === 'function') onProgress(done, total, id)
    }

    return { deleted: done, total }
}

export async function createItem(type, payload) {
    if (!type) throw new Error('Missing item type')
    // GLPI API: POST /<Type> with JSON body
    return request(`/${type}`, { method: 'POST', body: JSON.stringify(payload) })
}

export async function createTicket(payload) {
    // POST /Ticket
    const body = { input: Array.isArray(payload) ? payload : [payload] }
    return request('/Ticket', { method: 'POST', body: JSON.stringify(body) })
}

export async function uploadDocument(filename, blob, options = {}) {
    // GLPI expects multipart/form-data to /Document
    const url = `${BASE}/Document`
    const form = new FormData()
    form.append('uploadFile', blob, filename)
    // optional: add other fields like 'name'
    if (options.name) form.append('name', options.name)

    const headers = {}
    if (APP_TOKEN) headers['App-Token'] = APP_TOKEN
    if (SESSION_TOKEN) headers['Session-Token'] = SESSION_TOKEN

    const res = await fetch(url, { method: 'POST', body: form, headers })
    if (!res.ok) {
        const text = await res.text()
        throw new Error(`Upload failed ${res.status}: ${text}`)
    }
    return res.json()
}

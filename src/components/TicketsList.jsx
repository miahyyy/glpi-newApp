import React, { useEffect, useState } from 'react'
import { fetchTickets } from '../api/glpi'

export default function TicketsList() {
    const [tickets, setTickets] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)

    useEffect(() => {
        let mounted = true
        setLoading(true)
        fetchTickets()
            .then((data) => {
                if (!mounted) return
                // GLPI may return data as array or object; adapt safely
                const list = Array.isArray(data) ? data : data.data || []
                setTickets(list)
            })
            .catch((err) => {
                if (!mounted) return
                setError(err.message)
            })
            .finally(() => mounted && setLoading(false))

        return () => {
            mounted = false
        }
    }, [])

    if (loading) return <div className="text-center py-8 text-gray-600">Chargement des tickets…</div>
    if (error) return <div className="text-center py-8 text-red-600">Erreur: {error}</div>

    if (!tickets.length) return <div className="text-center py-8 text-gray-600">Aucun ticket trouvé.</div>

    return (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {tickets.map((t) => (
                <article key={t.id || t.ID || Math.random()} className="bg-white p-4 rounded-lg shadow-sm border">
                    <div className="flex items-start justify-between gap-4">
                        <div>
                            <h3 className="text-lg font-semibold text-warm-800">{t.name || t.title || `Ticket #${t.id || t.ID || '–'}`}</h3>
                            <p className="text-sm text-gray-500 mt-1">Status: <span className="font-medium text-gray-700">{t.status || t.fk_state || '—'}</span></p>
                        </div>
                        <div className="text-sm text-gray-500">ID: {t.id || t.ID || '—'}</div>
                    </div>

                    <p className="mt-3 text-sm text-gray-600 line-clamp-3">{t.content || t.description || t.problem || 'No description'}</p>

                    <div className="mt-4 flex items-center justify-between text-xs text-gray-500">
                        <div>Requester: {t.requester_name || t.requester || '-'}</div>
                        <div>{t.date || ''}</div>
                    </div>
                </article>
            ))}
        </div>
    )
}

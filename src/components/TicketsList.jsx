import React, { useEffect, useState } from 'react'
import { fetchTickets } from '../api/glpi'

const STATUS_MAP = {
    1: { label: 'Nouveau',    color: 'bg-blue-100 text-blue-800' },
    2: { label: 'En cours',   color: 'bg-yellow-100 text-yellow-800' },
    3: { label: 'En attente', color: 'bg-orange-100 text-orange-800' },
    4: { label: 'Résolu',     color: 'bg-green-100 text-green-800' },
    5: { label: 'Clos',       color: 'bg-gray-100 text-gray-500' },
}

const PRIORITY_DOTS = {
    1: 'bg-gray-300',
    2: 'bg-blue-400',
    3: 'bg-green-500',
    4: 'bg-orange-500',
    5: 'bg-red-600',
}

/**
 * @param {function} [onSelect] - Si fourni, les cartes deviennent cliquables
 *                                et appellent onSelect(ticket) au clic.
 */
export default function TicketsList({ onSelect }) {
    const [tickets, setTickets] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError]     = useState(null)

    useEffect(() => {
        let mounted = true
        setLoading(true)
        fetchTickets()
            .then(data => {
                if (!mounted) return
                const list = Array.isArray(data) ? data : data.data || []
                setTickets(list)
            })
            .catch(err => {
                if (!mounted) return
                setError(err.message)
            })
            .finally(() => mounted && setLoading(false))
        return () => { mounted = false }
    }, [])

    if (loading) return (
        <div className="flex flex-col items-center justify-center py-16 text-gray-400">
            <div className="w-8 h-8 border-2 border-warm-400 border-t-transparent rounded-full animate-spin mb-3" />
            <p className="text-sm">Chargement des tickets…</p>
        </div>
    )

    if (error) return (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm">
            Erreur : {error}
        </div>
    )

    if (!tickets.length) return (
        <div className="text-center py-16 text-gray-400">
            <p className="text-4xl mb-3">🎫</p>
            <p className="text-sm">Aucun ticket trouvé.</p>
        </div>
    )

    const clickable = typeof onSelect === 'function'

    return (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {tickets.map(t => {
                const id       = t.id || t.ID
                const title    = t.name || t.title || `Ticket #${id || '–'}`
                const status   = STATUS_MAP[t.status] || { label: String(t.status || t.fk_state || '—'), color: 'bg-gray-100 text-gray-600' }
                const dotColor = PRIORITY_DOTS[t.priority] || 'bg-gray-300'
                const content  = t.content || t.description || t.problem || ''

                return (
                    <article
                        key={id ?? title}
                        onClick={clickable ? () => onSelect(t) : undefined}
                        className={`bg-white p-4 rounded-lg shadow-sm border transition-shadow ${
                            clickable
                                ? 'cursor-pointer hover:shadow-md hover:border-warm-300'
                                : ''
                        }`}
                    >
                        <div className="flex items-start justify-between gap-3 mb-2">
                            <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                    {t.priority && (
                                        <span
                                            className={`w-2 h-2 rounded-full flex-shrink-0 ${dotColor}`}
                                            title={`Priorité ${t.priority}`}
                                        />
                                    )}
                                    <h3 className="font-semibold text-warm-800 text-sm truncate">
                                        {title}
                                    </h3>
                                </div>
                                <p className="text-xs text-gray-400">#{id || '—'}</p>
                            </div>
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium whitespace-nowrap flex-shrink-0 ${status.color}`}>
                                {status.label}
                            </span>
                        </div>

                        {content && (
                            <p className="text-sm text-gray-600 line-clamp-2 mb-3">{content}</p>
                        )}

                        <div className="flex items-center justify-between text-xs text-gray-400 border-t pt-2 mt-2">
                            <span>{t.requester_name || t.requester || '—'}</span>
                            <span>{t.date || t.date_creation || ''}</span>
                        </div>

                        {clickable && (
                            <p className="text-xs text-warm-500 mt-2 text-right">
                                Voir les détails →
                            </p>
                        )}
                    </article>
                )
            })}
        </div>
    )
}
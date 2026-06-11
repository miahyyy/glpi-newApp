import React, { useEffect } from 'react'

const STATUS_MAP = {
    1: { label: 'Nouveau',     color: 'bg-blue-100 text-blue-800' },
    2: { label: 'En cours',    color: 'bg-yellow-100 text-yellow-800' },
    3: { label: 'En attente',  color: 'bg-orange-100 text-orange-800' },
    4: { label: 'Résolu',      color: 'bg-green-100 text-green-800' },
    5: { label: 'Clos',        color: 'bg-gray-100 text-gray-600' },
}

const PRIORITY_MAP = {
    1: { label: 'Très basse', color: 'text-gray-400' },
    2: { label: 'Basse',      color: 'text-blue-500' },
    3: { label: 'Normale',    color: 'text-green-600' },
    4: { label: 'Haute',      color: 'text-orange-500' },
    5: { label: 'Très haute', color: 'text-red-600' },
    6: { label: 'Majeure',    color: 'text-red-800 font-bold' },
}

const TYPE_MAP = {
    1: 'Incident',
    2: 'Demande',
}

function MetaField({ label, children }) {
    return (
        <div>
            <p className="text-xs text-gray-400 mb-1">{label}</p>
            <div className="text-sm font-medium text-gray-800">{children || '—'}</div>
        </div>
    )
}

export default function TicketDetailModal({ ticket, onClose }) {
    // Fermeture avec Échap
    useEffect(() => {
        function onKey(e) {
            if (e.key === 'Escape') onClose()
        }
        document.addEventListener('keydown', onKey)
        return () => document.removeEventListener('keydown', onKey)
    }, [onClose])

    if (!ticket) return null

    const id       = ticket.id || ticket.ID || '—'
    const title    = ticket.name || ticket.title || 'Sans titre'
    const status   = STATUS_MAP[ticket.status] || { label: String(ticket.status || '—'), color: 'bg-gray-100 text-gray-600' }
    const priority = PRIORITY_MAP[ticket.priority] || { label: String(ticket.priority || '—'), color: 'text-gray-500' }
    const type     = TYPE_MAP[ticket.type] || String(ticket.type || '—')
    const content  = ticket.content || ticket.description || ticket.problem || ''
    const date     = ticket.date || ticket.date_creation || ticket.date_mod || ''
    const requester = ticket.requester_name || ticket.requester || (ticket.users_id_recipient ? `#${ticket.users_id_recipient}` : null)
    const assignee  = ticket.technician || (ticket.users_id_tech ? `#${ticket.users_id_tech}` : null)

    // Champs supplémentaires à afficher dans la section "Plus"
    const KNOWN_KEYS = new Set([
        'id', 'ID', 'name', 'title', 'status', 'priority', 'type',
        'date', 'date_creation', 'date_mod', 'content', 'description', 'problem',
        'requester_name', 'requester', 'users_id_recipient', 'technician',
        'users_id_tech', 'fk_state',
    ])
    const extraFields = Object.entries(ticket).filter(([k, v]) => !KNOWN_KEYS.has(k) && v !== null && v !== undefined && v !== '')

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-8"
            onClick={e => e.target === e.currentTarget && onClose()}
        >
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">

                {/* En-tête */}
                <div className="flex items-start justify-between p-5 border-b flex-shrink-0">
                    <div className="min-w-0 pr-4">
                        <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs text-gray-400 font-mono">#{id}</span>
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${status.color}`}>
                                {status.label}
                            </span>
                        </div>
                        <h2 className="text-lg font-semibold text-warm-800 leading-tight">
                            {title}
                        </h2>
                    </div>
                    <button
                        onClick={onClose}
                        aria-label="Fermer"
                        className="flex-shrink-0 w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg text-xl leading-none transition-colors"
                    >
                        ×
                    </button>
                </div>

                {/* Corps scrollable */}
                <div className="overflow-y-auto flex-1 p-5 space-y-5">

                    {/* Métadonnées principales */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                        <MetaField label="Type">{type}</MetaField>
                        <MetaField label="Priorité">
                            <span className={priority.color}>{priority.label}</span>
                        </MetaField>
                        <MetaField label="Date">{date}</MetaField>
                        <MetaField label="Demandeur">{requester}</MetaField>
                        <MetaField label="Assigné à">{assignee}</MetaField>
                        {ticket.urgency && (
                            <MetaField label="Urgence">{ticket.urgency}</MetaField>
                        )}
                    </div>

                    {/* Description */}
                    {content ? (
                        <div>
                            <p className="text-xs text-gray-400 mb-2">Description</p>
                            <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-700 whitespace-pre-wrap leading-relaxed border">
                                {content}
                            </div>
                        </div>
                    ) : (
                        <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-400 italic border">
                            Aucune description fournie.
                        </div>
                    )}

                    {/* Champs supplémentaires */}
                    {extraFields.length > 0 && (
                        <details className="group">
                            <summary className="text-xs text-gray-400 cursor-pointer hover:text-gray-600 select-none list-none flex items-center gap-1">
                                <span className="group-open:rotate-90 transition-transform inline-block">▶</span>
                                {extraFields.length} champ{extraFields.length > 1 ? 's' : ''} supplémentaire{extraFields.length > 1 ? 's' : ''}
                            </summary>
                            <div className="mt-2 bg-gray-50 rounded-lg p-3 border text-xs space-y-1">
                                {extraFields.map(([k, v]) => (
                                    <div key={k} className="flex gap-3">
                                        <span className="text-gray-400 min-w-[140px] shrink-0">{k}</span>
                                        <span className="text-gray-700 font-mono break-all">{String(v)}</span>
                                    </div>
                                ))}
                            </div>
                        </details>
                    )}
                </div>

                {/* Pied */}
                <div className="px-5 pb-5 pt-3 border-t flex justify-end flex-shrink-0">
                    <button
                        onClick={onClose}
                        className="px-5 py-2 bg-warm-500 text-white rounded-lg text-sm hover:bg-warm-600 font-medium transition-colors"
                    >
                        Fermer
                    </button>
                </div>
            </div>
        </div>
    )
}



import React, { useEffect, useState } from 'react'
import TicketsList from '../components/TicketsList'
import { fetchItems, fetchTickets } from '../api/glpi'
import KanbanSettingsPanel from './KanbanSettingsPanel'

const ITEM_TYPES = [
    { label: 'Périphériques', type: 'Peripheral' },
    { label: 'Ordinateurs', type: 'Computer' },
    { label: 'Téléphones', type: 'Phone' },
    { label: 'Moniteurs', type: 'Monitor' },
    { label: 'Imprimantes', type: 'Printer' },
    { label: 'Réseau', type: 'NetworkEquipment' },
    { label: 'Logiciels', type: 'Software' }
]

export default function BackOffice() {
    const [itemsCounts, setItemsCounts] = useState({ total: 0, byType: {} })
    const [ticketsCounts, setTicketsCounts] = useState({ total: 0, byStatus: {} })
    const [loading, setLoading] = useState(true)
    const [showTickets, setShowTickets] = useState(false)
    const [error, setError] = useState(null)

    useEffect(() => {
        let mounted = true
        async function load() {
            setLoading(true)
            setError(null)
            try {
                // fetch items per type
                const byType = {}
                let totalItems = 0
                for (const t of ITEM_TYPES) {
                    try {
                        const data = await fetchItems(t.type)
                        const list = Array.isArray(data) ? data : data.data || []
                        byType[t.type] = { label: t.label, count: list.length }
                        totalItems += list.length
                    } catch (e) {
                        byType[t.type] = { label: t.label, count: 0, error: e.message }
                    }
                }

                // fetch tickets
                const ticketData = await fetchTickets()
                const tlist = Array.isArray(ticketData) ? ticketData : ticketData.data || []
                const totalTickets = tlist.length
                const byStatus = {}
                for (const t of tlist) {
                    const status = t.status || t.fk_state || t.state || 'unknown'
                    byStatus[status] = (byStatus[status] || 0) + 1
                }

                if (!mounted) return
                setItemsCounts({ total: totalItems, byType })
                setTicketsCounts({ total: totalTickets, byStatus })
            } catch (e) {
                console.error('BackOffice load error', e)
                if (!mounted) return
                setError(e.message)
            } finally {
                if (mounted) setLoading(false)
            }
        }

        load()
        return () => { mounted = false }
    }, [])

    return (
        <div className="container mx-auto px-4 py-8">
            <header className="mb-6">
                <h1 className="text-3xl font-semibold text-warm-800">Backoffice Dashboard</h1>
                <p className="text-gray-600 mt-2">Statistiques et gestion centrale (Backoffice)</p>
            </header>

            {loading && <div className="text-gray-600">Chargement des statistiques…</div>}
            {error && <div className="text-red-600">Erreur: {error}</div>}

            {!loading && !error && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-white p-4 rounded shadow-sm border">
                        <h3 className="text-lg font-semibold">Éléments du parc</h3>
                        <div className="mt-3 text-sm text-gray-700">Total: <span className="font-medium">{itemsCounts.total}</span></div>
                        <ul className="mt-3 space-y-2 text-sm">
                            {Object.entries(itemsCounts.byType).map(([type, info]) => (
                                <li key={type} className="flex justify-between">
                                    <span>{info.label}</span>
                                    <span className="font-medium">{info.count}</span>
                                </li>
                            ))}
                        </ul>
                    </div>

                    <div className="bg-white p-4 rounded shadow-sm border">
                        <h3 className="text-lg font-semibold">Tickets</h3>
                        <div className="mt-3 text-sm text-gray-700">Total: <span className="font-medium">{ticketsCounts.total}</span></div>
                        <ul className="mt-3 space-y-2 text-sm">
                            {Object.entries(ticketsCounts.byStatus).map(([status, count]) => (
                                <li key={status} className="flex justify-between">
                                    <span>{status}</span>
                                    <span className="font-medium">{count}</span>
                                </li>
                            ))}
                        </ul>

                        <div className="mt-4">
                            <button onClick={() => setShowTickets((s) => !s)} className="px-3 py-2 bg-warm-500 text-white rounded">
                                {showTickets ? 'Masquer les tickets' : 'Voir la liste des tickets'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {!loading && !error && (
                <div className="mt-6">
                    <KanbanSettingsPanel />
                </div>
            )}

            {showTickets && (
                <section className="mt-6">
                    <h3 className="text-lg font-semibold mb-3">Liste des tickets</h3>
                    <TicketsList />
                </section>
            )}
        </div>
    )
}
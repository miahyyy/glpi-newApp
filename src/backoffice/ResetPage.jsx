import React, { useState } from 'react'
import ResetParkPanel from './ResetParkPanel'
import ResetTicketsPanel from './ResetTicketsPanel'
import { resetItems, resetTickets } from '../api/glpi'

const ALL_CATEGORIES = [
    { label: 'Périphériques', type: 'Peripheral' },
    { label: 'Ordinateurs', type: 'Computer' },
    { label: 'Téléphones', type: 'Phone' },
    { label: 'Moniteurs', type: 'Monitor' },
    { label: 'Imprimantes', type: 'Printer' },
    { label: 'Réseau', type: 'NetworkEquipment' },
    { label: 'Logiciels', type: 'Software' },
    {label: 'Utilisateurs', type: 'User'}
]

export default function ResetPage() {
    const [runningAll, setRunningAll] = useState(false)
    const [status, setStatus] = useState('')
    const [progress, setProgress] = useState({ done: 0, total: 0, current: null })

    async function handleResetAll() {
        const ok = window.confirm('Confirmez-vous la suppression de TOUS les éléments du parc ET tous les tickets ? Cette action est IRRÉVERSIBLE.')
        if (!ok) return

        setRunningAll(true)
        setStatus('Démarrage...')
        try {
            // reset park categories
            let catIndex = 0
            for (const c of ALL_CATEGORIES) {
                setStatus(`Reset ${c.label}...`)
                setProgress((p) => ({ ...p, current: c.type }))
                const res = await resetItems(c.type, (done, total) => {
                    setProgress({ done, total, current: c.type })
                })
                catIndex += 1
            }

            // reset tickets
            setStatus('Reset tickets...')
            await resetTickets((done, total) => setProgress({ done, total, current: 'Ticket' }))

            setStatus('Terminé')
            window.alert('Reset global terminé')
        } catch (e) {
            console.error('ResetAll error', e)
            setStatus(`Erreur: ${e.message}`)
        } finally {
            setRunningAll(false)
        }
    }

    return (
        <div className="container mx-auto px-4 py-8">
            <header className="mb-6">
                <h1 className="text-2xl font-semibold text-warm-800">Réinitialisation des données</h1>
                <p className="text-gray-600 mt-2">Sélectionnez le type de données à réinitialiser. Actions destructrices, prudence requise.</p>
            </header>

            <div className="mb-6">
                <button
                    onClick={handleResetAll}
                    disabled={runningAll}
                    className="px-4 py-2 bg-red-600 text-white rounded shadow hover:bg-red-700 disabled:opacity-50"
                >
                    {runningAll ? 'Reset en cours…' : 'Reset All Items & Tickets'}
                </button>
                {status && <div className="mt-3 text-sm text-gray-700">{status} — {progress.current} {progress.done}/{progress.total}</div>}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <ResetParkPanel />
                </div>
                <div>
                    <ResetTicketsPanel />
                </div>
            </div>
        </div>
    )
}

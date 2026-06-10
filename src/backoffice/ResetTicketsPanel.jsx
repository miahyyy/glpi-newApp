import React, { useState } from 'react'
import { resetTickets } from '../api/glpi'

export default function ResetTicketsPanel() {
    const [running, setRunning] = useState(false)
    const [progress, setProgress] = useState({ done: 0, total: 0, lastId: null })
    const [message, setMessage] = useState(null)

    async function handleResetTickets() {
        const ok = window.confirm('Confirmez-vous la suppression de tous les tickets GLPI ? Cette action est irréversible.')
        if (!ok) return

        setRunning(true)
        setMessage(null)
        setProgress({ done: 0, total: 0, lastId: null })

        try {
            const result = await resetTickets((done, total, lastId) => {
                setProgress({ done, total, lastId })
            })
            setMessage(`Suppression terminée : ${result.deleted}/${result.total}`)
        } catch (e) {
            setMessage(`Erreur pendant la réinitialisation: ${e.message}`)
        } finally {
            setRunning(false)
        }
    }

    return (
        <div className="bg-white p-4 rounded-lg shadow-sm border">
            <h3 className="text-md font-semibold text-warm-800">Réinitialiser Tickets</h3>
            <p className="text-sm text-gray-600 mt-1">Supprimez tous les tickets via l'API GLPI.</p>

            <div className="mt-4">
                <button
                    onClick={handleResetTickets}
                    disabled={running}
                    className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 disabled:opacity-50"
                >
                    {running ? 'Suppression en cours…' : 'Supprimer tous les tickets'}
                </button>
            </div>

            {running && (
                <div className="mt-3 text-sm text-gray-700">Progress: {progress.done}/{progress.total} — last ID: {progress.lastId}</div>
            )}

            {message && <div className="mt-3 text-sm text-gray-700">{message}</div>}
        </div>
    )
}

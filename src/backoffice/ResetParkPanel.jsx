import React, { useState } from 'react'
import { resetItems } from '../api/glpi'

const CATEGORIES = [
    { label: 'Périphériques', type: 'Peripheral' },
    { label: 'Ordinateurs', type: 'Computer' },
    { label: 'Téléphones', type: 'Phone' },
    { label: 'Moniteurs', type: 'Monitor' },
    { label: 'Imprimantes', type: 'Printer' },
    { label: 'Réseau', type: 'NetworkEquipment' },
    { label: 'Logiciels', type: 'Software' }
]

export default function ResetParkPanel() {
    const [running, setRunning] = useState(false)
    const [progress, setProgress] = useState({ done: 0, total: 0, lastId: null })
    const [message, setMessage] = useState(null)

    async function handleReset(typeLabel, type) {
        const ok = window.confirm(`Confirmez-vous la suppression des éléments: ${typeLabel} ? Cette action est irréversible.`)
        if (!ok) return

        setRunning(true)
        setMessage(null)
        setProgress({ done: 0, total: 0, lastId: null })

        try {
            const result = await resetItems(type, (done, total, lastId) => {
                setProgress({ done, total, lastId })
            })
            setMessage(`Suppression terminée : ${result.deleted}/${result.total} (${typeLabel})`)
        } catch (e) {
            setMessage(`Erreur: ${e.message}`)
        } finally {
            setRunning(false)
        }
    }

    return (
        <div className="bg-white p-4 rounded-lg shadow-sm border">
            <h3 className="text-md font-semibold text-warm-800">Réinitialiser éléments du parc</h3>
            <p className="text-sm text-gray-600 mt-1">Sélectionnez une catégorie à réinitialiser.</p>

            <div className="mt-4 grid gap-3">
                {CATEGORIES.map((c) => (
                    <div key={c.type} className="flex items-center justify-between gap-3 bg-gray-50 p-2 rounded">
                        <div className="text-sm text-gray-700">{c.label}</div>
                        <button
                            className="px-3 py-1 text-sm bg-red-500 text-white rounded hover:bg-red-600 disabled:opacity-50"
                            onClick={() => handleReset(c.label, c.type)}
                            disabled={running}
                        >
                            {running ? 'En cours…' : 'Supprimer'}
                        </button>
                    </div>
                ))}
            </div>

            {running && (
                <div className="mt-3 text-sm text-gray-700">Progress: {progress.done}/{progress.total} — last ID: {progress.lastId}</div>
            )}
            {message && <div className="mt-3 text-sm text-gray-700">{message}</div>}

        </div>
    )
}

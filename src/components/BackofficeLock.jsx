import React, { useState } from 'react'

export default function BackofficeLock({ onUnlock }) {
    const [code, setCode] = useState('')
    const [error, setError] = useState(null)

    function handleSubmit(e) {
        e.preventDefault()
        const secret = import.meta.env.VITE_BACKOFFICE_CODE || ''
        if (!secret) {
            setError('Aucun code backoffice configuré (VITE_BACKOFFICE_CODE manquant)')
            return
        }
        if (code === secret) {
            sessionStorage.setItem('backoffice_unlocked', '1')
            onUnlock(true)
        } else {
            setError('Code incorrect')
        }
    }

    return (
        <div className="max-w-md mx-auto bg-white p-6 rounded shadow">
            <h2 className="text-lg font-semibold text-warm-800">Accès Backoffice</h2>
            <p className="text-sm text-gray-600 mt-2">Saisissez le code unique pour accéder aux pages de gestion.</p>
            <form onSubmit={handleSubmit} className="mt-4">
                <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="Code backoffice" className="w-full p-2 border rounded" />
                <div className="mt-3 flex justify-end">
                    <button className="px-3 py-2 bg-warm-500 text-white rounded">Valider</button>
                </div>
                {error && <div className="mt-2 text-sm text-red-600">{error}</div>}
            </form>
        </div>
    )
}

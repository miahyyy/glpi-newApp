import React, { useEffect, useState, useMemo } from 'react'
import { fetchItems } from '../api/glpi'

const ITEM_TYPES = [
    { label: 'Ordinateurs',   type: 'Computer' },
    { label: 'Téléphones',    type: 'Phone' },
    { label: 'Moniteurs',     type: 'Monitor' },
    { label: 'Imprimantes',   type: 'Printer' },
    { label: 'Réseau',        type: 'NetworkEquipment' },
    { label: 'Périphériques', type: 'Peripheral' },
    { label: 'Logiciels',     type: 'Software' },
]

const STATE_LABELS = {
    1: 'En production',
    2: 'Maintenance',
    3: 'En stock',
    4: 'En panne',
}

const STATE_COLORS = {
    1: 'bg-green-100 text-green-800',
    2: 'bg-yellow-100 text-yellow-800',
    3: 'bg-blue-100 text-blue-800',
    4: 'bg-red-100 text-red-800',
}

const TYPE_ICONS = {
    Computer:        '🖥️',
    Phone:           '📱',
    Monitor:         '🖵',
    Printer:         '🖨️',
    NetworkEquipment:'🔌',
    Peripheral:      '🖱️',
    Software:        '💿',
}

export default function ItemsList() {
    const [items, setItems]       = useState([])
    const [loading, setLoading]   = useState(true)
    const [error, setError]       = useState(null)
    const [searchName, setSearchName]     = useState('')
    const [filterType, setFilterType]     = useState('all')
    const [filterStatus, setFilterStatus] = useState('all')
    const [filterUser, setFilterUser]     = useState('')

    useEffect(() => {
        let mounted = true
        async function load() {
            setLoading(true)
            setError(null)
            try {
                const results = await Promise.allSettled(
                    ITEM_TYPES.map(async ({ type, label }) => {
                        const data = await fetchItems(type)
                        const list = Array.isArray(data) ? data : data.data || []
                        return list.map(item => ({ ...item, _type: type, _typeLabel: label }))
                    })
                )
                if (!mounted) return
                const all = results
                    .filter(r => r.status === 'fulfilled')
                    .flatMap(r => r.value)
                setItems(all)
            } catch (e) {
                if (!mounted) return
                setError(e.message)
            } finally {
                if (mounted) setLoading(false)
            }
        }
        load()
        return () => { mounted = false }
    }, [])

    const filtered = useMemo(() => {
        return items.filter(item => {
            const name   = (item.name || '').toLowerCase()
            const serial = (item.otherserial || '').toLowerCase()
            const query  = searchName.toLowerCase()

            if (searchName && !name.includes(query) && !serial.includes(query)) return false
            if (filterType !== 'all' && item._type !== filterType) return false
            if (filterStatus !== 'all' && String(item.states_id) !== filterStatus) return false
            if (filterUser) {
                const userField = String(item.users_id || item.users_id_tech || '')
                if (!userField.includes(filterUser)) return false
            }
            return true
        })
    }, [items, searchName, filterType, filterStatus, filterUser])

    function handleReset() {
        setSearchName('')
        setFilterType('all')
        setFilterStatus('all')
        setFilterUser('')
    }

    const hasFilter = searchName || filterType !== 'all' || filterStatus !== 'all' || filterUser

    if (loading) return (
        <div className="flex flex-col items-center justify-center py-16 text-gray-400">
            <div className="w-8 h-8 border-2 border-warm-400 border-t-transparent rounded-full animate-spin mb-3" />
            <p className="text-sm">Chargement des éléments…</p>
        </div>
    )

    if (error) return (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm">
            Erreur de chargement : {error}
        </div>
    )

    return (
        <div>
            {/* Barre de recherche multi-critère */}
            <div className="bg-white p-4 rounded-lg shadow-sm border mb-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">
                            Recherche
                        </label>
                        <input
                            type="text"
                            placeholder="Nom ou n° inventaire…"
                            value={searchName}
                            onChange={e => setSearchName(e.target.value)}
                            className="w-full text-sm border rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-warm-400"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">
                            Type d'équipement
                        </label>
                        <select
                            value={filterType}
                            onChange={e => setFilterType(e.target.value)}
                            className="w-full text-sm border rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-warm-400"
                        >
                            <option value="all">Tous les types</option>
                            {ITEM_TYPES.map(({ type, label }) => (
                                <option key={type} value={type}>{label}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">
                            Statut
                        </label>
                        <select
                            value={filterStatus}
                            onChange={e => setFilterStatus(e.target.value)}
                            className="w-full text-sm border rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-warm-400"
                        >
                            <option value="all">Tous les statuts</option>
                            {Object.entries(STATE_LABELS).map(([id, label]) => (
                                <option key={id} value={id}>{label}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">
                            Utilisateur (ID)
                        </label>
                        <input
                            type="text"
                            placeholder="ID utilisateur…"
                            value={filterUser}
                            onChange={e => setFilterUser(e.target.value)}
                            className="w-full text-sm border rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-warm-400"
                        />
                    </div>
                </div>

                <div className="mt-3 flex items-center justify-between">
                    <p className="text-xs text-gray-500">
                        <span className="font-medium text-gray-700">{filtered.length}</span>
                        {' '}élément{filtered.length !== 1 ? 's' : ''} affiché{filtered.length !== 1 ? 's' : ''}
                        {' '}sur <span className="font-medium">{items.length}</span>
                    </p>
                    {hasFilter && (
                        <button
                            onClick={handleReset}
                            className="text-xs text-warm-600 hover:text-warm-800 underline underline-offset-2"
                        >
                            Effacer les filtres
                        </button>
                    )}
                </div>
            </div>

            {/* Grille des éléments */}
            {filtered.length === 0 ? (
                <div className="text-center py-16 text-gray-400">
                    <p className="text-4xl mb-3">🔍</p>
                    <p className="text-sm">Aucun élément ne correspond à votre recherche.</p>
                    {hasFilter && (
                        <button
                            onClick={handleReset}
                            className="mt-3 text-sm text-warm-600 hover:underline"
                        >
                            Réinitialiser les filtres
                        </button>
                    )}
                </div>
            ) : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {filtered.map((item, idx) => {
                        const id         = item.id || item.ID || idx
                        const name       = item.name || `Élément #${id}`
                        const stateId    = item.states_id
                        const stateLabel = STATE_LABELS[stateId] || 'Inconnu'
                        const stateColor = STATE_COLORS[stateId] || 'bg-gray-100 text-gray-600'
                        const serial     = item.otherserial || '—'
                        const icon       = TYPE_ICONS[item._type] || '📦'

                        return (
                            <article
                                key={`${item._type}-${id}`}
                                className="bg-white p-4 rounded-lg shadow-sm border hover:shadow-md transition-shadow"
                            >
                                <div className="flex items-start justify-between gap-2 mb-3">
                                    <div className="flex items-center gap-2 min-w-0">
                                        <span className="text-xl flex-shrink-0">{icon}</span>
                                        <div className="min-w-0">
                                            <h3 className="font-semibold text-warm-800 truncate text-sm">
                                                {name}
                                            </h3>
                                            <p className="text-xs text-gray-400">{item._typeLabel}</p>
                                        </div>
                                    </div>
                                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium whitespace-nowrap flex-shrink-0 ${stateColor}`}>
                                        {stateLabel}
                                    </span>
                                </div>

                                <div className="space-y-1 text-xs text-gray-600 border-t pt-3">
                                    <div className="flex justify-between">
                                        <span className="text-gray-400">N° inventaire</span>
                                        <span className="font-mono">{serial}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-400">ID GLPI</span>
                                        <span>#{id}</span>
                                    </div>
                                    {item.users_id > 0 && (
                                        <div className="flex justify-between">
                                            <span className="text-gray-400">Utilisateur</span>
                                            <span>#{item.users_id}</span>
                                        </div>
                                    )}
                                    {item.locations_id > 0 && (
                                        <div className="flex justify-between">
                                            <span className="text-gray-400">Localisation</span>
                                            <span>#{item.locations_id}</span>
                                        </div>
                                    )}
                                </div>
                            </article>
                        )
                    })}
                </div>
            )}
        </div>
    )
}
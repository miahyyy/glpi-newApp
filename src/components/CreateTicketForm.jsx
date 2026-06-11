import React, { useState, useEffect, useMemo } from 'react'
import { createTicket, fetchItems } from '../api/glpi'

const ITEM_TYPES = [
    { label: 'Ordinateurs',   type: 'Computer' },
    { label: 'Téléphones',    type: 'Phone' },
    { label: 'Moniteurs',     type: 'Monitor' },
    { label: 'Imprimantes',   type: 'Printer' },
    { label: 'Réseau',        type: 'NetworkEquipment' },
    { label: 'Périphériques', type: 'Peripheral' },
    { label: 'Logiciels',     type: 'Software' },
]

const INITIAL_FORM = {
    name:     '',
    content:  '',
    type:     '1',   // 1 = Incident, 2 = Demande
    priority: '3',   // 3 = Normale
    status:   '1',   // 1 = Nouveau
}

export default function CreateTicketForm({ onSuccess }) {
    const [allItems, setAllItems]         = useState([])
    const [loadingItems, setLoadingItems] = useState(true)
    const [form, setForm]                 = useState(INITIAL_FORM)
    const [selectedItems, setSelectedItems] = useState([])
    const [itemSearch, setItemSearch]     = useState('')
    const [submitting, setSubmitting]     = useState(false)
    const [message, setMessage]           = useState(null)   // { type: 'success'|'error', text }

    /* Chargement de tous les éléments du parc */
    useEffect(() => {
        let mounted = true
        async function load() {
            const results = await Promise.allSettled(
                ITEM_TYPES.map(async ({ type, label }) => {
                    const data = await fetchItems(type)
                    const list = Array.isArray(data) ? data : data.data || []
                    return list.map(item => ({ ...item, _type: type, _typeLabel: label }))
                })
            )
            if (!mounted) return
            setAllItems(results.filter(r => r.status === 'fulfilled').flatMap(r => r.value))
            setLoadingItems(false)
        }
        load()
        return () => { mounted = false }
    }, [])

    /* Filtre la liste des éléments par le texte saisi */
    const filteredItems = useMemo(() => {
        if (!itemSearch.trim()) return allItems
        const q = itemSearch.toLowerCase()
        return allItems.filter(item =>
            (item.name || '').toLowerCase().includes(q) ||
            (item.otherserial || '').toLowerCase().includes(q) ||
            item._typeLabel.toLowerCase().includes(q)
        )
    }, [allItems, itemSearch])

    function itemKey(item) {
        return `${item._type}-${item.id || item.ID}`
    }

    function toggleItem(item) {
        const key = itemKey(item)
        setSelectedItems(prev =>
            prev.some(i => itemKey(i) === key)
                ? prev.filter(i => itemKey(i) !== key)
                : [...prev, item]
        )
    }

    function isSelected(item) {
        return selectedItems.some(i => itemKey(i) === itemKey(item))
    }

    function updateField(field, value) {
        setForm(f => ({ ...f, [field]: value }))
        setMessage(null)
    }

    async function handleSubmit(e) {
        e.preventDefault()
        if (!form.name.trim()) {
            setMessage({ type: 'error', text: 'Le titre du ticket est requis.' })
            return
        }
        setSubmitting(true)
        setMessage(null)
        try {
            const payload = {
                name:     form.name.trim(),
                content:  form.content.trim(),
                type:     parseInt(form.type),
                priority: parseInt(form.priority),
                status:   parseInt(form.status),
                urgency:  parseInt(form.priority),
                impact:   2,
            }
            await createTicket(payload)
            /* Note : l'association d'items à un ticket nécessite une API GLPI
               spécifique (POST /Ticket_Item). Si elle est disponible, les IDs
               des éléments sélectionnés seraient envoyés ici. */
            setMessage({ type: 'success', text: `Ticket "${form.name}" créé avec succès !` })
            setForm(INITIAL_FORM)
            setSelectedItems([])
            setItemSearch('')
            if (onSuccess) onSuccess()
        } catch (e) {
            setMessage({ type: 'error', text: `Erreur : ${e.message}` })
        } finally {
            setSubmitting(false)
        }
    }

    return (
        <div className="max-w-2xl mx-auto">
            <form onSubmit={handleSubmit} className="space-y-5">

                {/* Informations du ticket */}
                <div className="bg-white p-5 rounded-lg shadow-sm border">
                    <h3 className="text-sm font-semibold text-gray-700 mb-4 pb-2 border-b">
                        Informations du ticket
                    </h3>

                    <div className="space-y-4">
                        {/* Titre */}
                        <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">
                                Titre <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                value={form.name}
                                onChange={e => updateField('name', e.target.value)}
                                placeholder="Décrivez brièvement le problème ou la demande…"
                                className="w-full text-sm border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-warm-400"
                            />
                        </div>

                        {/* Description */}
                        <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">
                                Description
                            </label>
                            <textarea
                                value={form.content}
                                onChange={e => updateField('content', e.target.value)}
                                placeholder="Détails, étapes pour reproduire, impact…"
                                rows={4}
                                className="w-full text-sm border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-warm-400 resize-none"
                            />
                        </div>

                        {/* Type + Priorité */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1">Type</label>
                                <select
                                    value={form.type}
                                    onChange={e => updateField('type', e.target.value)}
                                    className="w-full text-sm border rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-warm-400"
                                >
                                    <option value="1">Incident</option>
                                    <option value="2">Demande</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1">Priorité</label>
                                <select
                                    value={form.priority}
                                    onChange={e => updateField('priority', e.target.value)}
                                    className="w-full text-sm border rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-warm-400"
                                >
                                    <option value="1">Très basse</option>
                                    <option value="2">Basse</option>
                                    <option value="3">Normale</option>
                                    <option value="4">Haute</option>
                                    <option value="5">Très haute</option>
                                </select>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Association d'éléments */}
                <div className="bg-white p-5 rounded-lg shadow-sm border">
                    <div className="flex items-center justify-between mb-1">
                        <h3 className="text-sm font-semibold text-gray-700">Éléments associés</h3>
                        {selectedItems.length > 0 && (
                            <span className="text-xs bg-warm-100 text-warm-700 px-2 py-0.5 rounded-full font-medium">
                                {selectedItems.length} sélectionné{selectedItems.length > 1 ? 's' : ''}
                            </span>
                        )}
                    </div>
                    <p className="text-xs text-gray-400 mb-3">
                        Cochez les équipements concernés par ce ticket.
                    </p>

                    {/* Tags des éléments sélectionnés */}
                    {selectedItems.length > 0 && (
                        <div className="flex flex-wrap gap-2 mb-3 p-3 bg-warm-50 rounded-lg border border-warm-200">
                            {selectedItems.map(item => (
                                <span
                                    key={itemKey(item)}
                                    className="inline-flex items-center gap-1 bg-white border border-warm-300 text-warm-800 text-xs px-2 py-1 rounded-full"
                                >
                                    {item.name || `#${item.id}`}
                                    <span className="text-gray-400 text-xs">({item._typeLabel})</span>
                                    <button
                                        type="button"
                                        onClick={() => toggleItem(item)}
                                        className="text-warm-400 hover:text-warm-700 ml-0.5 leading-none"
                                        aria-label={`Retirer ${item.name}`}
                                    >×</button>
                                </span>
                            ))}
                        </div>
                    )}

                    {/* Recherche dans les éléments */}
                    <input
                        type="text"
                        placeholder="Filtrer par nom, inventaire ou type…"
                        value={itemSearch}
                        onChange={e => setItemSearch(e.target.value)}
                        className="w-full text-sm border rounded-lg px-3 py-2 mb-2 focus:outline-none focus:ring-2 focus:ring-warm-400"
                    />

                    {/* Liste scrollable */}
                    {loadingItems ? (
                        <div className="flex items-center justify-center py-6 text-gray-400 text-sm border rounded-lg">
                            <div className="w-5 h-5 border-2 border-warm-400 border-t-transparent rounded-full animate-spin mr-2" />
                            Chargement…
                        </div>
                    ) : filteredItems.length === 0 ? (
                        <div className="text-center py-6 text-gray-400 text-sm border rounded-lg">
                            Aucun élément trouvé.
                        </div>
                    ) : (
                        <div className="max-h-52 overflow-y-auto border rounded-lg divide-y">
                            {filteredItems.map((item, idx) => {
                                const id       = item.id || item.ID || idx
                                const selected = isSelected(item)
                                return (
                                    <label
                                        key={`${item._type}-${id}`}
                                        className={`flex items-center gap-3 px-3 py-2 cursor-pointer transition-colors ${
                                            selected ? 'bg-warm-50' : 'hover:bg-gray-50'
                                        }`}
                                    >
                                        <input
                                            type="checkbox"
                                            checked={selected}
                                            onChange={() => toggleItem(item)}
                                            className="accent-warm-500 w-4 h-4 flex-shrink-0"
                                        />
                                        <span className="flex-1 text-sm text-gray-700 truncate">
                                            {item.name || `Élément #${id}`}
                                        </span>
                                        <span className="text-xs text-gray-400 flex-shrink-0">
                                            {item._typeLabel}
                                        </span>
                                        {item.otherserial && (
                                            <span className="text-xs font-mono text-gray-400 flex-shrink-0">
                                                {item.otherserial}
                                            </span>
                                        )}
                                    </label>
                                )
                            })}
                        </div>
                    )}
                </div>

                {/* Message de retour + bouton */}
                <div className="flex items-center gap-4">
                    {message && (
                        <p className={`text-sm flex-1 ${
                            message.type === 'error' ? 'text-red-600' : 'text-green-600'
                        }`}>
                            {message.type === 'success' ? '✓ ' : '⚠ '}
                            {message.text}
                        </p>
                    )}
                    <button
                        type="submit"
                        disabled={submitting}
                        className="ml-auto px-6 py-2 bg-warm-500 text-white rounded-lg text-sm font-medium hover:bg-warm-600 disabled:opacity-50 transition-colors flex-shrink-0"
                    >
                        {submitting ? (
                            <span className="flex items-center gap-2">
                                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                Création…
                            </span>
                        ) : 'Créer le ticket'}
                    </button>
                </div>
            </form>
        </div>
    )
}
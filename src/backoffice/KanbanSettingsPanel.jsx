import React, { useState, useEffect } from 'react'
import { fetchKanbanSettings, saveKanbanSettings } from '../api/glpi'

const FIELDS = [
  { key: 'color_new',        label: 'Couleur — Nouveau',          type: 'color' },
  { key: 'color_inprogress', label: 'Couleur — En cours',         type: 'color' },
  { key: 'color_closed',     label: 'Couleur — Clos',             type: 'color' },
  { key: 'label_new',        label: 'Nom malgache — Nouveau',     type: 'text', placeholder: 'vaovao' },
  { key: 'label_inprogress', label: 'Nom malgache — En cours',    type: 'text', placeholder: 'efa manao' },
  { key: 'label_closed',     label: 'Nom malgache — Clos',        type: 'text', placeholder: 'vita' },
]

const DEFAULTS = {
  color_new: '#dbeafe', color_inprogress: '#fef9c3', color_closed: '#f3f4f6',
  label_new: 'vaovao', label_inprogress: 'efa manao', label_closed: 'vita'
}

export default function KanbanSettingsPanel() {
  const [settings, setSettings] = useState(DEFAULTS)
  const [loading, setLoading]   = useState(true)
  const [saving, setSaving]     = useState(false)
  const [message, setMessage]   = useState(null)

  useEffect(() => {
    fetchKanbanSettings()
      .then(data => data && setSettings(prev => ({ ...prev, ...data })))
      .catch(e => setMessage({ type: 'error', text: e.message }))
      .finally(() => setLoading(false))
  }, [])

  async function handleSave() {
    setSaving(true)
    setMessage(null)
    try {
      await saveKanbanSettings(settings)
      setMessage({ type: 'success', text: 'Paramètres sauvegardés avec succès.' })
    } catch (e) {
      setMessage({ type: 'error', text: e.message })
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="text-gray-500 text-sm p-4">Chargement…</div>

  return (
    <div className="bg-white p-4 rounded-lg shadow-sm border">
      <h3 className="text-md font-semibold text-warm-800 mb-1">Personnalisation du Kanban</h3>
      <p className="text-sm text-gray-500 mb-4">Couleurs de fond et noms en malgache des colonnes (stockés en SQLite).</p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {FIELDS.map(field => (
          <div key={field.key}>
            <label className="block text-xs font-medium text-gray-600 mb-1">{field.label}</label>
            {field.type === 'color' ? (
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={settings[field.key] || '#ffffff'}
                  onChange={e => setSettings(prev => ({ ...prev, [field.key]: e.target.value }))}
                  className="w-10 h-10 rounded border cursor-pointer p-0.5"
                />
                <div
                  className="flex-1 h-10 rounded-lg border text-xs flex items-center px-3 font-mono text-gray-500"
                  style={{ backgroundColor: settings[field.key] }}
                >
                  {settings[field.key]}
                </div>
              </div>
            ) : (
              <input
                type="text"
                value={settings[field.key] || ''}
                onChange={e => setSettings(prev => ({ ...prev, [field.key]: e.target.value }))}
                placeholder={field.placeholder}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-warm-400"
              />
            )}
          </div>
        ))}
      </div>

      {/* Preview */}
      <div className="mt-4 p-3 rounded-lg border bg-gray-50">
        <p className="text-xs text-gray-500 mb-2 font-medium">Aperçu des colonnes</p>
        <div className="grid grid-cols-3 gap-2">
          {[
            { color: settings.color_new,        label: 'Nouveau',   ml: settings.label_new },
            { color: settings.color_inprogress, label: 'En cours',  ml: settings.label_inprogress },
            { color: settings.color_closed,     label: 'Clos',      ml: settings.label_closed },
          ].map(col => (
            <div key={col.label} className="rounded-lg p-2 border text-center text-xs" style={{ backgroundColor: col.color }}>
              <div className="font-medium text-gray-700">{col.label}</div>
              <div className="text-gray-500 italic">{col.ml}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-4 flex items-center gap-4">
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-4 py-2 bg-warm-500 text-white rounded-lg text-sm hover:bg-warm-600 disabled:opacity-50"
        >
          {saving ? 'Sauvegarde…' : 'Sauvegarder'}
        </button>
        {message && (
          <p className={`text-sm ${message.type === 'error' ? 'text-red-600' : 'text-green-600'}`}>
            {message.text}
          </p>
        )}
      </div>
    </div>
  )
}
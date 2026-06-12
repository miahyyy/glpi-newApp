import React, { useEffect, useState } from 'react'
import { fetchTickets, updateTicketStatus, fetchKanbanSettings,saveTicketCost } from '../api/glpi'
import TicketDetailModal from './TicketDetailModal'
import CreateTicketForm from './CreateTicketForm'



const COLUMNS = [
  { id: 1, label: 'Nouveau',   colorKey: 'color_new',        labelKey: 'label_new' },
  { id: 2, label: 'En cours',  colorKey: 'color_inprogress',  labelKey: 'label_inprogress' },
  { id: 5, label: 'Clos',      colorKey: 'color_closed',      labelKey: 'label_closed' },
]

const PRIORITY_DOT = {
  5: 'bg-red-500', 4: 'bg-orange-400', 3: 'bg-green-400',
  2: 'bg-blue-300', 1: 'bg-gray-300'
}

const DEFAULT_SETTINGS = {
  color_new: '#dbeafe', color_inprogress: '#fef9c3', color_closed: '#f3f4f6',
  label_new: 'vaovao', label_inprogress: 'efa manao', label_closed: 'vita'
}

export default function KanbanBoard() {
  const [tickets, setTickets]       = useState([])
  const [settings, setSettings]     = useState(DEFAULT_SETTINGS)
  const [loading, setLoading]       = useState(true)
  const [error, setError]           = useState(null)
  const [selectedTicket, setSelectedTicket] = useState(null)
  const [showCreate, setShowCreate] = useState(false)
  const [dialog, setDialog]         = useState(null)   // { ticket, targetStatus }
  const [dialogValue, setDialogValue] = useState('')
  const [draggedId, setDraggedId]   = useState(null)
  const [refreshKey, setRefreshKey] = useState(0)
  const [dialogSuperCost, setDialogSuperCost] = useState('')

  useEffect(() => {
    setLoading(true)
    Promise.allSettled([fetchTickets(), fetchKanbanSettings()])
      .then(([tRes, sRes]) => {
        if (tRes.status === 'fulfilled') {
          const list = Array.isArray(tRes.value) ? tRes.value : tRes.value?.data || []
          setTickets(list)
        } else {
          setError(tRes.reason?.message)
        }
        if (sRes.status === 'fulfilled' && sRes.value)
          setSettings(prev => ({ ...prev, ...sRes.value }))
      })
      .finally(() => setLoading(false))
  }, [refreshKey])

  const colTickets = (statusId) =>
    tickets.filter(t => String(t.status ?? t.fk_state) === String(statusId))

  function onDragStart(e, ticket) {
    setDraggedId(ticket.id ?? ticket.ID)
    e.dataTransfer.effectAllowed = 'move'
  }

  function onDragOver(e) { e.preventDefault(); e.dataTransfer.dropEffect = 'move' }

  function onDrop(e, targetStatusId) {
    e.preventDefault()
    const ticket = tickets.find(t => (t.id ?? t.ID) === draggedId)
    if (!ticket) return
    if (String(ticket.status ?? ticket.fk_state) === String(targetStatusId)) return

    // Moving to "Clos" requires extra info
    if (targetStatusId === 5) {
      setDialog({ ticket, targetStatus: targetStatusId })
      setDialogValue('')
    } else {
      applyStatusChange(ticket, targetStatusId)
    }
    setDraggedId(null)
  }

  async function applyStatusChange(ticket, targetStatus, extra = {}) {
    const id = ticket.id ?? ticket.ID
    const prevStatus = ticket.status ?? ticket.fk_state
    setTickets(prev => prev.map(t => (t.id ?? t.ID) === id ? { ...t, status: targetStatus } : t))
    try {
      await updateTicketStatus(id, targetStatus, extra)
    } catch (e) {
      setTickets(prev => prev.map(t => (t.id ?? t.ID) === id ? { ...t, status: prevStatus } : t))
      alert(`Erreur lors du changement de statut : ${e.message}`)
    }
  }

  async function confirmDialog() {
    if (!dialog) return
    const cost = parseFloat(dialogSuperCost)

    if (isNaN(cost) || cost < 0){
      alert('Coût invalide')
      return
    }

    const id = dialog.ticket.id ?? dialog.ticket.ID
    applyStatusChange(dialog.ticket, dialog.targetStatus, { solution: dialogValue })

    try {
        await saveTicketCost(id, cost)
    } catch (e) {
      console.error('Tsy mety ee')
    }
    setDialog(null)
    setDialogValue('')
    setDialogSuperCost('')
  }

  if (loading) return (
    <div className="flex items-center justify-center py-16 text-gray-400">
      <div className="w-8 h-8 border-2 border-warm-400 border-t-transparent rounded-full animate-spin mr-3" />
      Chargement du Kanban…
    </div>
  )
  if (error) return <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm">Erreur : {error}</div>

  return (
    <div>
      {/* Toolbar */}
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-lg font-semibold text-warm-800">Tableau Kanban</h3>
        <button
          onClick={() => setShowCreate(true)}
          className="px-4 py-2 bg-warm-500 text-white rounded-lg text-sm font-medium hover:bg-warm-600 shadow-sm"
        >
          + Ajouter 1 ticket
        </button>
      </div>

      {/* Columns */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {COLUMNS.map(col => {
          const list   = colTickets(col.id)
          const bg     = settings[col.colorKey]
          const mlLabel = settings[col.labelKey]
          return (
            <div
              key={col.id}
              className="rounded-xl border shadow-sm flex flex-col min-h-96"
              style={{ backgroundColor: bg }}
              onDragOver={onDragOver}
              onDrop={e => onDrop(e, col.id)}
            >
              {/* Header */}
              <div className="p-3 border-b bg-white/70 rounded-t-xl flex items-center justify-between">
                <div>
                  <span className="font-semibold text-sm text-gray-800">{col.label}</span>
                  <span className="ml-2 text-xs text-gray-400 italic">{mlLabel}</span>
                </div>
                <span className="bg-white text-gray-700 text-xs font-bold px-2 py-0.5 rounded-full border">
                  {list.length}
                </span>
              </div>

              {/* Cards */}
              <div className="p-3 flex flex-col gap-2 flex-1">
                {list.length === 0 && (
                  <p className="text-xs text-gray-400 text-center mt-6 italic">Aucun ticket</p>
                )}
                {list.map(ticket => {
                  const id    = ticket.id ?? ticket.ID
                  const title = ticket.name ?? ticket.title ?? `#${id}`
                  return (
                    <div
                      key={id}
                      draggable
                      onDragStart={e => onDragStart(e, ticket)}
                      onClick={() => setSelectedTicket(ticket)}
                      className="bg-white rounded-lg p-3 shadow-sm border cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow select-none"
                    >
                      <p className="text-xs text-gray-400 mb-1">#{id}</p>
                      <p className="text-sm font-medium text-gray-800 line-clamp-2">{title}</p>
                      {ticket.content && (
                        <p className="text-xs text-gray-500 mt-1 line-clamp-1">{ticket.content}</p>
                      )}
                      <div className="flex items-center justify-between mt-2 text-xs text-gray-400">
                        <span>{ticket.date ?? ticket.date_creation ?? ''}</span>
                        {ticket.priority && (
                          <span className={`w-2 h-2 rounded-full ${PRIORITY_DOT[ticket.priority] ?? 'bg-gray-300'}`} />
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>

      {/* Detail modal */}
      {selectedTicket && (
        <TicketDetailModal ticket={selectedTicket} onClose={() => setSelectedTicket(null)} />
      )}

      {/* Create modal */}
      {showCreate && (
        <div
          className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4"
          onClick={e => e.target === e.currentTarget && setShowCreate(false)}
        >
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-warm-800">Créer un ticket</h2>
              <button onClick={() => setShowCreate(false)} className="text-gray-400 hover:text-gray-700 text-2xl leading-none">×</button>
            </div>
            <CreateTicketForm onSuccess={() => { setShowCreate(false); setRefreshKey(k => k + 1) }} />
          </div>
        </div>
      )}

      {/* Status-change dialog (closing a ticket) */}
      {/* {dialog && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6">
            <h2 className="text-lg font-semibold mb-2">Clôturer le ticket</h2>
            <p className="text-sm text-gray-600 mb-4">
              Saisissez la solution ou le motif de clôture pour <strong>«&nbsp;{dialog.ticket.name}&nbsp;»</strong>.
            </p>
            <textarea
              value={dialogValue}
              onChange={e => setDialogValue(e.target.value)}
              placeholder="Solution / motif de clôture…"
              rows={3}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-warm-400 resize-none"
            />

            Super Cost: <input type="number" name="" id="" value={e => dialogSuperCost(e.target.value)} />
            <div className="flex justify-end gap-3 mt-4">
              <button onClick={() => {setDialog(null); setDialogValue(''); setDialogSuperCost('')}} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">
                Annuler
              </button>
              <button onClick={confirmDialog} className="px-4 py-2 bg-warm-500 text-white rounded-lg text-sm hover:bg-warm-600">
                Confirmer
              </button>
            </div>
          </div>
        </div>
      )} */}

      {dialog && (
  <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
    <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6">
      <h2 className="text-lg font-semibold mb-1">Clôturer le ticket</h2>
      <p className="text-sm text-gray-500 mb-4">
        Ticket : <strong>«&nbsp;{dialog.ticket.name}&nbsp;»</strong>
      </p>

      {/* Solution */}
      <label className="block text-xs font-medium text-gray-600 mb-1">
        Solution / motif de clôture
      </label>
      <textarea
        value={dialogValue}
        onChange={e => setDialogValue(e.target.value)}
        placeholder="Décrivez la résolution…"
        rows={3}
        className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-warm-400 resize-none mb-4"
      />

      {/* Coût */}
      <label className="block text-xs font-medium text-gray-600 mb-1">
        Coût de clôture <span className="text-red-500">*</span>
        <span className="ml-1 text-gray-400 font-normal">(super_cost, en €)</span>
      </label>
      <input
        type="number"
        min="0"
        step="0.01"
        value={dialogSuperCost}
        onChange={e => setDialogSuperCost(e.target.value)}
        placeholder="Ex : 150.00"
        className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-warm-400"
      />

      <div className="flex justify-end gap-3 mt-5">
        <button
          onClick={() => { setDialog(null); setDialogValue(''); setDialogSuperCost('') }}
          className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
        >
          Annuler
        </button>
        <button
          onClick={confirmDialog}
          className="px-4 py-2 bg-warm-500 text-white rounded-lg text-sm hover:bg-warm-600"
        >
          Confirmer la clôture
        </button>
      </div>
    </div>
  </div>
)}
    </div>
  )
}
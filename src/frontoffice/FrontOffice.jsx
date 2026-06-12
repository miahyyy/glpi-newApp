// import React from 'react'
// import TicketsList from '../components/TicketsList'

// export default function FrontOffice() {
//     return (
//         <div className="container mx-auto px-4 py-8">
//             <header className="mb-6">
//                 <h2 className="text-2xl font-semibold text-warm-800">Front Office</h2>
//                 <p className="text-gray-600 mt-2">Liste des éléments et création de tickets (front office)</p>
//             </header>

//             <TicketsList />
//         </div>
//     )
// }


import React, { useState } from 'react'
import ItemsList         from '../components/ItemsList'
import TicketsList       from '../components/TicketsList'
import CreateTicketForm  from '../components/CreateTicketForm'
import TicketDetailModal from '../components/TicketDetailModal'
import KanbanBoard from '../components/KanbanBoard'

const TABS = [
    { id: 'items',   label: 'Éléments du parc', icon: '🖥️' },
    { id: 'tickets', label: 'Tickets',           icon: '🎫' },
    { id: 'kanban',  label: 'Kanban',            icon: '📋' },
    { id: 'create',  label: 'Créer un ticket',   icon: '+' },
]

export default function FrontOffice() {
    const [activeTab,      setActiveTab]      = useState('items')
    const [selectedTicket, setSelectedTicket] = useState(null)
    const [ticketsKey,     setTicketsKey]     = useState(0)   // forcer le rechargement après création

    function handleTicketCreated() {
        setTicketsKey(k => k + 1)
        setActiveTab('tickets')
    }

    return (
        <div className="container mx-auto px-4 py-8">

            {/* En-tête */}
            <header className="mb-6">
                <h2 className="text-2xl font-semibold text-warm-800">Front Office</h2>
                <p className="text-gray-500 mt-1 text-sm">
                    Consultez les équipements, suivez vos tickets et signalez un incident.
                </p>
            </header>

            {/* Barre d'onglets */}
            <div className="flex gap-1 border-b mb-6 overflow-x-auto">
                {TABS.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-t-lg border-b-2 transition-colors whitespace-nowrap ${
                            activeTab === tab.id
                                ? 'border-warm-500 text-warm-700 bg-warm-50'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                        }`}
                    >
                        <span>{tab.icon}</span>
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Contenu des onglets */}
            {activeTab === 'items' && (
                <ItemsList />
            )}

            {activeTab === 'tickets' && (
                <TicketsList
                    key={ticketsKey}
                    onSelect={ticket => setSelectedTicket(ticket)}
                />
            )}

            {activeTab === 'create' && (
                <CreateTicketForm onSuccess={handleTicketCreated} />
            )}

            {activeTab === 'kanban' && (
                <KanbanBoard />
            )}

            {/* Modal détail ticket */}
            {selectedTicket && (
                <TicketDetailModal
                    ticket={selectedTicket}
                    onClose={() => setSelectedTicket(null)}
                />
            )}
        </div>
    )
}

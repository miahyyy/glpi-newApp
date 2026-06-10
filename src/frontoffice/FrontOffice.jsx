import React from 'react'
import TicketsList from '../components/TicketsList'

export default function FrontOffice() {
    return (
        <div className="container mx-auto px-4 py-8">
            <header className="mb-6">
                <h2 className="text-2xl font-semibold text-warm-800">Front Office</h2>
                <p className="text-gray-600 mt-2">Liste des éléments et création de tickets (front office)</p>
            </header>

            <TicketsList />
        </div>
    )
}

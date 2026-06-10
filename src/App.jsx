import React, { useState } from 'react'
import Navbar from './components/Navbar'
import TicketsList from './components/TicketsList'
import ResetPage from './backoffice/ResetPage'
import ImportPage from './backoffice/ImportPage'
import BackofficeLock from './backoffice/BackofficeLock'
import BackOffice from './backoffice/BackOffice'
import FrontOffice from './frontoffice/FrontOffice'

export default function App() {
    const [page, setPage] = useState('home')

    const [backofficeUnlocked, setBackofficeUnlocked] = React.useState(Boolean(sessionStorage.getItem('backoffice_unlocked')))

    return (
        <div className="min-h-screen flex flex-col">
            <Navbar onNavigate={setPage} />
            <main className="flex-1 container mx-auto px-4 py-8">
                {page === 'backoffice' && (
                    backofficeUnlocked ? <BackOffice /> : <BackofficeLock onUnlock={setBackofficeUnlocked} />
                )}

                {page === 'home' && <FrontOffice />}

                {page === 'reset' && (
                    backofficeUnlocked ? <ResetPage /> : <BackofficeLock onUnlock={setBackofficeUnlocked} />
                )}

                {page === 'import' && (
                    backofficeUnlocked ? (
                        <React.Suspense fallback={<div>Loading import...</div>}>
                            <ImportPage />
                        </React.Suspense>
                    ) : (
                        <BackofficeLock onUnlock={setBackofficeUnlocked} />
                    )
                )}
            </main>
            <footer className="bg-white/60 border-t py-4 text-center text-sm text-gray-600">
                Built for GLPI — sample React front-end
            </footer>
        </div>
    )
}

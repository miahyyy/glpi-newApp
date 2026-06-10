import React from 'react'

export default function Navbar({ onNavigate }) {
    return (
        <nav className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b shadow-sm">
            <div className="container mx-auto px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-md bg-gradient-to-br from-warm-400 to-warm-600 flex items-center justify-center text-white font-bold shadow">G</div>
                    <div>
                        <div className="font-semibold">GLPI React</div>
                        <div className="text-xs text-gray-500">Connected UI</div>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <button onClick={() => onNavigate('backoffice')} className="text-sm text-gray-700 hover:text-warm-700">Admin Dashboard</button>
                    <button onClick={() => onNavigate('home')} className="text-sm text-gray-700 hover:text-warm-700">FrontOffice Dashboard</button>
                    <button onClick={() => onNavigate('import')} className="text-sm text-gray-700 hover:text-warm-700">Import</button>
                    <button onClick={() => onNavigate('reset')} className="text-sm text-gray-700 hover:text-warm-700">Reset Data</button>
                    <button className="ml-2 px-3 py-1.5 bg-warm-500 text-white rounded shadow-sm hover:bg-warm-600 text-sm">Refresh</button>
                </div>
            </div>
        </nav>
    )
}

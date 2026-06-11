import React, { useState } from 'react'
import { createItem, createTicket, uploadDocument } from '../api/glpi'

export default function ImportPage() {
    const [csvFiles, setCsvFiles] = useState([])
    const [zipFile, setZipFile] = useState(null)
    const [parsedCounts, setParsedCounts] = useState({})
    const [imagesMap, setImagesMap] = useState({})
    const [message, setMessage] = useState(null)

    async function handleCsvChange(e) {
        const files = Array.from(e.target.files)
        setCsvFiles(files)
        const counts = {}
        for (const f of files) {
            try {
                const text = await f.text()
                const lines = text.split(/\r?\n/).filter(Boolean)
                counts[f.name] = lines.length
            } catch (e) {
                counts[f.name] = 0
            }
        }
        setParsedCounts(counts)
    }

    async function handleZipChange(e) {
        const f = e.target.files[0]
        setZipFile(f)
        if (!f) return
        // We don't extract ZIP client-side anymore; server will handle it with adm-zip.
        setImagesMap({})
    }

    function buildPreviewCounts() {
        const counts = { items: 0, tickets: 0, byType: {} }
        Object.entries(parsedCounts).forEach(([name, n]) => {
            // We can't infer types client-side; just increment items by total rows
            counts.items += n || 0
        })
        return counts
    }

    function handleExportJSON() {
        const payload = { parsed, images: Object.keys(imagesMap) }
        const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = 'import-preview.json'
        a.click()
        URL.revokeObjectURL(url)
    }

    async function handleImportToGLPI() {
        setMessage(null)

        // prefer server-side import endpoint if configured
        const endpoint = import.meta.env.VITE_BACKEND_URL
        try {
            const form = new FormData()
            // attach csv files: prefer file inputs if present, else recreate from parsed
            if (csvFiles && csvFiles.length) {
                // server expects fields csvData1, csvData2, csvData3
                for (let i = 0; i < 3; i++) {
                    if (csvFiles[i]) form.append(`csvData${i + 1}`, csvFiles[i])
                }
            } else {
                setMessage('Aucun fichier CSV chargé')
                return
            }

            if (zipFile) form.append('imageZip', zipFile)

            setMessage('Envoi des fichiers au serveur d\'import...')

            const res = await fetch(`${endpoint}/api/import`, { method: 'POST', body: form })
            const json = await res.json()
            if (!res.ok) {
                setMessage(`Import failed: ${json?.message || res.statusText}`)
            } else {
                setMessage(`Import terminé: ${json.message || 'OK'}`)
            }
        } catch (e) {
            setMessage(`Erreur import: ${e.message}`)
        }
    }

    return (
        <div className="container mx-auto px-4 py-8">
            <header className="mb-6">
                <h1 className="text-2xl font-semibold text-warm-800">Import CSV / Images</h1>
                <p className="text-gray-600 mt-2">Chargez les 3 fichiers CSV et le ZIP d'images. Les images sont associées par nom (`Name`).</p>
            </header>

            <div className="grid grid-cols-1 gap-6">
                <div className="bg-white p-4 rounded shadow-sm border">
                    <label className="block text-sm font-medium text-gray-700">CSV files (select all 3)</label>
                    <input type="file" accept="text/csv" multiple onChange={handleCsvChange} className="mt-2" />
                </div>

                <div className="bg-white p-4 rounded shadow-sm border">
                    <label className="block text-sm font-medium text-gray-700">Images ZIP</label>
                    <input type="file" accept=".zip" onChange={handleZipChange} className="mt-2" />
                </div>

                <div className="bg-white p-4 rounded shadow-sm border">
                    <h3 className="font-semibold text-warm-800">Preview</h3>
                    <div className="mt-2 text-sm text-gray-700">
                        <div>CSV files loaded: {csvFiles.length}</div>
                        <div>Images ZIP selected: {zipFile ? zipFile.name : '—'}</div>
                        <div className="mt-2">
                            {Object.entries(buildPreviewCounts()).map(([k, v]) => (
                                <div key={k} className="text-sm text-gray-700">{k}: {JSON.stringify(v)}</div>
                            ))}
                        </div>
                    </div>

                    <div className="mt-4 flex gap-3">
                        <button onClick={handleExportJSON} className="px-3 py-2 bg-warm-500 text-white rounded">Export JSON</button>
                        <button onClick={handleImportToGLPI} className="px-3 py-2 bg-gray-200 rounded">Import to GLPI</button>
                    </div>

                    {message && <div className="mt-3 text-sm text-red-600">{message}</div>}
                </div>

                <div className="bg-white p-4 rounded shadow-sm border">
                    <h3 className="font-semibold text-warm-800">Sample rows (first 5 per file)</h3>
                    <div className="mt-2 space-y-4">
                        {Object.entries(parsedCounts).length === 0 && <div className="text-sm text-gray-600">Aperçu détaillé non disponible en local — le serveur utilise `csv-parser` et `adm-zip`.</div>}
                        {Object.entries(parsedCounts).map(([name, count]) => (
                            <div key={name}>
                                <div className="font-medium">{name} — {count} rows (preview limited)</div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    )
}

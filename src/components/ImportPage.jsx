import React, { useState } from 'react'
import Papa from 'papaparse'
import JSZip from 'jszip'
import { createItem, createTicket, uploadDocument } from '../api/glpi'

export default function ImportPage() {
    const [csvFiles, setCsvFiles] = useState([])
    const [zipFile, setZipFile] = useState(null)
    const [parsed, setParsed] = useState({})
    const [imagesMap, setImagesMap] = useState({})
    const [message, setMessage] = useState(null)

    async function handleCsvChange(e) {
        const files = Array.from(e.target.files)
        setCsvFiles(files)
        const results = {}

        for (const f of files) {
            const text = await f.text()
            const parsedCsv = Papa.parse(text, { header: true, skipEmptyLines: true })
            results[f.name] = parsedCsv.data
        }

        setParsed(results)
    }

    async function handleZipChange(e) {
        const f = e.target.files[0]
        setZipFile(f)
        if (!f) return
        const content = await f.arrayBuffer()
        const zip = await JSZip.loadAsync(content)
        const map = {}
        const files = Object.keys(zip.files)
        for (const name of files) {
            if (zip.files[name].dir) continue
            const fileData = await zip.files[name].async('base64')
            // store as data URL (attempt to detect type)
            map[name] = `data:application/octet-stream;base64,${fileData}`
        }
        setImagesMap(map)
    }

    function buildPreviewCounts() {
        const counts = { items: 0, tickets: 0, byType: {} }
        Object.values(parsed).forEach((rows) => {
            rows.forEach((r) => {
                if (r.Item_Type) {
                    counts.items += 1
                    counts.byType[r.Item_Type] = (counts.byType[r.Item_Type] || 0) + 1
                } else if (r.Ticket || r.Ticket_ID || r.Subject) {
                    counts.tickets += 1
                }
            })
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
        const endpoint = import.meta.env.VITE_IMPORT_ENDPOINT || '/api/import'
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

            const res = await fetch(endpoint, { method: 'POST', body: form })
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
                        <div>CSV files loaded: {Object.keys(parsed).length}</div>
                        <div>Images in ZIP: {Object.keys(imagesMap).length}</div>
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
                        {Object.entries(parsed).map(([name, rows]) => (
                            <div key={name}>
                                <div className="font-medium">{name} — {rows.length} rows</div>
                                <table className="w-full text-sm mt-2 border">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            {rows[0] && Object.keys(rows[0]).slice(0, 8).map((h) => (<th key={h} className="p-1 border">{h}</th>))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {rows.slice(0, 5).map((r, i) => (
                                            <tr key={i} className="odd:bg-white even:bg-gray-50">
                                                {Object.values(r).slice(0, 8).map((v, j) => (<td key={j} className="p-1 border">{v}</td>))}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    )
}

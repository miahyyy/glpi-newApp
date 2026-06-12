const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, '../kanban.db'));

db.exec(`
  CREATE TABLE IF NOT EXISTS kanban_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  )
`);

const DEFAULTS = {
  color_new: '#dbeafe',
  color_inprogress: '#fef9c3',
  color_closed: '#f3f4f6',
  label_new: 'vaovao',
  label_inprogress: 'efa manao',
  label_closed: 'vita'
};

const ins = db.prepare('INSERT OR IGNORE INTO kanban_settings (key, value) VALUES (?, ?)');
for (const [k, v] of Object.entries(DEFAULTS)) ins.run(k, v);

module.exports = {
  getAllSettings: () => {
    const rows = db.prepare('SELECT key, value FROM kanban_settings').all();
    return Object.fromEntries(rows.map(r => [r.key, r.value]));
  },
  setSetting: (key, value) => {
    db.prepare('INSERT OR REPLACE INTO kanban_settings (key, value) VALUES (?, ?)').run(key, value);
  }
};
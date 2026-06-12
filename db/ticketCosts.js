const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, '../kanban.db'));

db.exec(`
  CREATE TABLE IF NOT EXISTS ticket_costs (
    ticket_id   INTEGER PRIMARY KEY,
    super_cost  REAL    NOT NULL DEFAULT 0,
    updated_at  TEXT    DEFAULT (datetime('now'))
  )
`);

module.exports = {
  saveCost: (ticketId, superCost) => {
    db.prepare(`
      INSERT INTO ticket_costs (ticket_id, super_cost, updated_at)
      VALUES (?, ?, datetime('now'))
      ON CONFLICT(ticket_id) DO UPDATE SET
        super_cost = excluded.super_cost,
        updated_at = excluded.updated_at
    `).run(Number(ticketId), parseFloat(superCost));
  },
  getCost: (ticketId) =>
    db.prepare('SELECT super_cost FROM ticket_costs WHERE ticket_id = ?').get(Number(ticketId)),
  getAllCosts: () =>
    db.prepare('SELECT * FROM ticket_costs ORDER BY updated_at DESC').all()
};
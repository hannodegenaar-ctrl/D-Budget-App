const express = require('express');
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const app = express();
app.use(express.json({ limit: '10mb' }));
app.use(express.static('public'));

// Railway persistent volume mounts at /data, fallback to local for dev
const dataDir = fs.existsSync('/data') ? '/data' : path.join(__dirname, '.data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const db = new Database(path.join(dataDir, 'budget.db'));

// Init tables
db.exec(`
  CREATE TABLE IF NOT EXISTS transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    amount REAL NOT NULL,
    category TEXT NOT NULL,
    note TEXT,
    date TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS budgets (
    category TEXT PRIMARY KEY,
    amount REAL NOT NULL
  );
`);

// Seed default budgets if empty
const budgetCount = db.prepare('SELECT COUNT(*) as c FROM budgets').get();
if (budgetCount.c === 0) {
  const defaults = [
    ['House', 12000],
    ['Savings', 5000],
    ['Groceries', 4000],
    ['Spending Money', 3000],
    ['Date Nights', 1500],
    ['Transport', 2500],
    ['Subscriptions', 800],
    ['Other', 1000]
  ];
  const insert = db.prepare('INSERT INTO budgets (category, amount) VALUES (?, ?)');
  defaults.forEach(([cat, amt]) => insert.run(cat, amt));
}

// ── API routes ──────────────────────────────────────────

// GET all budgets
app.get('/api/budgets', (req, res) => {
  const rows = db.prepare('SELECT * FROM budgets').all();
  res.json(rows);
});

// PUT update a budget amount
app.put('/api/budgets/:category', (req, res) => {
  const { category } = req.params;
  const { amount } = req.body;
  db.prepare('UPDATE budgets SET amount = ? WHERE category = ?').run(amount, category);
  res.json({ ok: true });
});

// GET transactions (current month by default, or ?all=1)
app.get('/api/transactions', (req, res) => {
  let rows;
  if (req.query.all) {
    rows = db.prepare('SELECT * FROM transactions ORDER BY date DESC').all();
  } else {
    const now = new Date();
    const ym = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    rows = db.prepare("SELECT * FROM transactions WHERE date LIKE ? ORDER BY date DESC").all(`${ym}%`);
  }
  res.json(rows);
});

// POST new transaction
app.post('/api/transactions', (req, res) => {
  const { amount, category, note, date } = req.body;
  if (!amount || !category || !date) return res.status(400).json({ error: 'Missing fields' });
  const info = db.prepare('INSERT INTO transactions (amount, category, note, date) VALUES (?, ?, ?, ?)')
    .run(amount, category, note || '', date);
  res.json({ id: info.lastInsertRowid, ok: true });
});

// DELETE a transaction
app.delete('/api/transactions/:id', (req, res) => {
  db.prepare('DELETE FROM transactions WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Budget app running on port ${PORT}`));

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
    amount REAL NOT NULL,
    type TEXT NOT NULL DEFAULT 'budget'
  );
`);

// Add type column to budgets if it doesn't exist yet (migration for existing DBs)
try {
  db.exec(`ALTER TABLE budgets ADD COLUMN type TEXT NOT NULL DEFAULT 'budget'`);
} catch (_) { /* column already exists */ }

// Rename 'House' → 'Household' in budgets and transactions (migration for existing DBs)
try {
  db.prepare(`UPDATE budgets SET category = 'Household' WHERE category = 'House'`).run();
  db.prepare(`UPDATE transactions SET category = 'Household' WHERE category = 'House'`).run();
} catch (_) { /* migration already applied */ }

// Seed default budgets if empty
const budgetCount = db.prepare('SELECT COUNT(*) as c FROM budgets').get();
if (budgetCount.c === 0) {
  const defaults = [
    // Original budget categories
    ['Household', 12000, 'budget'],
    ['Groceries', 4000, 'budget'],
    ['Spending Money', 3000, 'budget'],
    ['Date Nights', 1500, 'budget'],
    ['Transport', 2500, 'budget'],
    ['Subscriptions', 800, 'budget'],
    ['Other', 1000, 'budget'],
    // Expense categories
    ['Loans', 3000, 'expense'],
    ['Rent', 8000, 'expense'],
    ['Insurance', 2000, 'expense'],
    ['Internet', 800, 'expense'],
    // Income categories
    ['Rent Income', 0, 'income'],
    ['One-Time Gifts', 0, 'income'],
    ['Supporters', 0, 'income'],
    ['Alternative Income', 0, 'income'],
    // Savings categories
    ['Investments', 5000, 'savings'],
    ['House Improvement', 2000, 'savings'],
    ['Maintenance', 1000, 'savings'],
    ['Travel', 1500, 'savings'],
  ];
  const insert = db.prepare('INSERT INTO budgets (category, amount, type) VALUES (?, ?, ?)');
  defaults.forEach(([cat, amt, type]) => insert.run(cat, amt, type));
}

// Health check endpoint
app.get('/health', (req, res) => res.sendStatus(200));

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

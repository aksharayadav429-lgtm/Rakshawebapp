/**
 * SQLite database setup (better-sqlite3 — synchronous, no separate DB server needed).
 * Creates tables on first run and seeds default rescue teams + shelters.
 */
const Database = require('better-sqlite3');
const path = require('path');

const DB_FILE = process.env.DB_FILE || path.join(__dirname, '..', 'emergency.db');
const db = new Database(DB_FILE);
db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    phone TEXT NOT NULL UNIQUE,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS teams (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    specialty TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'Available'
  );

  CREATE TABLE IF NOT EXISTS shelters (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    capacity INTEGER NOT NULL,
    occupancy INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS reports (
    id TEXT PRIMARY KEY,
    category TEXT NOT NULL,
    priority TEXT NOT NULL,
    priority_score REAL NOT NULL,
    confidence REAL,
    description TEXT NOT NULL,
    location TEXT,
    reporter_name TEXT,
    reporter_phone TEXT,
    status TEXT NOT NULL DEFAULT 'Unassigned',
    team_id TEXT,
    image_severity_score INTEGER,
    image_severity_label TEXT,
    is_sos INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (team_id) REFERENCES teams(id)
  );
`);

// Seed teams if empty
const teamCount = db.prepare('SELECT COUNT(*) AS c FROM teams').get().c;
if (teamCount === 0) {
  const insertTeam = db.prepare('INSERT INTO teams (id, name, specialty, status) VALUES (?, ?, ?, ?)');
  const seedTeams = [
    ['T1', 'Alpha Fire & Rescue', 'Fire', 'Available'],
    ['T2', 'Flood Response Unit', 'Flood', 'Available'],
    ['T3', 'Structural Rescue (Quake)', 'Earthquake', 'Available'],
    ['T4', 'Paramedic Squad 1', 'Medical', 'Available'],
    ['T5', 'Traffic & Accident Response', 'Accident', 'Available'],
  ];
  const tx = db.transaction((rows) => rows.forEach((r) => insertTeam.run(...r)));
  tx(seedTeams);
}

// Seed shelters if empty
const shelterCount = db.prepare('SELECT COUNT(*) AS c FROM shelters').get().c;
if (shelterCount === 0) {
  const insertShelter = db.prepare('INSERT INTO shelters (name, capacity, occupancy) VALUES (?, ?, ?)');
  const seedShelters = [
    ['Govt. High School Shelter', 200, 64],
    ['Community Hall - Sector 9', 120, 112],
    ['Indoor Stadium Relief Camp', 500, 210],
  ];
  const tx = db.transaction((rows) => rows.forEach((r) => insertShelter.run(...r)));
  tx(seedShelters);
}

module.exports = db;

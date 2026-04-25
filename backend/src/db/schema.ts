import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';

export const createExperimentsTable = `
CREATE TABLE IF NOT EXISTS experiments (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  dataset_filename TEXT NOT NULL,
  target_column TEXT NOT NULL,
  problem_type TEXT NOT NULL,
  best_algorithm TEXT NOT NULL,
  best_metric REAL NOT NULL,
  metric_name TEXT NOT NULL,
  session_blob TEXT NOT NULL,
  created_at TEXT NOT NULL
);
`;

export const createChatSessionsTable = `
CREATE TABLE IF NOT EXISTS chat_sessions (
  id TEXT PRIMARY KEY,
  experiment_id TEXT,
  messages_blob TEXT NOT NULL,
  context_blob TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
`;

let db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (db) {
    return db;
  }

  const sqlitePath = process.env.SQLITE_PATH ?? './db/astraml.db';
  const absolutePath = path.isAbsolute(sqlitePath)
    ? sqlitePath
    : path.resolve(process.cwd(), sqlitePath);
  fs.mkdirSync(path.dirname(absolutePath), { recursive: true });

  db = new Database(absolutePath);
  db.pragma('journal_mode = WAL');
  db.exec(createExperimentsTable);
  db.exec(createChatSessionsTable);
  return db;
}

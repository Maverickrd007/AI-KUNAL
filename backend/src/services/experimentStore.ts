import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';

import { getDb } from '../db/schema.js';
import type { ChatMessage, DatasetProfile, Experiment, TrainingSession } from './types.js';

function runtimeDir(name: string): string {
  const dir = path.resolve(process.cwd(), 'db', name);
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function metricForSession(session: TrainingSession): { metricName: string; bestMetric: number } {
  const best = session.results.find((result) => result.algorithm === session.best_model) ?? session.results[0];
  if (session.problem_type === 'classification') {
    return { metricName: 'f1_score', bestMetric: best?.f1_score ?? best?.accuracy ?? best?.cv_mean ?? 0 };
  }
  return { metricName: 'r2_score', bestMetric: best?.r2_score ?? best?.cv_mean ?? 0 };
}

function displayAlgorithm(algorithm: string): string {
  return algorithm.replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export class ExperimentStore {
  saveDatasetProfile(profile: DatasetProfile): void {
    const file = path.join(runtimeDir('profiles'), `${profile.dataset_id}.json`);
    fs.writeFileSync(file, JSON.stringify(profile, null, 2), 'utf-8');
  }

  getDatasetProfile(datasetId: string): DatasetProfile | null {
    const file = path.join(runtimeDir('profiles'), `${datasetId.replace(/_cleaned$/, '')}.json`);
    if (!fs.existsSync(file)) {
      return null;
    }
    return JSON.parse(fs.readFileSync(file, 'utf-8')) as DatasetProfile;
  }

  createExperiment(session: TrainingSession): Experiment {
    const db = getDb();
    const profile = this.getDatasetProfile(session.dataset_id);
    const { metricName, bestMetric } = metricForSession(session);
    const id = randomUUID();
    const datasetName = profile?.filename ?? session.dataset_id;
    const created = new Date(session.created_at);
    const readableDate = Number.isNaN(created.getTime()) ? new Date() : created;
    const name = `${datasetName} -> ${displayAlgorithm(session.best_model)} (${readableDate.toLocaleDateString('en-US')})`;
    const experiment: Experiment = {
      id,
      name,
      dataset_filename: datasetName,
      target_column: session.target_column,
      problem_type: session.problem_type,
      best_algorithm: session.best_model,
      best_metric: bestMetric,
      metric_name: metricName,
      created_at: session.created_at,
      session_id: session.session_id,
    };

    db.prepare(
      `INSERT INTO experiments (
        id, name, dataset_filename, target_column, problem_type, best_algorithm,
        best_metric, metric_name, session_blob, created_at
      ) VALUES (
        @id, @name, @dataset_filename, @target_column, @problem_type, @best_algorithm,
        @best_metric, @metric_name, @session_blob, @created_at
      )`,
    ).run({
      ...experiment,
      session_blob: JSON.stringify(session),
    });
    return experiment;
  }

  listExperiments(): Experiment[] {
    const db = getDb();
    return db
      .prepare(
        `SELECT id, name, dataset_filename, target_column, problem_type, best_algorithm,
          best_metric, metric_name, created_at, json_extract(session_blob, '$.session_id') as session_id
         FROM experiments ORDER BY created_at DESC`,
      )
      .all() as Experiment[];
  }

  getExperiment(id: string): Experiment | null {
    const db = getDb();
    const row = db
      .prepare(
        `SELECT id, name, dataset_filename, target_column, problem_type, best_algorithm,
          best_metric, metric_name, created_at, json_extract(session_blob, '$.session_id') as session_id
         FROM experiments WHERE id = ?`,
      )
      .get(id) as Experiment | undefined;
    return row ?? null;
  }

  getSessionByExperiment(id: string): TrainingSession | null {
    const db = getDb();
    const row = db.prepare('SELECT session_blob FROM experiments WHERE id = ?').get(id) as
      | { session_blob: string }
      | undefined;
    return row ? (JSON.parse(row.session_blob) as TrainingSession) : null;
  }

  getSessionBySessionId(sessionId: string): TrainingSession | null {
    const db = getDb();
    const row = db
      .prepare("SELECT session_blob FROM experiments WHERE json_extract(session_blob, '$.session_id') = ?")
      .get(sessionId) as { session_blob: string } | undefined;
    return row ? (JSON.parse(row.session_blob) as TrainingSession) : null;
  }

  deleteExperiment(id: string): void {
    getDb().prepare('DELETE FROM experiments WHERE id = ?').run(id);
  }

  getOrCreateChatSession(chatSessionId: string, experimentId?: string): {
    id: string;
    experiment_id: string | null;
    messages: ChatMessage[];
    context_blob: string;
  } {
    const db = getDb();
    const existing = db.prepare('SELECT * FROM chat_sessions WHERE id = ?').get(chatSessionId) as
      | {
          id: string;
          experiment_id: string | null;
          messages_blob: string;
          context_blob: string;
        }
      | undefined;
    if (existing) {
      return {
        id: existing.id,
        experiment_id: existing.experiment_id,
        messages: JSON.parse(existing.messages_blob) as ChatMessage[],
        context_blob: existing.context_blob,
      };
    }

    const now = new Date().toISOString();
    db.prepare(
      `INSERT INTO chat_sessions (id, experiment_id, messages_blob, context_blob, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
    ).run(chatSessionId, experimentId ?? null, '[]', '{}', now, now);
    return { id: chatSessionId, experiment_id: experimentId ?? null, messages: [], context_blob: '{}' };
  }

  updateChatSession(
    chatSessionId: string,
    experimentId: string | undefined,
    messages: ChatMessage[],
    context: unknown,
  ): void {
    getDb()
      .prepare(
        `UPDATE chat_sessions
         SET experiment_id = COALESCE(?, experiment_id), messages_blob = ?, context_blob = ?, updated_at = ?
         WHERE id = ?`,
      )
      .run(
        experimentId ?? null,
        JSON.stringify(messages),
        JSON.stringify(context),
        new Date().toISOString(),
        chatSessionId,
      );
  }
}

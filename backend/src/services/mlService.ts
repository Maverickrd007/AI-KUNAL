import fs from 'node:fs';

import axios from 'axios';
import FormData from 'form-data';

import type {
  CleaningConfig,
  CleaningResult,
  DatasetProfile,
  TrainingConfig,
  TrainingProgressEvent,
  TrainingSession,
} from './types.js';

const ML_SERVICE_URL = process.env.ML_SERVICE_URL ?? 'http://localhost:8000';

export class MlService {
  async analyzeDataset(filePath: string, datasetId: string, originalName: string): Promise<DatasetProfile> {
    const form = new FormData();
    form.append('dataset_id', datasetId);
    form.append('file', fs.createReadStream(filePath), originalName);
    const response = await axios.post<DatasetProfile>(`${ML_SERVICE_URL}/analyze`, form, {
      headers: form.getHeaders(),
      maxBodyLength: Infinity,
    });
    return response.data;
  }

  async cleanDataset(datasetId: string, config: CleaningConfig): Promise<CleaningResult> {
    const response = await axios.post<CleaningResult>(`${ML_SERVICE_URL}/clean`, {
      dataset_id: datasetId,
      config,
    });
    return response.data;
  }

  async trainDataset(
    config: TrainingConfig,
    onEvent?: (event: TrainingProgressEvent) => void,
  ): Promise<TrainingSession> {
    const response = await axios.post(`${ML_SERVICE_URL}/train`, config, {
      responseType: 'stream',
      timeout: 0,
    });

    return new Promise((resolve, reject) => {
      let buffer = '';
      let finalSession: TrainingSession | null = null;
      response.data.on('data', (chunk: Buffer) => {
        buffer += chunk.toString('utf-8');
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';
        for (const line of lines) {
          if (!line.trim()) {
            continue;
          }
          const event = JSON.parse(line) as TrainingProgressEvent;
          onEvent?.(event);
          if (event.type === 'error') {
            reject(new Error(event.message ?? 'Training failed'));
            return;
          }
          if (event.type === 'all_done' && event.session) {
            finalSession = event.session;
          }
        }
      });
      response.data.on('error', (error: Error) => reject(error));
      response.data.on('end', () => {
        if (finalSession) {
          resolve(finalSession);
        } else {
          reject(new Error('Training stream ended before a session was returned.'));
        }
      });
    });
  }

  async whatIf(sessionId: string, featureValues: Record<string, unknown>): Promise<unknown> {
    const response = await axios.post(`${ML_SERVICE_URL}/explain/whatif`, {
      session_id: sessionId,
      feature_values: featureValues,
    });
    return response.data;
  }

  async shap(sessionId: string, algorithm: string, rowIndex?: number): Promise<unknown> {
    const response = await axios.post(`${ML_SERVICE_URL}/explain/shap`, {
      session_id: sessionId,
      algorithm,
      row_index: rowIndex,
    });
    return response.data;
  }
}

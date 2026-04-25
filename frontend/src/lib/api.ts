import axios from 'axios';

import type {
  ChatMessage,
  CleaningConfig,
  CleaningResult,
  DatasetProfile,
  Experiment,
  ReportRequest,
  TrainingConfig,
  TrainingSession,
  WhatIfResponse,
} from '../types';

export const API_URL = import.meta.env.VITE_API_URL ?? (import.meta.env.DEV ? 'http://localhost:3001' : '');
export const WS_URL =
  import.meta.env.VITE_WS_URL ??
  (import.meta.env.DEV
    ? 'ws://localhost:3001'
    : `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}`);

export const api = axios.create({
  baseURL: API_URL,
  timeout: 120000,
});

export async function uploadDataset(file: File): Promise<DatasetProfile> {
  const form = new FormData();
  form.append('file', file);
  const response = await api.post<DatasetProfile>('/api/upload', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  localStorage.setItem('astraml_used', 'true');
  return response.data;
}

export async function cleanDataset(datasetId: string, config: CleaningConfig): Promise<CleaningResult> {
  const response = await api.post<CleaningResult>('/api/clean', {
    dataset_id: datasetId,
    config,
  });
  return response.data;
}

export async function trainModels(
  config: TrainingConfig,
  streamId: string,
): Promise<TrainingSession & { experiment_id?: string }> {
  const response = await api.post<TrainingSession & { experiment_id?: string }>('/api/train', config, {
    headers: { 'x-training-stream-id': streamId },
    timeout: 0,
  });
  return response.data;
}

export async function listExperiments(): Promise<Experiment[]> {
  const response = await api.get<Experiment[]>('/api/experiments');
  return response.data;
}

export async function getExperiment(id: string): Promise<TrainingSession> {
  const response = await api.get<TrainingSession>(`/api/experiments/${id}`);
  return response.data;
}

export async function deleteExperiment(id: string): Promise<void> {
  await api.delete(`/api/experiments/${id}`);
}

export async function sendChatMessage(
  chatSessionId: string,
  message: string,
  experimentId?: string | null,
): Promise<ChatMessage> {
  const response = await api.post<ChatMessage>('/api/chat', {
    chat_session_id: chatSessionId,
    message,
    experiment_id: experimentId ?? undefined,
  });
  return response.data;
}

export async function runWhatIf(
  sessionId: string,
  featureValues: Record<string, string | number | boolean>,
): Promise<WhatIfResponse> {
  const response = await api.post<WhatIfResponse>('/api/explain/whatif', {
    session_id: sessionId,
    feature_values: featureValues,
  });
  return response.data;
}

export async function generateReport(request: ReportRequest): Promise<Blob> {
  const response = await api.post('/api/report', request, { responseType: 'blob', timeout: 120000 });
  return response.data;
}

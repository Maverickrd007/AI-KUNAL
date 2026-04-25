import { useCallback, useState } from 'react';
import axios from 'axios';

import { trainModels } from '../lib/api';
import { useSessionStore } from '../store/sessionStore';
import { useTrainingStore } from '../store/trainingStore';
import type { TrainingConfig } from '../types';
import { useWebSocket } from './useWebSocket';

export function useTrainingStream() {
  const [streamId, setStreamId] = useState<string | null>(null);
  const addProgressEvent = useTrainingStore((state) => state.addProgressEvent);
  const setSession = useTrainingStore((state) => state.setSession);
  const setTraining = useTrainingStore((state) => state.setTraining);
  const setTrainingError = useTrainingStore((state) => state.setTrainingError);
  const setConfig = useTrainingStore((state) => state.setConfig);
  const setActiveExperiment = useSessionStore((state) => state.setActiveExperiment);

  useWebSocket(streamId, addProgressEvent, Boolean(streamId));

  const startTraining = useCallback(
    async (config: TrainingConfig) => {
      const id = crypto.randomUUID();
      setStreamId(id);
      setConfig(config);
      setTraining(true);
      setTrainingError(null);
      try {
        const session = await trainModels(config, id);
        setSession(session);
        if (session.experiment_id) {
          setActiveExperiment(session.experiment_id);
        }
      } catch (error) {
        const message = axios.isAxiosError(error)
          ? error.response?.data?.message ?? error.response?.data?.detail ?? error.message
          : error instanceof Error
            ? error.message
            : 'Training failed.';
        setTrainingError(message);
      }
    },
    [setActiveExperiment, setConfig, setSession, setTraining, setTrainingError],
  );

  return { startTraining, streamId };
}

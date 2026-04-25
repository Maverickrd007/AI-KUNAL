import { create } from 'zustand';

import type { TrainingConfig, TrainingProgressEvent, TrainingSession } from '../types';

interface TrainingState {
  config: TrainingConfig | null;
  session: TrainingSession | null;
  progressEvents: TrainingProgressEvent[];
  isTraining: boolean;
  trainingError: string | null;
  setConfig: (config: TrainingConfig) => void;
  addProgressEvent: (event: TrainingProgressEvent) => void;
  setSession: (session: TrainingSession) => void;
  setTraining: (training: boolean) => void;
  setTrainingError: (error: string | null) => void;
  reset: () => void;
}

export const useTrainingStore = create<TrainingState>((set) => ({
  config: null,
  session: null,
  progressEvents: [],
  isTraining: false,
  trainingError: null,
  setConfig: (config) => set({ config }),
  addProgressEvent: (event) =>
    set((state) => ({ progressEvents: [...state.progressEvents.slice(-120), event] })),
  setSession: (session) => set({ session, isTraining: false, trainingError: null }),
  setTraining: (isTraining) =>
    set((state) => ({
      isTraining,
      progressEvents: isTraining ? [] : state.progressEvents,
      trainingError: isTraining ? null : state.trainingError,
    })),
  setTrainingError: (trainingError) => set({ trainingError, isTraining: false }),
  reset: () => set({ config: null, session: null, progressEvents: [], isTraining: false, trainingError: null }),
}));

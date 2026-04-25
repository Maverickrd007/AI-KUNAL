import { create } from 'zustand';

import type { Experiment } from '../types';

interface SessionState {
  activeExperimentId: string | null;
  experiments: Experiment[];
  setActiveExperiment: (id: string) => void;
  setExperiments: (experiments: Experiment[]) => void;
  addExperiment: (experiment: Experiment) => void;
  removeExperiment: (id: string) => void;
}

export const useSessionStore = create<SessionState>((set) => ({
  activeExperimentId: null,
  experiments: [],
  setActiveExperiment: (activeExperimentId) => set({ activeExperimentId }),
  setExperiments: (experiments) => set({ experiments }),
  addExperiment: (experiment) =>
    set((state) => ({ experiments: [experiment, ...state.experiments], activeExperimentId: experiment.id })),
  removeExperiment: (id) =>
    set((state) => ({
      experiments: state.experiments.filter((experiment) => experiment.id !== id),
      activeExperimentId: state.activeExperimentId === id ? null : state.activeExperimentId,
    })),
}));

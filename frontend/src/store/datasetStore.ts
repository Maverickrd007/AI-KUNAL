import { create } from 'zustand';

import type { CleaningConfig, CleaningResult, DatasetProfile } from '../types';

const defaultCleaningConfig: CleaningConfig = {
  missing_strategy: 'median',
  outlier_strategy: 'iqr_clip',
  encoding_strategy: 'label',
  scaling_strategy: 'standard',
  columns_to_drop: [],
};

interface DatasetState {
  profile: DatasetProfile | null;
  cleaningResult: CleaningResult | null;
  cleaningConfig: CleaningConfig;
  isUploading: boolean;
  isCleaning: boolean;
  uploadError: string | null;
  setProfile: (profile: DatasetProfile) => void;
  setCleaningResult: (result: CleaningResult) => void;
  setCleaningConfig: (config: Partial<CleaningConfig>) => void;
  setUploading: (loading: boolean) => void;
  setCleaning: (loading: boolean) => void;
  setUploadError: (error: string | null) => void;
  reset: () => void;
}

export const useDatasetStore = create<DatasetState>((set) => ({
  profile: null,
  cleaningResult: null,
  cleaningConfig: defaultCleaningConfig,
  isUploading: false,
  isCleaning: false,
  uploadError: null,
  setProfile: (profile) => set({ profile, uploadError: null }),
  setCleaningResult: (cleaningResult) => set({ cleaningResult }),
  setCleaningConfig: (config) =>
    set((state) => ({ cleaningConfig: { ...state.cleaningConfig, ...config } })),
  setUploading: (isUploading) => set({ isUploading }),
  setCleaning: (isCleaning) => set({ isCleaning }),
  setUploadError: (uploadError) => set({ uploadError }),
  reset: () =>
    set({
      profile: null,
      cleaningResult: null,
      cleaningConfig: defaultCleaningConfig,
      isUploading: false,
      isCleaning: false,
      uploadError: null,
    }),
}));

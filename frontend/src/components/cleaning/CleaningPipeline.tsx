import { useState } from 'react';
import { motion } from 'framer-motion';
import { Check, RotateCcw, SlidersHorizontal, Wand2 } from 'lucide-react';

import { cleanDataset } from '../../lib/api';
import { useDatasetStore } from '../../store/datasetStore';
import type { CleaningConfig } from '../../types';

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.07 } },
};

const item = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.25, ease: 'easeOut' } },
};

const statusClass = {
  done: 'bg-emerald-50 text-emerald-700',
  skipped: 'bg-slate-100 text-slate-600',
  warning: 'bg-amber-50 text-amber-700',
};

export function CleaningPipeline() {
  const [mode, setMode] = useState<'auto' | 'manual'>('auto');
  const {
    profile,
    cleaningResult,
    cleaningConfig,
    isCleaning,
    setCleaning,
    setCleaningConfig,
    setCleaningResult,
  } = useDatasetStore();
  const [error, setError] = useState<string | null>(null);

  const applyCleaning = async () => {
    if (!profile) {
      return;
    }
    setCleaning(true);
    setError(null);
    try {
      const result = await cleanDataset(profile.dataset_id, cleaningConfig);
      setCleaningResult(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Cleaning failed.');
    } finally {
      setCleaning(false);
    }
  };

  if (!profile) {
    return (
      <div className="rounded border border-border bg-canvas-secondary p-8 text-center">
        <Wand2 className="mx-auto mb-3 text-text-muted" size={30} strokeWidth={1.5} />
        <h2 className="text-lg font-semibold text-text-primary">Upload data before cleaning</h2>
        <p className="mt-2 text-sm text-text-secondary">Astra needs a dataset profile before it can propose a pipeline.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-text-primary">Cleaning Pipeline</h2>
          <p className="mt-1 text-sm text-text-secondary">Astra shows every step before and after it runs.</p>
        </div>
        <div className="inline-flex rounded border border-border bg-white p-1">
          {(['auto', 'manual'] as const).map((option) => (
            <button
              key={option}
              onClick={() => setMode(option)}
              className={[
                'rounded px-3 py-1.5 text-sm font-medium capitalize',
                mode === option ? 'bg-accent text-white' : 'text-text-secondary hover:bg-canvas-secondary',
              ].join(' ')}
            >
              {option}
            </button>
          ))}
        </div>
      </div>

      {mode === 'auto' ? (
        <div className="rounded border border-border bg-accent-light/50 p-5 text-sm text-text-primary">
          Astra applied: median imputation for missing values, IQR clipping for outliers, label encoding for categorical columns, StandardScaler for numeric features.
          <div className="mt-4 flex gap-3">
            <button className="rounded border border-border bg-white px-3 py-1.5 text-sm hover:border-accent">View Details</button>
            <button
              className="rounded border border-border bg-white px-3 py-1.5 text-sm hover:border-accent"
              onClick={() => setMode('manual')}
            >
              Undo and Configure Manually
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-4 gap-4 rounded border border-border bg-white p-5 shadow-card">
          {([
            ['missing_strategy', ['mean', 'median', 'mode', 'drop_rows', 'drop_cols']],
            ['outlier_strategy', ['iqr_clip', 'zscore_remove', 'none']],
            ['encoding_strategy', ['label', 'onehot']],
            ['scaling_strategy', ['standard', 'minmax', 'none']],
          ] as [keyof CleaningConfig, string[]][]).map(([key, values]) => (
            <label key={key} className="text-sm">
              <span className="mb-2 block font-medium text-text-primary">{key.replace(/_/g, ' ')}</span>
              <select
                className="w-full rounded border border-border bg-white px-3 py-2 text-sm"
                value={String(cleaningConfig[key])}
                onChange={(event) => setCleaningConfig({ [key]: event.target.value } as Partial<CleaningConfig>)}
              >
                {values.map((value) => (
                  <option key={value} value={value}>
                    {value.replace(/_/g, ' ')}
                  </option>
                ))}
              </select>
            </label>
          ))}
        </div>
      )}

      <div className="flex items-center gap-3">
        <button
          onClick={() => void applyCleaning()}
          disabled={isCleaning}
          className="inline-flex items-center gap-2 rounded bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-dark disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isCleaning ? <SlidersHorizontal className="animate-pulse" size={17} /> : <Check size={17} />}
          {isCleaning ? 'Applying pipeline...' : 'Apply Cleaning'}
        </button>
        {cleaningResult && (
          <button
            className="inline-flex items-center gap-2 rounded border border-border px-4 py-2 text-sm hover:border-accent"
            onClick={() => setCleaningResult({ ...cleaningResult, pipeline_steps: [] })}
          >
            <RotateCcw size={17} />
            Clear Result
          </button>
        )}
      </div>

      {error && (
        <div className="rounded border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
          <div className="mt-1 text-red-600">Try switching to median imputation or dropping columns with many missing values.</div>
        </div>
      )}

      {isCleaning && (
        <div className="grid grid-cols-4 gap-4">
          {[0, 1, 2, 3].map((key) => (
            <div key={key} className="h-32 skeleton" />
          ))}
        </div>
      )}

      {cleaningResult && cleaningResult.pipeline_steps.length > 0 && (
        <motion.div variants={container} initial="hidden" animate="show" className="grid grid-cols-4 gap-4">
          {cleaningResult.pipeline_steps.map((step) => (
            <motion.div key={step.step} variants={item} className="rounded border border-border bg-white p-4 shadow-card">
              <div className="mb-3 flex items-center justify-between gap-3">
                <h3 className="text-sm font-semibold text-text-primary">{step.step}</h3>
                <span className={`rounded px-2 py-1 text-xs font-medium ${statusClass[step.status]}`}>
                  {step.status}
                </span>
              </div>
              <p className="text-sm leading-5 text-text-secondary">{step.description}</p>
              {step.detail && <p className="mt-3 text-xs text-text-muted">{step.detail}</p>}
            </motion.div>
          ))}
        </motion.div>
      )}
    </div>
  );
}

import { useEffect, useState } from 'react';
import { BrainCircuit } from 'lucide-react';

import { titleCase } from '../../lib/formatters';
import { useDatasetStore } from '../../store/datasetStore';
import type { Algorithm, TrainingConfig, TrainingMode } from '../../types';

const algorithms: Algorithm[] = [
  'logistic_regression',
  'random_forest',
  'decision_tree',
  'knn',
  'gradient_boosting',
];

interface ModelSelectorProps {
  onStartTraining: (config: TrainingConfig) => void;
}

export function ModelSelector({ onStartTraining }: ModelSelectorProps) {
  const profile = useDatasetStore((state) => state.profile);
  const cleaningResult = useDatasetStore((state) => state.cleaningResult);
  const [selectedAlgorithms, setSelectedAlgorithms] = useState<Algorithm[]>(algorithms);
  const [mode, setMode] = useState<TrainingMode>('balanced');
  const [target, setTarget] = useState('');
  const [testSize, setTestSize] = useState(0.2);
  const [folds, setFolds] = useState(3);

  useEffect(() => {
    if (profile && !target) {
      setTarget(profile.target_column ?? profile.columns[profile.columns.length - 1]?.name ?? '');
    }
  }, [profile, target]);

  if (!profile) {
    return (
      <div className="rounded border border-border bg-canvas-secondary p-8 text-center">
        <BrainCircuit className="mx-auto mb-3 text-text-muted" size={32} strokeWidth={1.5} />
        <h2 className="text-lg font-semibold text-text-primary">Upload a dataset first</h2>
        <p className="mt-2 text-sm text-text-secondary">Training unlocks after Astra profiles your columns and target.</p>
      </div>
    );
  }

  const problemType =
    profile.problem_type === 'unknown'
      ? 'classification'
      : profile.problem_type;

  const start = () => {
    onStartTraining({
      dataset_id: cleaningResult?.cleaned_dataset_id ?? profile.dataset_id,
      target_column: target,
      problem_type: problemType,
      algorithms: selectedAlgorithms,
      mode,
      test_size: testSize,
      cross_validation_folds: folds,
    });
  };

  return (
    <div className="rounded border border-border bg-white p-6 shadow-card">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-text-primary">Train Models</h2>
          <p className="mt-1 text-sm text-text-secondary">Select algorithms, then Astra streams each result as it finishes.</p>
        </div>
        <span className="rounded bg-accent-light px-3 py-1 text-sm font-medium text-accent-dark">
          {problemType}
        </span>
      </div>

      <div className="grid grid-cols-3 gap-5">
        <label className="text-sm">
          <span className="mb-2 block font-medium text-text-primary">Target column</span>
          <select className="w-full rounded border border-border px-3 py-2" value={target} onChange={(e) => setTarget(e.target.value)}>
            {profile.columns.map((column) => (
              <option key={column.name} value={column.name}>
                {column.name}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          <span className="mb-2 block font-medium text-text-primary">Training mode</span>
          <select className="w-full rounded border border-border px-3 py-2" value={mode} onChange={(e) => setMode(e.target.value as TrainingMode)}>
            <option value="fast">fast</option>
            <option value="balanced">balanced</option>
            <option value="thorough">thorough</option>
          </select>
        </label>
        <label className="text-sm">
          <span className="mb-2 block font-medium text-text-primary">CV folds</span>
          <select className="w-full rounded border border-border px-3 py-2" value={folds} onChange={(e) => setFolds(Number(e.target.value))}>
            <option value={3}>3</option>
            <option value={5}>5</option>
          </select>
        </label>
      </div>

      <div className="mt-6">
        <div className="mb-3 text-sm font-medium text-text-primary">Algorithms</div>
        <div className="grid grid-cols-5 gap-3">
          {algorithms.map((algorithm) => (
            <label key={algorithm} className="rounded border border-border p-3 text-sm hover:border-accent">
              <input
                type="checkbox"
                className="mr-2 accent-accent"
                checked={selectedAlgorithms.includes(algorithm)}
                onChange={() =>
                  setSelectedAlgorithms((current) =>
                    current.includes(algorithm)
                      ? current.filter((item) => item !== algorithm)
                      : [...current, algorithm],
                  )
                }
              />
              {titleCase(algorithm)}
            </label>
          ))}
        </div>
      </div>

      <div className="mt-6 flex items-center gap-4">
        <label className="flex items-center gap-3 text-sm text-text-secondary">
          Test size
          <input
            type="range"
            min={0.1}
            max={0.4}
            step={0.05}
            value={testSize}
            onChange={(event) => setTestSize(Number(event.target.value))}
            className="accent-accent"
          />
          <span className="w-10 text-text-primary">{Math.round(testSize * 100)}%</span>
        </label>
        <button
          type="button"
          disabled={!target || selectedAlgorithms.length === 0}
          onClick={start}
          className="ml-auto inline-flex items-center gap-2 rounded bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-dark disabled:cursor-not-allowed disabled:opacity-60"
        >
          <BrainCircuit size={17} strokeWidth={1.5} />
          Start Training
        </button>
      </div>
    </div>
  );
}

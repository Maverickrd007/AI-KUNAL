import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, SlidersHorizontal } from 'lucide-react';

import { runWhatIf } from '../../lib/api';
import { useDatasetStore } from '../../store/datasetStore';
import { useTrainingStore } from '../../store/trainingStore';
import type { WhatIfResponse } from '../../types';

export function WhatIfSimulator() {
  const profile = useDatasetStore((state) => state.profile);
  const session = useTrainingStore((state) => state.session);
  const featureColumns = useMemo(
    () => profile?.columns.filter((column) => column.name !== session?.target_column) ?? [],
    [profile?.columns, session?.target_column],
  );
  const initialValues = useMemo(() => {
    const values: Record<string, string | number | boolean> = {};
    featureColumns.forEach((column) => {
      if (column.dtype === 'numeric') {
        values[column.name] = column.mean ?? column.min ?? 0;
      } else if (column.dtype === 'boolean') {
        values[column.name] = String(column.sample_values[0] ?? 'false');
      } else {
        values[column.name] = String(column.sample_values[0] ?? column.top_categories?.[0]?.value ?? '');
      }
    });
    return values;
  }, [featureColumns]);

  const [values, setValues] = useState<Record<string, string | number | boolean>>(initialValues);
  const [result, setResult] = useState<WhatIfResponse | null>(null);
  const [previous, setPrevious] = useState<WhatIfResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => setValues(initialValues), [initialValues]);

  useEffect(() => {
    if (!session || !Object.keys(values).length) {
      return;
    }
    const timeout = window.setTimeout(async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await runWhatIf(session.session_id, values);
        setResult((current) => {
          setPrevious(current);
          return response;
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : 'What-if simulation failed.');
      } finally {
        setIsLoading(false);
      }
    }, 300);
    return () => window.clearTimeout(timeout);
  }, [session, values]);

  if (!profile || !session) {
    return (
      <div className="rounded border border-border bg-canvas-secondary p-8 text-center">
        <SlidersHorizontal className="mx-auto mb-3 text-text-muted" size={30} strokeWidth={1.5} />
        <h2 className="text-lg font-semibold text-text-primary">Train a model to run what-if analysis</h2>
        <p className="mt-2 text-sm text-text-secondary">The simulator uses the saved winning model from your latest run.</p>
      </div>
    );
  }

  const outsideWarnings = featureColumns.flatMap((column) => {
    if (column.dtype !== 'numeric') {
      return [];
    }
    const value = Number(values[column.name]);
    if (column.min !== undefined && value < column.min) {
      return [`${column.name} is below the training range.`];
    }
    if (column.max !== undefined && value > column.max) {
      return [`${column.name} is above the training range.`];
    }
    return [];
  });

  const delta =
    previous?.confidence !== undefined && result?.confidence !== undefined && previous.confidence !== null && result.confidence !== null
      ? (result.confidence - previous.confidence) * 100
      : null;

  return (
    <div className="grid grid-cols-[360px_1fr] gap-6">
      <div className="rounded border border-border bg-white p-5 shadow-card">
        <h2 className="mb-4 text-lg font-semibold text-text-primary">What-If Simulator</h2>
        <div className="space-y-4">
          {featureColumns.map((column) => (
            <label key={column.name} className="block text-sm">
              <span className="mb-2 block font-medium text-text-primary">{column.name}</span>
              {column.dtype === 'numeric' ? (
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min={column.min ?? 0}
                    max={column.max ?? 100}
                    step={(column.max ?? 100) - (column.min ?? 0) > 20 ? 1 : 0.1}
                    value={Number(values[column.name] ?? 0)}
                    onChange={(event) => setValues((current) => ({ ...current, [column.name]: Number(event.target.value) }))}
                    className="flex-1 accent-accent"
                  />
                  <input
                    type="number"
                    value={Number(values[column.name] ?? 0)}
                    onChange={(event) => setValues((current) => ({ ...current, [column.name]: Number(event.target.value) }))}
                    className="w-24 rounded border border-border px-2 py-1"
                  />
                </div>
              ) : (
                <select
                  className="w-full rounded border border-border px-3 py-2"
                  value={String(values[column.name] ?? '')}
                  onChange={(event) => setValues((current) => ({ ...current, [column.name]: event.target.value }))}
                >
                  {(column.top_categories?.map((item) => item.value) ?? column.sample_values.map(String)).map((value) => (
                    <option key={value} value={value}>
                      {value}
                    </option>
                  ))}
                </select>
              )}
            </label>
          ))}
        </div>
      </div>

      <div className="rounded border border-border bg-white p-6 shadow-card">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-text-primary">Live Prediction</h2>
          {isLoading && <span className="text-sm text-text-secondary">Updating...</span>}
        </div>

        {error && (
          <div className="mb-4 rounded border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
            <div className="mt-1 text-red-600">Check that the model service is running and the session still exists.</div>
          </div>
        )}

        {outsideWarnings.concat(result?.warnings ?? []).map((warning) => (
          <div key={warning} className="mb-3 flex items-start gap-2 rounded border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700">
            <AlertTriangle size={16} strokeWidth={1.5} className="mt-0.5" />
            This value is outside the training distribution - prediction may be unreliable. {warning}
          </div>
        ))}

        <div className="text-sm uppercase tracking-wide text-text-muted">Prediction</div>
        <div className="mt-2 text-4xl font-semibold text-text-primary">{result?.prediction ?? '...'}</div>
        {result?.confidence !== null && result?.confidence !== undefined && (
          <div className="mt-2 text-sm text-text-secondary">Confidence {(result.confidence * 100).toFixed(1)}%</div>
        )}

        {result?.probabilities && result.probabilities.length > 0 && (
          <div className="mt-6 space-y-3">
            {result.probabilities.map((item) => (
              <div key={item.label}>
                <div className="mb-1 flex justify-between text-sm">
                  <span>{item.label}</span>
                  <span>{(item.probability * 100).toFixed(1)}%</span>
                </div>
                <div className="h-2 rounded bg-slate-100">
                  <div className="h-2 rounded bg-accent" style={{ width: `${item.probability * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-6 rounded bg-canvas-secondary p-4 text-sm text-text-secondary">
          {delta === null
            ? 'Adjust a control to compare the prediction against the previous state.'
            : `The last change moved confidence by ${delta >= 0 ? '+' : ''}${delta.toFixed(1)} percentage points.`}
        </div>
      </div>
    </div>
  );
}

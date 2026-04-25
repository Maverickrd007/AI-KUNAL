import { useEffect, useMemo, useState } from 'react';
import { BarChart3, Eye, Trash2 } from 'lucide-react';
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

import { deleteExperiment, getExperiment, listExperiments } from '../../lib/api';
import { formatDate, formatNumber, titleCase } from '../../lib/formatters';
import { useSessionStore } from '../../store/sessionStore';
import { useTrainingStore } from '../../store/trainingStore';
import type { Experiment, TrainingSession } from '../../types';

export function ExperimentTable() {
  const experiments = useSessionStore((state) => state.experiments);
  const setExperiments = useSessionStore((state) => state.setExperiments);
  const setActiveExperiment = useSessionStore((state) => state.setActiveExperiment);
  const removeExperiment = useSessionStore((state) => state.removeExperiment);
  const setSession = useTrainingStore((state) => state.setSession);
  const [selected, setSelected] = useState<string[]>([]);
  const [comparison, setComparison] = useState<TrainingSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      setIsLoading(true);
      try {
        setExperiments(await listExperiments());
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not load experiments.');
      } finally {
        setIsLoading(false);
      }
    })();
  }, [setExperiments]);

  const compareRows = useMemo(
    () =>
      comparison.map((session) => {
        const best = session.results.find((result) => result.algorithm === session.best_model) ?? session.results[0];
        return {
          name: titleCase(session.best_model),
          metric: session.problem_type === 'classification' ? best?.f1_score ?? 0 : best?.r2_score ?? 0,
        };
      }),
    [comparison],
  );

  const viewExperiment = async (experiment: Experiment) => {
    const session = await getExperiment(experiment.id);
    setSession(session);
    setActiveExperiment(experiment.id);
  };

  const compareSelected = async () => {
    const sessions = await Promise.all(selected.slice(0, 2).map((id) => getExperiment(id)));
    setComparison(sessions);
  };

  if (isLoading) {
    return <div className="h-64 skeleton" />;
  }

  if (error) {
    return (
      <div className="rounded border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        {error}
        <div className="mt-1 text-red-600">Check that the backend is running, then retry.</div>
      </div>
    );
  }

  if (experiments.length === 0) {
    return (
      <div className="rounded border border-border bg-canvas-secondary p-8 text-center">
        <BarChart3 className="mx-auto mb-3 text-text-muted" size={30} strokeWidth={1.5} />
        <h2 className="text-lg font-semibold text-text-primary">No experiments yet</h2>
        <p className="mt-2 text-sm text-text-secondary">Train models to populate this tracker.</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="overflow-hidden rounded border border-border bg-white shadow-card">
        <div className="flex items-center justify-between border-b border-border p-4">
          <h2 className="text-lg font-semibold text-text-primary">Experiment Tracker</h2>
          <button
            disabled={selected.length !== 2}
            onClick={() => void compareSelected()}
            className="rounded bg-accent px-3 py-1.5 text-sm font-medium text-white hover:bg-accent-dark disabled:cursor-not-allowed disabled:opacity-60"
          >
            Compare Selected
          </button>
        </div>
        <table className="w-full text-left text-sm">
          <thead className="bg-canvas-secondary text-xs uppercase tracking-wide text-text-muted">
            <tr>
              <th className="p-3" />
              <th className="p-3">Name</th>
              <th className="p-3">Dataset</th>
              <th className="p-3">Target</th>
              <th className="p-3">Problem</th>
              <th className="p-3">Best model</th>
              <th className="p-3">Best metric</th>
              <th className="p-3">Created</th>
              <th className="p-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {experiments.map((experiment) => (
              <tr key={experiment.id} className="border-t border-border">
                <td className="p-3">
                  <input
                    type="checkbox"
                    className="accent-accent"
                    checked={selected.includes(experiment.id)}
                    onChange={() =>
                      setSelected((current) =>
                        current.includes(experiment.id)
                          ? current.filter((id) => id !== experiment.id)
                          : [...current, experiment.id].slice(-2),
                      )
                    }
                  />
                </td>
                <td className="max-w-[220px] truncate p-3 font-medium text-text-primary">{experiment.name}</td>
                <td className="p-3 text-text-secondary">{experiment.dataset_filename}</td>
                <td className="p-3 text-text-secondary">{experiment.target_column}</td>
                <td className="p-3">
                  <span
                    className={[
                      'rounded px-2 py-1 text-xs font-medium',
                      experiment.problem_type === 'classification'
                        ? 'bg-blue-50 text-blue-700'
                        : 'bg-purple-50 text-purple-700',
                    ].join(' ')}
                  >
                    {experiment.problem_type}
                  </span>
                </td>
                <td className="p-3 text-text-secondary">{titleCase(experiment.best_algorithm)}</td>
                <td className="p-3 text-text-secondary">
                  {formatNumber(experiment.best_metric)} {experiment.metric_name}
                </td>
                <td className="p-3 text-text-secondary">{formatDate(experiment.created_at)}</td>
                <td className="p-3">
                  <div className="flex gap-2">
                    <button className="rounded border border-border p-1.5 hover:border-accent" onClick={() => void viewExperiment(experiment)} title="View">
                      <Eye size={16} strokeWidth={1.5} />
                    </button>
                    <button className="rounded border border-border p-1.5 hover:border-danger" title="Delete" onClick={async () => {
                      await deleteExperiment(experiment.id);
                      removeExperiment(experiment.id);
                    }}>
                      <Trash2 size={16} strokeWidth={1.5} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {comparison.length === 2 && (
        <div className="grid grid-cols-2 gap-5 rounded border border-border bg-white p-5 shadow-card">
          {comparison.map((session) => (
            <div key={session.session_id}>
              <h3 className="font-semibold text-text-primary">{titleCase(session.best_model)}</h3>
              <div className="mt-2 text-sm text-text-secondary">
                Dataset: {session.dataset_id}
                <br />
                Target: {session.target_column}
                <br />
                Problem: {session.problem_type}
              </div>
              <div className="mt-4 h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={session.results.map((result) => ({
                    name: titleCase(result.algorithm),
                    metric: session.problem_type === 'classification' ? result.f1_score ?? 0 : result.r2_score ?? 0,
                  }))}>
                    <XAxis dataKey="name" hide />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="metric" fill="#6366f1" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          ))}
          <div className="col-span-2 rounded bg-canvas-secondary p-3 text-sm text-text-secondary">
            Delta: {compareRows[1]?.name} is {(compareRows[1]?.metric - compareRows[0]?.metric).toFixed(3)} versus {compareRows[0]?.name}.
          </div>
        </div>
      )}
    </div>
  );
}

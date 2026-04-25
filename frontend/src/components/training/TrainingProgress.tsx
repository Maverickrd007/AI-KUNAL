import { motion } from 'framer-motion';
import { CheckCircle2, Circle, Loader2, XCircle } from 'lucide-react';
import { Line, LineChart, ResponsiveContainer } from 'recharts';

import { titleCase } from '../../lib/formatters';
import { useTrainingStore } from '../../store/trainingStore';
import type { Algorithm, TrainingProgressEvent } from '../../types';

function statusFor(algorithm: Algorithm, events: TrainingProgressEvent[]): 'queued' | 'running' | 'done' | 'failed' {
  const relevant = events.filter((event) => event.algorithm === algorithm);
  if (relevant.some((event) => event.type === 'error')) {
    return 'failed';
  }
  if (relevant.some((event) => event.type === 'model_done')) {
    return 'done';
  }
  if (relevant.some((event) => event.type === 'start' || event.type === 'epoch')) {
    return 'running';
  }
  return 'queued';
}

function StatusIcon({ status }: { status: ReturnType<typeof statusFor> }) {
  if (status === 'done') {
    return <CheckCircle2 className="text-success" size={18} strokeWidth={1.5} />;
  }
  if (status === 'failed') {
    return <XCircle className="text-danger" size={18} strokeWidth={1.5} />;
  }
  if (status === 'running') {
    return <Loader2 className="animate-spin text-accent" size={18} strokeWidth={1.5} />;
  }
  return <Circle className="text-text-muted" size={18} strokeWidth={1.5} />;
}

export function TrainingProgress() {
  const config = useTrainingStore((state) => state.config);
  const events = useTrainingStore((state) => state.progressEvents);
  const progress = Math.max(0, ...events.map((event) => event.progress_pct ?? 0));
  const doneCount = config?.algorithms.filter((algorithm) => statusFor(algorithm, events) === 'done').length ?? 0;
  const latestLogs = events.slice(-10);

  if (!config) {
    return null;
  }

  return (
    <div className="space-y-5">
      <div className="rounded border border-border bg-white p-5 shadow-card">
        <div className="mb-3 flex items-center justify-between text-sm">
          <span className="font-medium text-text-primary">
            Training {doneCount} of {config.algorithms.length} models...
          </span>
          <span className="text-text-secondary">{Math.round(progress)}%</span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
          <motion.div
            style={{ width: `${progress}%` }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
            className="h-1.5 rounded-full bg-accent"
          />
        </div>
      </div>

      <div className="grid grid-cols-5 gap-4">
        {config.algorithms.map((algorithm) => {
          const relevant = events.filter((event) => event.algorithm === algorithm);
          const status = statusFor(algorithm, events);
          const data = relevant
            .filter((event) => event.current_metric !== undefined)
            .map((event, index) => ({ index, value: event.current_metric ?? 0 }));
          const latest = [...relevant].reverse().find((event) => event.current_metric !== undefined);
          return (
            <div key={algorithm} className="rounded border border-border bg-white p-4 shadow-card">
              <div className="mb-3 flex items-center justify-between">
                <div className="text-sm font-semibold text-text-primary">{titleCase(algorithm)}</div>
                <StatusIcon status={status} />
              </div>
              <div className="text-xs uppercase text-text-muted">{status}</div>
              <div className="mt-2 text-xl font-semibold text-text-primary">
                {latest?.current_metric?.toFixed(3) ?? '...'}
              </div>
              <div className="mt-3 h-[60px]">
                {data.length ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={data}>
                      <Line dataKey="value" type="monotone" dot={false} stroke="#6366f1" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full rounded bg-slate-50" />
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="h-56 overflow-y-auto rounded border border-sidebar-border bg-sidebar p-4 font-mono text-xs text-slate-300">
        {latestLogs.map((event, index) => (
          <motion.div
            key={`${event.message}-${index}`}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.2 }}
            className="mb-2"
          >
            [{new Date().toLocaleTimeString()}] {event.message ?? event.type}
          </motion.div>
        ))}
      </div>
    </div>
  );
}

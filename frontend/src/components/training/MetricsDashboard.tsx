import { motion } from 'framer-motion';

import { AstraVerdict } from '../explainability/AstraVerdict';
import { FeatureImportanceChart } from '../explainability/FeatureImportanceChart';
import { bestMetricName, formatNumber, titleCase } from '../../lib/formatters';
import type { TrainingSession } from '../../types';

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.07 } },
};

const item = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.25, ease: 'easeOut' } },
};

export function MetricsDashboard({ session }: { session: TrainingSession }) {
  const metric = bestMetricName(session.problem_type);
  const best = session.results.find((result) => result.algorithm === session.best_model) ?? session.results[0];

  return (
    <div className="space-y-5">
      <AstraVerdict session={session} />
      <motion.div variants={container} initial="hidden" animate="show" className="grid grid-cols-5 gap-4">
        {session.results.map((result) => (
          <motion.div key={result.algorithm} variants={item} className="rounded border border-border bg-white p-4 shadow-card">
            <div className="text-sm font-semibold text-text-primary">{titleCase(result.algorithm)}</div>
            <div className="mt-3 text-2xl font-semibold text-text-primary">{formatNumber(result[metric])}</div>
            <div className="mt-1 text-xs uppercase text-text-muted">{metric.replace('_', ' ')}</div>
            <div className="mt-4 space-y-1 text-xs text-text-secondary">
              <div>CV mean: {formatNumber(result.cv_mean)}</div>
              <div>CV std: {formatNumber(result.cv_std)}</div>
              <div>Time: {result.training_time_ms} ms</div>
            </div>
          </motion.div>
        ))}
      </motion.div>
      {best && (
        <div>
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-text-secondary">
            Feature Importance: {titleCase(best.algorithm)}
          </h3>
          <FeatureImportanceChart data={best.feature_importance} />
        </div>
      )}
    </div>
  );
}

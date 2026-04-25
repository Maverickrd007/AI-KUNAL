import { motion } from 'framer-motion';

import { titleCase } from '../../lib/formatters';
import type { TrainingSession } from '../../types';

function verdictColor(session: TrainingSession): string {
  const result = session.results.find((item) => item.algorithm === session.best_model);
  const metric = session.problem_type === 'classification' ? result?.f1_score ?? 0 : result?.r2_score ?? 0;
  if (metric >= 0.8) {
    return 'border-success';
  }
  if (metric >= 0.55) {
    return 'border-warning';
  }
  return 'border-danger';
}

export function AstraVerdict({ session }: { session: TrainingSession }) {
  const verdict = session.astra_verdict;
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: 0.3, duration: 0.35, ease: 'easeOut' }}
      className={`rounded border border-l-4 bg-white p-5 shadow-card ${verdictColor(session)}`}
    >
      <div className="mb-4 text-sm font-semibold uppercase tracking-wide text-text-secondary">Astra Verdict</div>
      <div className="grid grid-cols-4 gap-5">
        <div>
          <div className="text-xs font-semibold uppercase text-text-muted">Winner</div>
          <p className="mt-1 text-sm text-text-primary">{titleCase(verdict.winner)}</p>
          <p className="mt-2 text-xs leading-5 text-text-secondary">{verdict.winner_reason}</p>
        </div>
        <div>
          <div className="text-xs font-semibold uppercase text-text-muted">Insight</div>
          <p className="mt-1 text-sm leading-5 text-text-primary">{verdict.key_insight}</p>
        </div>
        <div>
          <div className="text-xs font-semibold uppercase text-text-muted">Next Step</div>
          <p className="mt-1 text-sm leading-5 text-text-primary">{verdict.recommendation}</p>
        </div>
        <div>
          <div className="text-xs font-semibold uppercase text-text-muted">Watch Out</div>
          <p className="mt-1 text-sm leading-5 text-text-primary">{verdict.watch_out ?? 'No critical warning.'}</p>
        </div>
      </div>
    </motion.div>
  );
}

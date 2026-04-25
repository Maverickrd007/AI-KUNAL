import { motion } from 'framer-motion';

import { MetricsDashboard } from '../components/training/MetricsDashboard';
import { ModelSelector } from '../components/training/ModelSelector';
import { TrainingProgress } from '../components/training/TrainingProgress';
import { useTrainingStore } from '../store/trainingStore';

export default function Train() {
  const isTraining = useTrainingStore((state) => state.isTraining);
  const session = useTrainingStore((state) => state.session);
  const error = useTrainingStore((state) => state.trainingError);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      className="space-y-6"
    >
      <div>
        <h1 className="text-2xl font-semibold text-text-primary">Train Model</h1>
        <p className="mt-1 text-sm text-text-secondary">Run five classic baselines and let Astra explain the winner.</p>
      </div>
      {error && (
        <div className="rounded border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
          <div className="mt-1 text-red-600">Try fewer algorithms or confirm the target column has valid values.</div>
        </div>
      )}
      {isTraining ? <TrainingProgress /> : <ModelSelector />}
      {session && !isTraining && <MetricsDashboard session={session} />}
    </motion.div>
  );
}

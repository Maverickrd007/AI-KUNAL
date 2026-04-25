import { motion } from 'framer-motion';

import { FeatureImportanceChart } from '../components/explainability/FeatureImportanceChart';
import { WhatIfSimulator } from '../components/explainability/WhatIfSimulator';
import { ReportGenerator } from '../components/report/ReportGenerator';
import { useTrainingStore } from '../store/trainingStore';

export default function Explain() {
  const session = useTrainingStore((state) => state.session);
  const best = session?.results.find((result) => result.algorithm === session.best_model);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      className="space-y-6"
    >
      <div>
        <h1 className="text-2xl font-semibold text-text-primary">Explain</h1>
        <p className="mt-1 text-sm text-text-secondary">Inspect feature importance and run live what-if simulations.</p>
      </div>
      {best && <FeatureImportanceChart data={best.feature_importance} />}
      <WhatIfSimulator />
      {session && <ReportGenerator />}
    </motion.div>
  );
}

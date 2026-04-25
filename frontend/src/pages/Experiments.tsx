import { motion } from 'framer-motion';

import { ExperimentTable } from '../components/experiments/ExperimentTable';

export default function Experiments() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      className="space-y-6"
    >
      <div>
        <h1 className="text-2xl font-semibold text-text-primary">Experiments</h1>
        <p className="mt-1 text-sm text-text-secondary">Compare, view, and delete saved model runs.</p>
      </div>
      <ExperimentTable />
    </motion.div>
  );
}

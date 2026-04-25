import { motion } from 'framer-motion';
import { Database, FlaskConical, MessageSquare, UploadCloud } from 'lucide-react';
import { Link } from 'react-router-dom';

import { ReportGenerator } from '../components/report/ReportGenerator';
import { useDatasetStore } from '../store/datasetStore';
import { useSessionStore } from '../store/sessionStore';
import { useTrainingStore } from '../store/trainingStore';

export default function Dashboard() {
  const profile = useDatasetStore((state) => state.profile);
  const session = useTrainingStore((state) => state.session);
  const experiments = useSessionStore((state) => state.experiments);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      className="space-y-6"
    >
      <div>
        <h1 className="text-2xl font-semibold text-text-primary">Dashboard</h1>
        <p className="mt-1 text-sm text-text-secondary">Upload data, train models, inspect explanations, and ask Astra what to do next.</p>
      </div>
      <div className="grid grid-cols-4 gap-4">
        {[
          [Database, 'Dataset', profile?.filename ?? 'None loaded'],
          [FlaskConical, 'Experiments', String(experiments.length)],
          [UploadCloud, 'Rows', profile ? profile.row_count.toLocaleString() : '0'],
          [MessageSquare, 'Best model', session?.best_model?.replace(/_/g, ' ') ?? 'Not trained'],
        ].map(([Icon, label, value]) => {
          const LucideIcon = Icon as typeof Database;
          return (
            <div key={String(label)} className="rounded border border-border bg-white p-5 shadow-card">
              <LucideIcon className="mb-4 text-accent" size={22} strokeWidth={1.5} />
              <div className="text-sm text-text-secondary">{String(label)}</div>
              <div className="mt-1 truncate text-lg font-semibold text-text-primary">{String(value)}</div>
            </div>
          );
        })}
      </div>

      {!profile && (
        <div className="rounded border border-border bg-canvas-secondary p-8 text-center">
          <h2 className="text-lg font-semibold text-text-primary">Start with a dataset</h2>
          <p className="mt-2 text-sm text-text-secondary">AstraML becomes useful the moment it can read a CSV.</p>
          <Link className="mt-4 inline-flex rounded bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-dark" to="/upload">
            Upload Dataset
          </Link>
        </div>
      )}

      {session && <ReportGenerator />}
    </motion.div>
  );
}

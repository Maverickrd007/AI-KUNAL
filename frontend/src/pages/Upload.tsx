import { motion } from 'framer-motion';

import { CleaningPipeline } from '../components/cleaning/CleaningPipeline';
import { DropZone } from '../components/upload/DropZone';
import { DatasetFingerprint } from '../components/upload/DatasetFingerprint';
import { useDatasetStore } from '../store/datasetStore';

export default function Upload() {
  const profile = useDatasetStore((state) => state.profile);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      className="space-y-8"
    >
      <div>
        <h1 className="text-2xl font-semibold text-text-primary">Upload Dataset</h1>
        <p className="mt-1 text-sm text-text-secondary">CSV and XLSX files up to 50MB are supported.</p>
      </div>
      <DropZone />
      {profile && <DatasetFingerprint profile={profile} />}
      {profile && <CleaningPipeline />}
    </motion.div>
  );
}

import { motion } from 'framer-motion';

interface ActionChipProps {
  label: string;
  isProcessing?: boolean;
  onClick: () => void;
}

export function ActionChip({ label, isProcessing = false, onClick }: ActionChipProps) {
  const content = (
    <button
      onClick={onClick}
      className="rounded border border-border bg-white px-3 py-1.5 text-sm text-text-secondary hover:border-accent hover:text-accent"
    >
      {label}
    </button>
  );
  if (!isProcessing) {
    return content;
  }
  return (
    <motion.div animate={{ opacity: [1, 0.5, 1] }} transition={{ repeat: Infinity, duration: 1.2 }}>
      {content}
    </motion.div>
  );
}

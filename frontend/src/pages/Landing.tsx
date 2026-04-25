import { motion } from 'framer-motion';
import { ArrowRight, Bot, ChartNoAxesColumn, DatabaseZap } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Landing() {
  return (
    <div className="min-h-screen bg-white text-text-primary">
      <section className="mx-auto grid min-h-[68vh] max-w-6xl grid-cols-[1fr_460px] items-center gap-12 px-8 py-16">
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
          <h1 className="text-6xl font-semibold tracking-normal">Your AI data scientist.</h1>
          <p className="mt-5 max-w-xl text-lg leading-8 text-text-secondary">
            Upload a dataset. Astra cleans it, trains the best model, explains the results, and tells you what to do next - in plain English.
          </p>
          <Link
            to="/upload"
            className="mt-8 inline-flex items-center gap-2 rounded bg-accent px-5 py-3 text-sm font-semibold text-white hover:bg-accent-dark"
          >
            Upload your first dataset <ArrowRight size={17} strokeWidth={1.5} />
          </Link>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: 'easeOut' }}
          className="rounded border border-border bg-canvas-secondary p-5 shadow-card"
        >
          <div className="mb-4 flex gap-2">
            {['numeric', 'categorical', 'boolean', 'target'].map((label) => (
              <div key={label} className="rounded-full border border-border bg-white px-3 py-1 text-xs text-text-secondary">
                {label}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-10 gap-1">
            {Array.from({ length: 90 }).map((_, index) => (
              <motion.div
                key={index}
                animate={{ opacity: [0.35, 1, 0.6] }}
                transition={{ duration: 1.8, repeat: Infinity, delay: index * 0.01 }}
                className={`h-4 rounded-[2px] ${index % 23 === 0 ? 'bg-red-400' : 'bg-white'}`}
              />
            ))}
          </div>
          <div className="mt-5 rounded border-l-4 border-accent bg-white p-4 text-sm leading-6 text-text-secondary">
            Astra found 1,000 rows, an imbalanced churn target, two leakage candidates, and missing values ready for cleaning.
          </div>
        </motion.div>
      </section>

      <section className="border-y border-border bg-canvas-secondary px-8 py-12">
        <div className="mx-auto grid max-w-6xl grid-cols-3 gap-5">
          {[
            [DatabaseZap, 'Dataset Fingerprint', 'Astra reads your data before you do'],
            [ChartNoAxesColumn, 'Smart Training', '5 algorithms, best one wins, reasons explained'],
            [Bot, 'Chat Copilot', 'Ask anything. Trigger real actions.'],
          ].map(([Icon, title, copy]) => {
            const LucideIcon = Icon as typeof DatabaseZap;
            return (
              <div key={String(title)} className="rounded border border-border bg-white p-5 shadow-card">
                <LucideIcon className="mb-4 text-accent" size={24} strokeWidth={1.5} />
                <h3 className="font-semibold text-text-primary">{String(title)}</h3>
                <p className="mt-2 text-sm text-text-secondary">{String(copy)}</p>
              </div>
            );
          })}
        </div>
      </section>
      <div className="px-8 py-6 text-center text-sm text-text-muted">
        Built at Claw Hack 2025 / Powered by Groq + Gemini / Open source
      </div>
    </div>
  );
}

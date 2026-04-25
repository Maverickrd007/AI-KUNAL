import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle } from 'lucide-react';

import { MissingValueHeatmap } from '../cleaning/MissingValueHeatmap';
import type { ColumnProfile, DatasetProfile } from '../../types';

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.07 },
  },
};

const item = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.25, ease: 'easeOut' } },
};

const dtypeColors: Record<ColumnProfile['dtype'], string> = {
  numeric: 'bg-blue-500',
  categorical: 'bg-purple-500',
  datetime: 'bg-teal-500',
  boolean: 'bg-green-500',
  unknown: 'bg-slate-400',
};

function ColumnPopover({ column }: { column: ColumnProfile }) {
  return (
    <div className="absolute left-0 top-10 z-20 w-72 rounded border border-border bg-white p-4 text-left shadow-modal">
      <div className="mb-3 font-semibold text-text-primary">{column.name}</div>
      <div className="grid grid-cols-2 gap-2 text-xs text-text-secondary">
        <span>Type</span>
        <span className="text-text-primary">{column.dtype}</span>
        <span>Missing</span>
        <span className="text-text-primary">{column.missing_count} ({column.missing_pct}%)</span>
        <span>Unique</span>
        <span className="text-text-primary">{column.unique_count}</span>
        {column.mean !== undefined && (
          <>
            <span>Mean</span>
            <span className="text-text-primary">{column.mean}</span>
            <span>Range</span>
            <span className="text-text-primary">
              {column.min} to {column.max}
            </span>
          </>
        )}
      </div>
      {column.top_categories && (
        <div className="mt-3 space-y-1 text-xs">
          {column.top_categories.slice(0, 5).map((category) => (
            <div key={category.value} className="flex justify-between text-text-secondary">
              <span className="truncate">{category.value}</span>
              <span>{category.count}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function DatasetFingerprint({ profile }: { profile: DatasetProfile }) {
  const [activeColumn, setActiveColumn] = useState<string | null>(null);
  const [activeCorrelation, setActiveCorrelation] = useState<string | null>(null);
  const numericColumns = Object.keys(profile.correlation_matrix);
  const totalClasses = profile.class_balance?.reduce((sum, item) => sum + item.count, 0) ?? 0;
  const isImbalanced = Boolean(
    profile.class_balance?.some((entry) => totalClasses > 0 && entry.count / totalClasses < 0.2),
  );

  const correlationCells = useMemo(
    () =>
      numericColumns.flatMap((row) =>
        numericColumns.map((column) => ({
          row,
          column,
          value: profile.correlation_matrix[row]?.[column] ?? 0,
        })),
      ),
    [numericColumns, profile.correlation_matrix],
  );

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      <motion.section variants={item} className="rounded border border-border bg-white p-5 shadow-card">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-text-primary">Dataset Fingerprint</h2>
          <div className="text-sm text-text-secondary">
            {profile.row_count.toLocaleString()} rows x {profile.col_count} columns
          </div>
        </div>
        <div className="flex gap-2 overflow-x-auto pb-2">
          {profile.columns.map((column) => (
            <button
              key={column.name}
              className="relative inline-flex shrink-0 items-center gap-2 rounded border border-border px-3 py-2 text-sm hover:border-accent"
              onClick={() => setActiveColumn(activeColumn === column.name ? null : column.name)}
            >
              <span className={`h-2 w-2 rounded-full ${dtypeColors[column.dtype]}`} />
              <span>{column.name}</span>
              {activeColumn === column.name && <ColumnPopover column={column} />}
            </button>
          ))}
        </div>
      </motion.section>

      <motion.section variants={item} className="rounded border border-border bg-canvas-secondary p-5">
        <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-text-secondary">Missing Value Heatmap</h3>
        <MissingValueHeatmap profile={profile} />
      </motion.section>

      {profile.class_balance && (
        <motion.section variants={item} className="rounded border border-border bg-white p-5 shadow-card">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-text-secondary">Class Distribution</h3>
            {isImbalanced && (
              <span className="rounded bg-amber-50 px-2 py-1 text-xs font-medium text-amber-700">
                Imbalanced dataset detected - consider SMOTE or class weights
              </span>
            )}
          </div>
          <div className="space-y-3">
            {profile.class_balance.map((entry) => {
              const pct = totalClasses ? (entry.count / totalClasses) * 100 : 0;
              return (
                <div key={entry.label}>
                  <div className="mb-1 flex justify-between text-sm">
                    <span>{entry.label}</span>
                    <span className="text-text-secondary">{entry.count} ({pct.toFixed(1)}%)</span>
                  </div>
                  <div className="h-2 rounded bg-slate-100">
                    <div className="h-2 rounded bg-accent" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </motion.section>
      )}

      {numericColumns.length >= 2 && numericColumns.length <= 15 && (
        <motion.section variants={item} className="rounded border border-border bg-white p-5 shadow-card">
          <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-text-secondary">Correlation Spark Matrix</h3>
          <div
            className="grid w-fit gap-1"
            style={{ gridTemplateColumns: `90px repeat(${numericColumns.length}, 34px)` }}
          >
            <div />
            {numericColumns.map((column) => (
              <div key={column} className="-rotate-45 truncate text-[10px] text-text-muted">
                {column}
              </div>
            ))}
            {numericColumns.map((row) => (
              <div key={row} className="contents">
                <div className="truncate pr-2 text-right text-[10px] text-text-muted">{row}</div>
                {correlationCells
                  .filter((cell) => cell.row === row)
                  .map((cell) => {
                    const red = cell.value > 0 ? Math.round(255 * cell.value) : 0;
                    const blue = cell.value < 0 ? Math.round(255 * Math.abs(cell.value)) : 0;
                    const color = `rgb(${255 - blue}, ${255 - red - blue / 3}, ${255 - red})`;
                    return (
                      <button
                        key={`${cell.row}-${cell.column}`}
                        className="h-7 w-7 rounded border border-white"
                        style={{ backgroundColor: color }}
                        onClick={() =>
                          setActiveCorrelation(`${cell.row} vs ${cell.column}: r = ${cell.value.toFixed(2)}`)
                        }
                        title={`${cell.row} vs ${cell.column}: ${cell.value.toFixed(2)}`}
                      />
                    );
                  })}
              </div>
            ))}
          </div>
          {activeCorrelation && <div className="mt-3 text-sm text-text-secondary">{activeCorrelation}</div>}
        </motion.section>
      )}

      {profile.leakage_warnings.length > 0 && (
        <motion.section variants={item} className="space-y-3">
          {profile.leakage_warnings.map((warning) => (
            <div key={`${warning.column}-${warning.warning}`} className="flex gap-3 rounded border border-red-200 bg-red-50 p-4 text-red-700">
              <AlertTriangle size={18} strokeWidth={1.5} className="mt-0.5 shrink-0" />
              <div className="text-sm">
                <span className="font-semibold">{warning.column}</span> correlates {warning.correlation_with_target} with the target - {warning.warning}
              </div>
            </div>
          ))}
        </motion.section>
      )}

      <motion.blockquote
        variants={item}
        className="border-l-4 border-accent bg-accent-light/60 p-5 text-sm leading-6 text-text-primary"
      >
        {profile.astra_summary}
      </motion.blockquote>
    </motion.div>
  );
}

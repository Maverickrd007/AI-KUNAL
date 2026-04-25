import type { DatasetProfile } from '../../types';

interface MissingValueHeatmapProps {
  profile: DatasetProfile;
}

export function MissingValueHeatmap({ profile }: MissingValueHeatmapProps) {
  const rows = Array.from({ length: Math.min(100, Math.max(12, Math.min(profile.row_count, 100))) });
  const columns = profile.columns;

  return (
    <div className="overflow-x-auto">
      <div
        className="grid gap-px"
        style={{
          gridTemplateColumns: `120px repeat(${columns.length}, minmax(18px, 1fr))`,
        }}
      >
        <div />
        {columns.map((column) => (
          <div key={column.name} className="truncate text-[10px] text-text-muted" title={column.name}>
            {column.name}
          </div>
        ))}
        {rows.map((_, rowIndex) => (
          <div key={`row-${rowIndex}`} className="contents">
            <div className="pr-2 text-right text-[10px] text-text-muted">sample {rowIndex + 1}</div>
            {columns.map((column, colIndex) => {
              const missingCells = Math.round((column.missing_pct / 100) * rows.length);
              const isMissing = missingCells > 0 && (rowIndex * 7 + colIndex * 3) % rows.length < missingCells;
              return (
                <div
                  key={`${column.name}-${rowIndex}`}
                  className={isMissing ? 'h-3 rounded-[2px] bg-red-400' : 'h-3 rounded-[2px] bg-white ring-1 ring-slate-100'}
                  title={`${column.name}: ${isMissing ? 'missing' : 'present'}`}
                />
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

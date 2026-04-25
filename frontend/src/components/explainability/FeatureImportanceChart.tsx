import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

import type { FeatureImportance } from '../../types';

export function FeatureImportanceChart({ data }: { data: FeatureImportance[] }) {
  const chartData = data.slice(0, 12).map((item) => ({
    feature: item.feature,
    importance: item.importance,
    shap: item.shap_mean_abs ?? 0,
  }));

  if (!chartData.length) {
    return (
      <div className="rounded border border-border bg-canvas-secondary p-8 text-center text-sm text-text-secondary">
        Feature importance is not available for this model.
      </div>
    );
  }

  return (
    <div className="h-[340px] rounded border border-border bg-white p-4 shadow-card">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} layout="vertical" margin={{ left: 30, right: 20 }}>
          <CartesianGrid strokeDasharray="3 3" horizontal={false} />
          <XAxis type="number" />
          <YAxis type="category" dataKey="feature" width={150} tick={{ fontSize: 12 }} />
          <Tooltip />
          <Bar dataKey="importance" fill="#6366f1" radius={[0, 4, 4, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

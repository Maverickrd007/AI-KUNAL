import { useState } from 'react';
import { FileText } from 'lucide-react';

import { generateReport } from '../../lib/api';
import { useTrainingStore } from '../../store/trainingStore';

const sections = [
  'problem_statement',
  'dataset_overview',
  'cleaning_summary',
  'model_comparison',
  'best_model_deep_dive',
  'feature_importance',
  'astra_insights',
  'recommendations',
];

export function ReportGenerator() {
  const session = useTrainingStore((state) => state.session);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const download = async () => {
    if (!session) {
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const blob = await generateReport({
        session_id: session.session_id,
        format: 'pdf',
        include_sections: sections as never,
      });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = 'astraml-report.pdf';
      anchor.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Report generation failed.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="rounded border border-border bg-white p-5 shadow-card">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-text-primary">Report Generator</h2>
          <p className="mt-1 text-sm text-text-secondary">Gemini writes the narrative, PDFKit assembles the report.</p>
        </div>
        <button
          disabled={!session || isLoading}
          onClick={() => void download()}
          className="inline-flex items-center gap-2 rounded bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-dark disabled:cursor-not-allowed disabled:opacity-60"
        >
          <FileText size={17} strokeWidth={1.5} />
          {isLoading ? 'Generating...' : 'Download PDF'}
        </button>
      </div>
      {error && (
        <div className="mt-4 rounded border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
          <div className="mt-1 text-red-600">Check the Gemini API key or retry with a completed training session.</div>
        </div>
      )}
    </div>
  );
}

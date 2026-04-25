import PDFDocument from 'pdfkit';
import { GoogleGenerativeAI } from '@google/generative-ai';

import { ExperimentStore } from './experimentStore.js';
import type { DatasetProfile, ModelResult, ReportRequest, TrainingSession } from './types.js';

interface ReportNarrative {
  executive_summary: string;
  dataset_overview: string;
  model_comparison_narrative: string;
  key_insights: string[];
  recommendations: string[];
}

function displayAlgorithm(algorithm: string): string {
  return algorithm.replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function bestMetric(session: TrainingSession, result: ModelResult): number {
  if (session.problem_type === 'classification') {
    return result.f1_score ?? result.accuracy ?? result.cv_mean ?? 0;
  }
  return result.r2_score ?? result.cv_mean ?? 0;
}

export class ReportService {
  private store = new ExperimentStore();

  async generateNarrative(session: TrainingSession, profile: DatasetProfile | null): Promise<ReportNarrative> {
    const prompt = `You are writing a professional data science report for AstraML.

Session data:
${JSON.stringify(session, null, 2)}

Dataset profile:
${JSON.stringify(profile, null, 2)}

Write the following sections as professional, specific prose.
Cite actual numbers. Do not use generic phrases like "performed well".

Sections to write:
1. Executive Summary (2 paragraphs): What was the business problem implied by
   the data? What did we find? What should the reader do next?
2. Dataset Overview (1 paragraph): Describe the dataset's key characteristics,
   quality issues found, and any leakage warnings.
3. Model Comparison Narrative (1 paragraph): Compare all trained models, explain
   why the winner won in plain English with specific metric citations.
4. Key Insights (3 bullet points): The 3 most important things learned from
   this analysis that a business decision-maker should know.
5. Recommendations (3 bullet points): The 3 most impactful next steps.

Return as JSON:
{
  "executive_summary": "...",
  "dataset_overview": "...",
  "model_comparison_narrative": "...",
  "key_insights": ["...", "...", "..."],
  "recommendations": ["...", "...", "..."]
}`;

    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey && apiKey !== 'your_gemini_key_here') {
      try {
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
        const result = await model.generateContent(prompt);
        const text = result.response.text().replace(/```json|```/g, '').trim();
        return JSON.parse(text) as ReportNarrative;
      } catch {
        // Fall through to the deterministic narrative below.
      }
    }

    const winner = session.results.find((result) => result.algorithm === session.best_model) ?? session.results[0];
    const metricName = session.problem_type === 'classification' ? 'F1' : 'R2';
    const metric = winner ? bestMetric(session, winner).toFixed(3) : '0.000';
    return {
      executive_summary: `AstraML analyzed ${profile?.filename ?? session.dataset_id} with ${profile?.row_count ?? 'unknown'} rows and ${profile?.col_count ?? 'unknown'} columns. The target was ${session.target_column}, and the strongest model was ${displayAlgorithm(session.best_model)} with ${metricName} ${metric}.\n\nThe next step is to review leakage warnings and validate the winning feature signals before using this model for decisions.`,
      dataset_overview: `${profile?.filename ?? 'The dataset'} contains ${profile?.row_count ?? 'unknown'} rows. ${profile?.leakage_warnings.length ? `Leakage warnings were raised for ${profile.leakage_warnings.map((warning) => warning.column).join(', ')}.` : 'No leakage warnings were stored.'}`,
      model_comparison_narrative: session.results
        .map((result) => `${displayAlgorithm(result.algorithm)} reached ${metricName} ${bestMetric(session, result).toFixed(3)}`)
        .join('; '),
      key_insights: [
        session.astra_verdict.key_insight,
        session.astra_verdict.winner_reason,
        session.astra_verdict.watch_out ?? 'No additional watch-out was generated.',
      ],
      recommendations: [
        session.astra_verdict.recommendation,
        'Compare at least one retrained model after removing suspicious leakage features.',
        'Validate the selected model on fresh holdout data before deployment.',
      ],
    };
  }

  async buildPdf(request: ReportRequest): Promise<Buffer> {
    const session = this.store.getSessionBySessionId(request.session_id);
    if (!session) {
      throw new Error('Training session was not found.');
    }
    const profile = this.store.getDatasetProfile(session.dataset_id);
    const narrative = await this.generateNarrative(session, profile);

    const doc = new PDFDocument({ size: 'LETTER', margin: 54 });
    const chunks: Buffer[] = [];
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    const done = new Promise<Buffer>((resolve) => {
      doc.on('end', () => resolve(Buffer.concat(chunks)));
    });

    doc.fontSize(30).fillColor('#0f172a').text('AstraML Report');
    doc.moveDown(0.5).fontSize(14).fillColor('#64748b').text(profile?.filename ?? session.dataset_id);
    doc.text(new Date().toLocaleDateString('en-US'));
    doc.moveDown(2).fontSize(16).fillColor('#4338ca').text(session.astra_verdict.winner_reason);

    doc.addPage().fontSize(22).fillColor('#0f172a').text('Executive Summary');
    doc.moveDown().fontSize(11).fillColor('#0f172a').text(narrative.executive_summary, { lineGap: 5 });

    doc.addPage().fontSize(22).text('Dataset Overview');
    doc.moveDown().fontSize(11).text(narrative.dataset_overview, { lineGap: 5 });
    doc.moveDown();
    if (profile) {
      doc.fontSize(12).text(`Rows: ${profile.row_count}`);
      doc.text(`Columns: ${profile.col_count}`);
      doc.text(`Target: ${profile.target_column ?? 'unknown'}`);
      doc.text(`Problem: ${profile.problem_type}`);
    }

    doc.addPage().fontSize(22).text('Model Comparison');
    doc.moveDown().fontSize(11).text(narrative.model_comparison_narrative, { lineGap: 5 });
    doc.moveDown();
    const metricLabel = session.problem_type === 'classification' ? 'F1 Score' : 'R2 Score';
    session.results.forEach((result) => {
      const metric = bestMetric(session, result);
      doc.fontSize(10).fillColor('#0f172a').text(`${displayAlgorithm(result.algorithm)}: ${metricLabel} ${metric.toFixed(3)}`);
      const width = Math.max(4, Math.min(360, Math.abs(metric) * 320));
      doc.rect(54, doc.y + 2, width, 8).fill('#6366f1');
      doc.moveDown(0.8);
    });

    doc.addPage().fontSize(22).fillColor('#0f172a').text('Best Model Deep Dive');
    const winner = session.results.find((result) => result.algorithm === session.best_model);
    doc.moveDown().fontSize(12).text(`Winner: ${displayAlgorithm(session.best_model)}`);
    if (winner?.confusion_matrix) {
      doc.moveDown().fontSize(12).text('Confusion Matrix');
      winner.confusion_matrix.forEach((row) => doc.fontSize(10).text(row.join('  ')));
    }
    doc.moveDown().fontSize(12).text('Top Feature Importance');
    winner?.feature_importance.slice(0, 10).forEach((item) => {
      doc.fontSize(10).text(`${item.feature}: ${item.importance}`);
    });

    doc.addPage().fontSize(22).text('Key Insights');
    narrative.key_insights.forEach((item) => doc.moveDown(0.5).fontSize(11).text(`- ${item}`));
    doc.moveDown(1.5).fontSize(22).text('Recommendations');
    narrative.recommendations.forEach((item) => doc.moveDown(0.5).fontSize(11).text(`- ${item}`));

    doc.addPage().fontSize(22).text('Appendix');
    session.results.forEach((result) => {
      doc.moveDown(0.5)
        .fontSize(10)
        .text(`${displayAlgorithm(result.algorithm)}: ${JSON.stringify(result)}`, { lineGap: 3 });
    });

    doc.end();
    return done;
  }
}

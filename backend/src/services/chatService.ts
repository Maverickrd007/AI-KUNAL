import { randomUUID } from 'node:crypto';

import Groq from 'groq-sdk';

import { ExperimentStore } from './experimentStore.js';
import { MlService } from './mlService.js';
import type { ActionType, ChatAction, ChatMessage, Experiment, ModelResult, TrainingSession } from './types.js';

const ACTION_TYPES: ActionType[] = [
  'retrain',
  'explain_feature',
  'compare_models',
  'clean_data',
  'suggest_next',
  'generate_report',
  'what_if',
  'detect_leakage',
  'show_confusion_matrix',
];

function displayAlgorithm(algorithm: string): string {
  return algorithm.replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function metricName(session: TrainingSession): 'f1_score' | 'r2_score' {
  return session.problem_type === 'classification' ? 'f1_score' : 'r2_score';
}

function metricValue(result: ModelResult, session: TrainingSession): number {
  const name = metricName(session);
  return Number((result[name] ?? result.cv_mean ?? 0).toFixed(4));
}

function stripActionBlock(content: string): string {
  return content.replace(/<action>[\s\S]*?<\/action>/g, '').trim();
}

function parseAction(content: string): { type: ActionType; params: Record<string, unknown> } | null {
  const match = content.match(/<action>([\s\S]*?)<\/action>/);
  if (!match) {
    return null;
  }
  try {
    const parsed = JSON.parse(match[1]);
    if (ACTION_TYPES.includes(parsed.type)) {
      const { type, ...params } = parsed;
      return { type, params };
    }
  } catch {
    return null;
  }
  return null;
}

export class ChatService {
  private store = new ExperimentStore();
  private ml = new MlService();

  assembleContext(experiment: Experiment | null, session: TrainingSession | null, recent: ChatMessage[]): string {
    const profile = session ? this.store.getDatasetProfile(session.dataset_id) : null;
    const bestResult = session?.results.find((result) => result.algorithm === session.best_model);
    const metric = session && bestResult ? metricName(session) : 'f1_score';
    const bestMetricValue = session && bestResult ? metricValue(bestResult, session) : 'N/A';
    const modelSummary = session
      ? session.results
          .map((result) => {
            const value = metricValue(result, session);
            return `${result.algorithm} | ${metric}: ${value} | CV ${result.cv_mean ?? 'N/A'} +/- ${result.cv_std ?? 'N/A'}`;
          })
          .join('\n')
      : 'No models trained yet.';
    const topFeatures = bestResult?.feature_importance
      ?.slice(0, 5)
      .map((item, index) => `${index + 1}. ${item.feature}: ${item.importance}`)
      .join('\n') ?? 'No feature importance is available yet.';
    const conversation = recent
      .slice(-6)
      .map((message) => `${message.role}: ${message.content}`)
      .join('\n');

    return `You are Astra, an expert data scientist assistant inside AstraML.

=== CURRENT SESSION CONTEXT ===
Dataset: ${experiment?.dataset_filename ?? profile?.filename ?? 'unknown'} (${profile?.row_count ?? 'unknown'} rows, ${profile?.col_count ?? 'unknown'} columns)
Target column: ${session?.target_column ?? profile?.target_column ?? 'unknown'}
Problem type: ${session?.problem_type ?? profile?.problem_type ?? 'unknown'}
Current best model: ${session?.best_model ?? 'none'} (${metric}: ${bestMetricValue})
Data quality warnings: ${profile?.leakage_warnings?.length ? JSON.stringify(profile.leakage_warnings) : 'none'}

=== MODEL RESULTS SUMMARY ===
${modelSummary}

=== TOP 5 FEATURES ===
${topFeatures}

=== RECENT CONVERSATION ===
${conversation || 'No recent messages.'}

=== ACTION REGISTRY ===
You can trigger the following actions by responding with a JSON block
wrapped in <action></action> tags BEFORE your natural language response.

Actions:
- retrain: { "type": "retrain", "algorithm": "<algo>", "mode": "<mode>" }
- explain_feature: { "type": "explain_feature", "feature": "<name>" }
- compare_models: { "type": "compare_models" }
- generate_report: { "type": "generate_report", "format": "pdf" }
- what_if: { "type": "what_if", "feature_values": { "<col>": <val> } }
- detect_leakage: { "type": "detect_leakage" }
- suggest_next: { "type": "suggest_next" }

RULES:
1. Always respond in plain English after the action block (if any).
2. Never invent data - only reference what is in the context above.
3. If the user asks something you cannot action, explain why and suggest what they CAN do.
4. Be concise. Max 3 sentences unless explaining a complex result.
5. When you trigger an action, briefly explain what you're doing and why.`;
  }

  async callGroq(systemPrompt: string, messages: ChatMessage[]): Promise<string> {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey || apiKey === 'your_groq_key_here') {
      throw new Error('Groq API key is not configured.');
    }
    const groq = new Groq({ apiKey });
    const history = messages.slice(-8).map(
      (message): { role: 'user' | 'assistant'; content: string } => ({
        role: message.role === 'assistant' ? 'assistant' : 'user',
        content: message.content,
      }),
    );
    const response = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      temperature: 0.2,
      messages: [
        { role: 'system' as const, content: systemPrompt },
        ...history,
      ],
    });
    return response.choices[0]?.message?.content?.trim() ?? 'I could not generate a response.';
  }

  localResponse(message: string, session: TrainingSession | null): string {
    const lower = message.toLowerCase();
    const best = session?.results.find((result) => result.algorithm === session.best_model);
    const topFeature = best?.feature_importance?.[0];

    if (lower.includes('try gradient boosting') || lower.includes('gradient_boosting')) {
      return '<action>{"type":"retrain","algorithm":"gradient_boosting","mode":"balanced"}</action>I will retrain with Gradient Boosting so you can compare it against the current winner.';
    }
    if (lower.includes('report')) {
      return '<action>{"type":"generate_report","format":"pdf"}</action>I will prepare the report request using the current training session.';
    }
    if (lower.includes('leak')) {
      return '<action>{"type":"detect_leakage"}</action>I will check the stored leakage warnings for this dataset.';
    }
    if (lower.includes('feature') || lower.includes('matters most')) {
      if (topFeature) {
        return `The strongest feature in the winning model is ${topFeature.feature}, with importance ${topFeature.importance}. Ask me to explain that feature if you want a narrower read.`;
      }
      return 'No feature importance is available until you train a model.';
    }
    if (lower.includes('why') && session && best) {
      const value = metricValue(best, session);
      return `${displayAlgorithm(session.best_model)} is the current winner because it achieved ${metricName(session).replace('_', ' ')} ${value}. ${session.astra_verdict.winner_reason}`;
    }
    if (session?.astra_verdict) {
      return `${session.astra_verdict.key_insight} ${session.astra_verdict.recommendation}`;
    }
    return 'Upload a dataset and train at least one model, then I can answer with session-specific numbers.';
  }

  async executeAction(
    action: { type: ActionType; params: Record<string, unknown> },
    session: TrainingSession | null,
  ): Promise<ChatAction> {
    const chatAction: ChatAction = {
      type: action.type,
      params: action.params,
      status: 'running',
    };
    try {
      if (!session && !['suggest_next'].includes(action.type)) {
        throw new Error('No trained experiment is active.');
      }
      switch (action.type) {
        case 'retrain': {
          const algorithm = String(action.params.algorithm ?? 'gradient_boosting') as TrainingSession['best_model'];
          const mode = String(action.params.mode ?? 'balanced') as 'fast' | 'balanced' | 'thorough';
          const retrained = await this.ml.trainDataset({
            dataset_id: session!.dataset_id,
            target_column: session!.target_column,
            problem_type: session!.problem_type,
            algorithms: [algorithm],
            mode,
            test_size: 0.2,
            cross_validation_folds: 3,
          });
          const experiment = this.store.createExperiment(retrained);
          chatAction.result_summary = `Retrained ${displayAlgorithm(algorithm)} and saved ${experiment.name}.`;
          break;
        }
        case 'explain_feature': {
          const feature = String(action.params.feature ?? session!.results[0]?.feature_importance[0]?.feature ?? '');
          const winning = session!.results.find((result) => result.algorithm === session!.best_model);
          const found = winning?.feature_importance.find((item) => item.feature === feature) ?? winning?.feature_importance[0];
          chatAction.result_summary = found
            ? `${found.feature} has importance ${found.importance} in ${displayAlgorithm(session!.best_model)}.`
            : 'No feature importance is available for this session.';
          break;
        }
        case 'compare_models': {
          chatAction.result_summary = session!.results
            .map((result) => `${displayAlgorithm(result.algorithm)}: ${metricName(session!)} ${metricValue(result, session!)}`)
            .join('; ');
          break;
        }
        case 'detect_leakage': {
          const profile = this.store.getDatasetProfile(session!.dataset_id);
          chatAction.result_summary = profile?.leakage_warnings.length
            ? profile.leakage_warnings.map((warning) => warning.warning).join(' ')
            : 'No leakage warnings were stored for this dataset.';
          break;
        }
        case 'show_confusion_matrix': {
          const winning = session!.results.find((result) => result.algorithm === session!.best_model);
          chatAction.result_summary = winning?.confusion_matrix
            ? JSON.stringify(winning.confusion_matrix)
            : 'This session does not have a confusion matrix.';
          break;
        }
        case 'what_if': {
          const result = await this.ml.whatIf(session!.session_id, action.params.feature_values as Record<string, unknown>);
          chatAction.result_summary = JSON.stringify(result);
          break;
        }
        case 'generate_report':
          chatAction.result_summary = 'Report generation is ready from the Reports panel for this session.';
          break;
        case 'clean_data':
          chatAction.result_summary = 'Use the Cleaning page to review and confirm the cleaning pipeline before it changes the dataset.';
          break;
        case 'suggest_next':
          chatAction.result_summary = session
            ? session.astra_verdict.recommendation
            : 'Upload a dataset, inspect leakage warnings, then train a baseline model.';
          break;
        default:
          chatAction.result_summary = 'Action completed.';
      }
      chatAction.status = 'done';
    } catch (error) {
      chatAction.status = 'failed';
      chatAction.result_summary = error instanceof Error ? error.message : 'Action failed.';
    }
    return chatAction;
  }

  async respond(chatSessionId: string, message: string, experimentId?: string): Promise<ChatMessage> {
    const chatSession = this.store.getOrCreateChatSession(chatSessionId, experimentId);
    const targetExperimentId = experimentId ?? chatSession.experiment_id ?? undefined;
    const experiment = targetExperimentId ? this.store.getExperiment(targetExperimentId) : null;
    const session = targetExperimentId ? this.store.getSessionByExperiment(targetExperimentId) : null;
    const userMessage: ChatMessage = {
      id: randomUUID(),
      role: 'user',
      content: message,
      timestamp: new Date().toISOString(),
    };
    const messages = [...chatSession.messages, userMessage];
    const systemPrompt = this.assembleContext(experiment, session, messages);

    let rawResponse: string;
    try {
      rawResponse = await this.callGroq(systemPrompt, messages);
    } catch {
      rawResponse = this.localResponse(message, session);
    }

    const parsedAction = parseAction(rawResponse);
    const action = parsedAction ? await this.executeAction(parsedAction, session) : undefined;
    const natural = stripActionBlock(rawResponse);
    const content = action?.result_summary
      ? `${natural}\n\nAction result: ${action.result_summary}`
      : natural;

    const assistantMessage: ChatMessage = {
      id: randomUUID(),
      role: 'assistant',
      content,
      action,
      timestamp: new Date().toISOString(),
    };
    const updated = [...messages, assistantMessage];
    this.store.updateChatSession(chatSessionId, targetExperimentId, updated, { systemPrompt });
    return assistantMessage;
  }
}

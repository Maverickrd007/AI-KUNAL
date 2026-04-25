export interface ColumnProfile {
  name: string;
  dtype: 'numeric' | 'categorical' | 'datetime' | 'boolean' | 'unknown';
  missing_count: number;
  missing_pct: number;
  unique_count: number;
  sample_values: (string | number)[];
  mean?: number;
  std?: number;
  min?: number;
  max?: number;
  top_categories?: { value: string; count: number }[];
}

export interface LeakageWarning {
  column: string;
  correlation_with_target: number;
  warning: string;
}

export interface DatasetProfile {
  dataset_id: string;
  filename: string;
  row_count: number;
  col_count: number;
  columns: ColumnProfile[];
  target_column: string | null;
  problem_type: 'classification' | 'regression' | 'unknown';
  class_balance: { label: string; count: number }[] | null;
  correlation_matrix: Record<string, Record<string, number>>;
  leakage_warnings: LeakageWarning[];
  astra_summary: string;
}

export interface CleaningConfig {
  missing_strategy: 'mean' | 'median' | 'mode' | 'drop_rows' | 'drop_cols';
  outlier_strategy: 'iqr_clip' | 'zscore_remove' | 'none';
  encoding_strategy: 'label' | 'onehot';
  scaling_strategy: 'standard' | 'minmax' | 'none';
  columns_to_drop: string[];
}

export interface CleaningResult {
  original_shape: [number, number];
  cleaned_shape: [number, number];
  rows_removed: number;
  columns_encoded: string[];
  columns_scaled: string[];
  nulls_filled: Record<string, number>;
  cleaned_dataset_id: string;
  pipeline_steps: PipelineStep[];
}

export interface PipelineStep {
  step: string;
  description: string;
  status: 'done' | 'skipped' | 'warning';
  detail?: string;
}

export type Algorithm =
  | 'logistic_regression'
  | 'random_forest'
  | 'decision_tree'
  | 'knn'
  | 'gradient_boosting';

export type TrainingMode = 'fast' | 'balanced' | 'thorough';

export interface TrainingConfig {
  dataset_id: string;
  target_column: string;
  problem_type: 'classification' | 'regression';
  algorithms: Algorithm[];
  mode: TrainingMode;
  test_size: number;
  cross_validation_folds: number;
}

export interface TrainingProgressEvent {
  type: 'start' | 'epoch' | 'model_done' | 'all_done' | 'error';
  algorithm?: Algorithm;
  progress_pct?: number;
  current_metric?: number;
  message?: string;
  session?: TrainingSession;
}

export interface FeatureImportance {
  feature: string;
  importance: number;
  shap_mean_abs?: number;
}

export interface ModelResult {
  algorithm: Algorithm;
  accuracy?: number;
  f1_score?: number;
  precision?: number;
  recall?: number;
  roc_auc?: number;
  confusion_matrix?: number[][];
  rmse?: number;
  mae?: number;
  r2_score?: number;
  cv_mean?: number;
  cv_std?: number;
  training_time_ms: number;
  feature_importance: FeatureImportance[];
}

export interface AstraVerdict {
  winner: Algorithm;
  winner_reason: string;
  key_insight: string;
  recommendation: string;
  watch_out: string | null;
}

export interface TrainingSession {
  session_id: string;
  dataset_id: string;
  target_column: string;
  problem_type: 'classification' | 'regression';
  results: ModelResult[];
  best_model: Algorithm;
  astra_verdict: AstraVerdict;
  created_at: string;
}

export interface ChatAction {
  type: ActionType;
  params: Record<string, unknown>;
  status: 'pending' | 'running' | 'done' | 'failed';
  result_summary?: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  action?: ChatAction;
  timestamp: string;
}

export type ActionType =
  | 'retrain'
  | 'explain_feature'
  | 'compare_models'
  | 'clean_data'
  | 'suggest_next'
  | 'generate_report'
  | 'what_if'
  | 'detect_leakage'
  | 'show_confusion_matrix';

export interface Experiment {
  id: string;
  name: string;
  dataset_filename: string;
  target_column: string;
  problem_type: 'classification' | 'regression';
  best_algorithm: Algorithm;
  best_metric: number;
  metric_name: string;
  created_at: string;
  session_id: string;
}

export interface ReportRequest {
  session_id: string;
  format: 'pdf';
  include_sections: string[];
}

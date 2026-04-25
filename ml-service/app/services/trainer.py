from __future__ import annotations

import json
import os
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Generator
from uuid import uuid4

import joblib
import numpy as np
import pandas as pd
import requests
from sklearn.base import BaseEstimator
from sklearn.compose import ColumnTransformer
from sklearn.ensemble import (
    GradientBoostingClassifier,
    GradientBoostingRegressor,
    RandomForestClassifier,
    RandomForestRegressor,
)
from sklearn.impute import SimpleImputer
from sklearn.inspection import permutation_importance
from sklearn.linear_model import LogisticRegression, Ridge
from sklearn.metrics import (
    accuracy_score,
    confusion_matrix,
    f1_score,
    mean_absolute_error,
    mean_squared_error,
    precision_score,
    r2_score,
    recall_score,
    roc_auc_score,
)
from sklearn.model_selection import KFold, StratifiedKFold, train_test_split
from sklearn.neighbors import KNeighborsClassifier, KNeighborsRegressor
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import LabelEncoder, OneHotEncoder, StandardScaler
from sklearn.tree import DecisionTreeClassifier, DecisionTreeRegressor

from app.models.schemas import (
    Algorithm,
    AstraVerdict,
    FeatureImportance,
    ModelResult,
    TrainingConfig,
    TrainingSession,
)
from app.utils.data_profiler import load_dataframe, load_profile
from app.utils.paths import model_cache_dir, upload_dir


def algorithm_name(algorithm: str) -> str:
    return algorithm.replace("_", " ").title()


class ModelTrainer:
    def dataset_path(self, dataset_id: str) -> Path:
        directory = upload_dir()
        candidates = [
            directory / f"{dataset_id}.csv",
            directory / f"{dataset_id}.xlsx",
            directory / f"{dataset_id}.xls",
        ]
        for candidate in candidates:
            if candidate.exists():
                return candidate
        matches = list(directory.glob(f"{dataset_id}*"))
        if matches:
            return matches[0]
        raise FileNotFoundError(f"Dataset {dataset_id} was not found")

    def build_model(self, algorithm: Algorithm, problem_type: str, mode: str) -> BaseEstimator:
        n_estimators = {"fast": 60, "balanced": 140, "thorough": 240}[mode]
        max_iter = {"fast": 400, "balanced": 800, "thorough": 1200}[mode]
        neighbors = {"fast": 5, "balanced": 7, "thorough": 11}[mode]

        if problem_type == "classification":
            models: dict[str, BaseEstimator] = {
                "logistic_regression": LogisticRegression(max_iter=max_iter, class_weight="balanced"),
                "random_forest": RandomForestClassifier(
                    n_estimators=n_estimators,
                    class_weight="balanced",
                    random_state=42,
                    n_jobs=1,
                ),
                "decision_tree": DecisionTreeClassifier(class_weight="balanced", random_state=42),
                "knn": KNeighborsClassifier(n_neighbors=neighbors),
                "gradient_boosting": GradientBoostingClassifier(random_state=42),
            }
        else:
            models = {
                "logistic_regression": Ridge(random_state=42),
                "random_forest": RandomForestRegressor(
                    n_estimators=n_estimators,
                    random_state=42,
                    n_jobs=1,
                ),
                "decision_tree": DecisionTreeRegressor(random_state=42),
                "knn": KNeighborsRegressor(n_neighbors=neighbors),
                "gradient_boosting": GradientBoostingRegressor(random_state=42),
            }
        return models[algorithm]

    def build_pipeline(self, x: pd.DataFrame, model: BaseEstimator) -> Pipeline:
        numeric_cols = x.select_dtypes(include=["number", "bool"]).columns.tolist()
        categorical_cols = [col for col in x.columns if col not in numeric_cols]

        numeric_pipeline = Pipeline(
            steps=[
                ("imputer", SimpleImputer(strategy="median")),
                ("scaler", StandardScaler()),
            ]
        )
        categorical_pipeline = Pipeline(
            steps=[
                ("imputer", SimpleImputer(strategy="most_frequent")),
                ("encoder", OneHotEncoder(handle_unknown="ignore", sparse_output=False)),
            ]
        )
        preprocessor = ColumnTransformer(
            transformers=[
                ("num", numeric_pipeline, numeric_cols),
                ("cat", categorical_pipeline, categorical_cols),
            ],
            remainder="drop",
            verbose_feature_names_out=True,
        )
        return Pipeline(steps=[("preprocessor", preprocessor), ("model", model)])

    def prepare_target(self, y: pd.Series, problem_type: str) -> tuple[pd.Series, LabelEncoder | None]:
        if problem_type == "classification":
            encoder = LabelEncoder()
            encoded = pd.Series(encoder.fit_transform(y.astype(str)), index=y.index)
            return encoded, encoder
        return pd.to_numeric(y, errors="coerce"), None

    def score_predictions(
        self,
        problem_type: str,
        y_true: pd.Series,
        y_pred: np.ndarray,
        y_prob: np.ndarray | None = None,
    ) -> dict[str, Any]:
        if problem_type == "classification":
            metrics: dict[str, Any] = {
                "accuracy": round(float(accuracy_score(y_true, y_pred)), 4),
                "f1_score": round(float(f1_score(y_true, y_pred, average="weighted", zero_division=0)), 4),
                "precision": round(float(precision_score(y_true, y_pred, average="weighted", zero_division=0)), 4),
                "recall": round(float(recall_score(y_true, y_pred, average="weighted", zero_division=0)), 4),
                "confusion_matrix": confusion_matrix(y_true, y_pred).astype(int).tolist(),
            }
            if y_prob is not None:
                try:
                    if y_prob.shape[1] == 2:
                        metrics["roc_auc"] = round(float(roc_auc_score(y_true, y_prob[:, 1])), 4)
                    else:
                        metrics["roc_auc"] = round(
                            float(roc_auc_score(y_true, y_prob, multi_class="ovr", average="weighted")),
                            4,
                        )
                except Exception:
                    metrics["roc_auc"] = None
            return metrics

        rmse = mean_squared_error(y_true, y_pred, squared=False)
        return {
            "rmse": round(float(rmse), 4),
            "mae": round(float(mean_absolute_error(y_true, y_pred)), 4),
            "r2_score": round(float(r2_score(y_true, y_pred)), 4),
        }

    def metric_for_progress(self, problem_type: str, y_true: pd.Series, y_pred: np.ndarray) -> float:
        if problem_type == "classification":
            return round(float(f1_score(y_true, y_pred, average="weighted", zero_division=0)), 4)
        return round(float(r2_score(y_true, y_pred)), 4)

    def feature_names(self, pipeline: Pipeline) -> list[str]:
        preprocessor = pipeline.named_steps["preprocessor"]
        names = preprocessor.get_feature_names_out()
        cleaned = []
        for name in names:
            if "__" in name:
                name = name.split("__", 1)[1]
            cleaned.append(name)
        return cleaned

    def feature_importance(
        self,
        pipeline: Pipeline,
        algorithm: Algorithm,
        problem_type: str,
        x_test: pd.DataFrame,
        y_test: pd.Series,
    ) -> list[FeatureImportance]:
        names = self.feature_names(pipeline)
        model = pipeline.named_steps["model"]
        raw_importance: np.ndarray | None = None

        if hasattr(model, "feature_importances_"):
            raw_importance = np.asarray(model.feature_importances_, dtype=float)
        elif hasattr(model, "coef_"):
            coef = np.asarray(model.coef_, dtype=float)
            raw_importance = np.mean(np.abs(coef), axis=0) if coef.ndim > 1 else np.abs(coef)
        else:
            try:
                scorer = "f1_weighted" if problem_type == "classification" else "r2"
                perm = permutation_importance(
                    pipeline,
                    x_test,
                    y_test,
                    scoring=scorer,
                    n_repeats=4,
                    random_state=42,
                    n_jobs=1,
                )
                source_cols = x_test.columns.tolist()
                return [
                    FeatureImportance(feature=feature, importance=round(float(score), 6))
                    for feature, score in sorted(
                        zip(source_cols, perm.importances_mean, strict=False),
                        key=lambda item: abs(float(item[1])),
                        reverse=True,
                    )[:15]
                ]
            except Exception:
                raw_importance = np.ones(len(names), dtype=float)

        if raw_importance is None or len(raw_importance) != len(names):
            raw_importance = np.resize(raw_importance if raw_importance is not None else np.ones(1), len(names))

        shap_values: dict[str, float] = {}
        if algorithm in {"random_forest", "decision_tree", "gradient_boosting"}:
            try:
                import shap

                transformed = pipeline.named_steps["preprocessor"].transform(x_test.head(120))
                explainer = shap.TreeExplainer(model)
                values = explainer.shap_values(transformed)
                if isinstance(values, list):
                    arr = np.mean([np.abs(v) for v in values], axis=0)
                else:
                    arr = np.abs(np.asarray(values))
                    if arr.ndim == 3:
                        arr = arr.mean(axis=2)
                means = arr.mean(axis=0)
                shap_values = {
                    feature: round(float(value), 6)
                    for feature, value in zip(names, means, strict=False)
                }
            except Exception:
                shap_values = {}

        total = float(np.sum(np.abs(raw_importance))) or 1.0
        ranked = sorted(
            zip(names, raw_importance, strict=False),
            key=lambda item: abs(float(item[1])),
            reverse=True,
        )[:15]
        return [
            FeatureImportance(
                feature=feature,
                importance=round(float(abs(value) / total), 6),
                shap_mean_abs=shap_values.get(feature),
            )
            for feature, value in ranked
        ]

    def generate_verdict(
        self,
        config: TrainingConfig,
        results: list[ModelResult],
        best_metric_name: str,
        profile_context: dict[str, Any],
    ) -> AstraVerdict:
        winner = max(
            results,
            key=lambda result: getattr(result, best_metric_name) or result.cv_mean or float("-inf"),
        )
        winner_metric = getattr(winner, best_metric_name) or winner.cv_mean or 0
        prompt = f"""
Given these model results:
{json.dumps([result.model_dump() for result in results], indent=2)}

Dataset context:
- {profile_context.get("row_count", "unknown")} rows, {profile_context.get("col_count", "unknown")} features
- Problem: {config.problem_type}
- Target: {config.target_column}
- Class balance: {profile_context.get("class_balance") or "N/A"}
- Leakage warnings: {profile_context.get("leakage_warnings") or []}

Write a verdict as a JSON object with these exact fields:
{{
  "winner": "<algorithm name>",
  "winner_reason": "<one sentence: why this model won, citing specific numbers>",
  "key_insight": "<one sentence: the most interesting thing about the data or results>",
  "recommendation": "<one sentence: the single most impactful next step>",
  "watch_out": "<one sentence warning, or null if none>"
}}

Rules:
- Cite actual numbers from the results
- Be specific
- The watch_out should reference leakage warnings if any exist
- Return only the JSON object, no markdown, no explanation
"""
        api_key = os.getenv("GROQ_API_KEY")
        if api_key and api_key != "your_groq_key_here":
            try:
                response = requests.post(
                    "https://api.groq.com/openai/v1/chat/completions",
                    headers={
                        "Authorization": f"Bearer {api_key}",
                        "Content-Type": "application/json",
                    },
                    json={
                        "model": "llama-3.3-70b-versatile",
                        "messages": [
                            {"role": "system", "content": "Return strict JSON only."},
                            {"role": "user", "content": prompt},
                        ],
                        "temperature": 0.1,
                    },
                    timeout=20,
                )
                response.raise_for_status()
                content = response.json()["choices"][0]["message"]["content"].strip()
                parsed = json.loads(content)
                return AstraVerdict.model_validate(parsed)
            except Exception:
                pass

        leakage = profile_context.get("leakage_warnings") or []
        watch_out = None
        if leakage:
            watch_out = f"Review leakage warning for {leakage[0].get('column', 'flagged feature')} before trusting deployment metrics."
        elif profile_context.get("row_count", 0) and profile_context["row_count"] < 500:
            watch_out = "The sample size is small, so validate on fresher holdout data before deployment."

        top_feature = "the top feature"
        if winner.feature_importance:
            top_feature = winner.feature_importance[0].feature

        return AstraVerdict(
            winner=winner.algorithm,
            winner_reason=(
                f"{algorithm_name(winner.algorithm)} won with {best_metric_name.replace('_', ' ')} "
                f"{float(winner_metric):.3f}, ahead of the other trained models."
            ),
            key_insight=f"{top_feature} carried the strongest signal in the winning model.",
            recommendation=f"Audit the top features, then rerun training without any flagged leakage columns.",
            watch_out=watch_out,
        )

    def metadata_for_what_if(self, x: pd.DataFrame) -> dict[str, Any]:
        metadata: dict[str, Any] = {"defaults": {}, "numeric_ranges": {}, "categories": {}}
        for col in x.columns:
            if pd.api.types.is_numeric_dtype(x[col]) or pd.api.types.is_bool_dtype(x[col]):
                numeric = pd.to_numeric(x[col], errors="coerce")
                metadata["defaults"][col] = float(numeric.median()) if numeric.notna().any() else 0
                metadata["numeric_ranges"][col] = {
                    "min": float(numeric.min()) if numeric.notna().any() else 0,
                    "max": float(numeric.max()) if numeric.notna().any() else 0,
                }
            else:
                values = x[col].dropna().astype(str).unique().tolist()
                metadata["defaults"][col] = values[0] if values else ""
                metadata["categories"][col] = values[:100]
        return metadata

    def train_stream(self, config: TrainingConfig) -> Generator[str, None, None]:
        path = self.dataset_path(config.dataset_id)
        df = load_dataframe(path)
        if config.target_column not in df.columns:
            raise ValueError(f"Target column {config.target_column} is not present")

        df = df.dropna(subset=[config.target_column]).copy()
        x = df.drop(columns=[config.target_column])
        y_raw = df[config.target_column]
        y, label_encoder = self.prepare_target(y_raw, config.problem_type)
        valid = y.notna()
        x = x.loc[valid]
        y = y.loc[valid]

        session_id = str(uuid4())
        profile = load_profile(config.dataset_id)
        profile_context = profile.model_dump() if profile else {
            "row_count": len(df),
            "col_count": len(df.columns),
            "class_balance": None,
            "leakage_warnings": [],
        }

        yield json.dumps(
            {
                "type": "start",
                "progress_pct": 0,
                "message": f"Starting training session {session_id} with {len(config.algorithms)} models.",
            }
        ) + "\n"

        results: list[ModelResult] = []
        model_artifacts: dict[str, Pipeline] = {}
        splitter: KFold | StratifiedKFold
        if config.problem_type == "classification":
            splitter = StratifiedKFold(
                n_splits=config.cross_validation_folds,
                shuffle=True,
                random_state=42,
            )
            split_iter = splitter.split(x, y)
        else:
            splitter = KFold(n_splits=config.cross_validation_folds, shuffle=True, random_state=42)
            split_iter = splitter.split(x)

        folds = list(split_iter)
        best_metric_name = "f1_score" if config.problem_type == "classification" else "r2_score"

        for model_index, algorithm in enumerate(config.algorithms):
            started = time.perf_counter()
            yield json.dumps(
                {
                    "type": "start",
                    "algorithm": algorithm,
                    "progress_pct": round(model_index / len(config.algorithms) * 100, 2),
                    "message": f"Starting {algorithm_name(algorithm)} ({config.mode} mode).",
                }
            ) + "\n"

            fold_scores: list[float] = []
            for fold_index, (train_idx, val_idx) in enumerate(folds, start=1):
                pipeline = self.build_pipeline(
                    x,
                    self.build_model(algorithm, config.problem_type, config.mode),
                )
                pipeline.fit(x.iloc[train_idx], y.iloc[train_idx])
                preds = pipeline.predict(x.iloc[val_idx])
                score = self.metric_for_progress(config.problem_type, y.iloc[val_idx], preds)
                fold_scores.append(score)
                overall = ((model_index + (fold_index / len(folds)) * 0.82) / len(config.algorithms)) * 100
                yield json.dumps(
                    {
                        "type": "epoch",
                        "algorithm": algorithm,
                        "progress_pct": round(overall, 2),
                        "current_metric": score,
                        "message": (
                            f"Cross-validation fold {fold_index}/{len(folds)}: "
                            f"{best_metric_name.replace('_', ' ')} = {score:.3f}"
                        ),
                    }
                ) + "\n"

            stratify = y if config.problem_type == "classification" and y.nunique() > 1 else None
            x_train, x_test, y_train, y_test = train_test_split(
                x,
                y,
                test_size=config.test_size,
                random_state=42,
                stratify=stratify,
            )
            final_pipeline = self.build_pipeline(
                x,
                self.build_model(algorithm, config.problem_type, config.mode),
            )
            final_pipeline.fit(x_train, y_train)
            preds = final_pipeline.predict(x_test)
            probs = final_pipeline.predict_proba(x_test) if hasattr(final_pipeline, "predict_proba") else None
            metrics = self.score_predictions(config.problem_type, y_test, preds, probs)
            importances = self.feature_importance(final_pipeline, algorithm, config.problem_type, x_test, y_test)
            elapsed_ms = int((time.perf_counter() - started) * 1000)
            result = ModelResult(
                algorithm=algorithm,
                training_time_ms=elapsed_ms,
                cv_mean=round(float(np.mean(fold_scores)), 4),
                cv_std=round(float(np.std(fold_scores)), 4),
                feature_importance=importances,
                **metrics,
            )
            results.append(result)
            model_artifacts[algorithm] = final_pipeline
            progress = round(((model_index + 1) / len(config.algorithms)) * 100, 2)
            yield json.dumps(
                {
                    "type": "model_done",
                    "algorithm": algorithm,
                    "progress_pct": progress,
                    "current_metric": getattr(result, best_metric_name),
                    "message": f"{algorithm_name(algorithm)} finished in {elapsed_ms} ms.",
                }
            ) + "\n"

        best = max(results, key=lambda result: getattr(result, best_metric_name) or result.cv_mean or -999999)
        verdict = self.generate_verdict(config, results, best_metric_name, profile_context)
        session = TrainingSession(
            session_id=session_id,
            dataset_id=config.dataset_id,
            target_column=config.target_column,
            problem_type=config.problem_type,
            results=results,
            best_model=best.algorithm,
            astra_verdict=verdict,
            created_at=datetime.now(timezone.utc).isoformat(),
        )

        session_dir = model_cache_dir() / "sessions"
        session_dir.mkdir(parents=True, exist_ok=True)
        joblib.dump(
            {
                "session": session.model_dump(),
                "models": model_artifacts,
                "best_model": best.algorithm,
                "label_encoder": label_encoder,
                "feature_metadata": self.metadata_for_what_if(x),
                "feature_columns": x.columns.tolist(),
            },
            session_dir / f"{session_id}.joblib",
        )
        (session_dir / f"{session_id}.json").write_text(session.model_dump_json(indent=2), encoding="utf-8")

        yield json.dumps(
            {
                "type": "all_done",
                "progress_pct": 100,
                "message": f"Training complete. {algorithm_name(best.algorithm)} is the current winner.",
                "session": session.model_dump(),
            }
        ) + "\n"

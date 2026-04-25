from __future__ import annotations

from pathlib import Path
from typing import Any

import joblib
import numpy as np
import pandas as pd

from app.models.schemas import ShapRequest, WhatIfRequest, WhatIfResponse
from app.utils.paths import model_cache_dir


class ModelExplainer:
    def session_path(self, session_id: str) -> Path:
        path = model_cache_dir() / "sessions" / f"{session_id}.joblib"
        if not path.exists():
            raise FileNotFoundError(f"Training session {session_id} was not found")
        return path

    def load_artifact(self, session_id: str) -> dict[str, Any]:
        return joblib.load(self.session_path(session_id))

    def what_if(self, request: WhatIfRequest) -> WhatIfResponse:
        artifact = self.load_artifact(request.session_id)
        best_model_name = artifact["best_model"]
        pipeline = artifact["models"][best_model_name]
        metadata = artifact["feature_metadata"]
        values = dict(metadata["defaults"])
        values.update(request.feature_values)

        warnings: list[str] = []
        for feature, bounds in metadata["numeric_ranges"].items():
            if feature not in values:
                continue
            try:
                numeric = float(values[feature])
                if numeric < bounds["min"] or numeric > bounds["max"]:
                    warnings.append(
                        f"{feature} is outside the training distribution "
                        f"({bounds['min']:.3f} to {bounds['max']:.3f})."
                    )
            except (TypeError, ValueError):
                continue

        row = pd.DataFrame([values], columns=artifact["feature_columns"])
        prediction_raw = pipeline.predict(row)[0]
        label_encoder = artifact.get("label_encoder")
        if label_encoder is not None:
            prediction = str(label_encoder.inverse_transform([int(prediction_raw)])[0])
        else:
            prediction = round(float(prediction_raw), 4)

        probabilities: list[dict[str, str | float]] = []
        confidence = None
        if hasattr(pipeline, "predict_proba"):
            probs = pipeline.predict_proba(row)[0]
            labels = (
                label_encoder.inverse_transform(list(range(len(probs))))
                if label_encoder is not None
                else list(range(len(probs)))
            )
            probabilities = [
                {"label": str(label), "probability": round(float(prob), 4)}
                for label, prob in zip(labels, probs, strict=False)
            ]
            confidence = round(float(np.max(probs)), 4)

        session = artifact["session"]
        winner = next(
            result for result in session["results"] if result["algorithm"] == best_model_name
        )
        contributions = [
            {
                "feature": item["feature"],
                "contribution": round(float(item["importance"]), 4),
            }
            for item in winner.get("feature_importance", [])[:8]
        ]

        return WhatIfResponse(
            prediction=prediction,
            confidence=confidence,
            probabilities=probabilities,
            contributions=contributions,
            warnings=warnings,
        )

    def shap_values(self, request: ShapRequest) -> dict[str, Any]:
        artifact = self.load_artifact(request.session_id)
        session = artifact["session"]
        result = next(
            (item for item in session["results"] if item["algorithm"] == request.algorithm),
            None,
        )
        if result is None:
            raise ValueError(f"Algorithm {request.algorithm} is not part of this session")
        return {
            "session_id": request.session_id,
            "algorithm": request.algorithm,
            "row_index": request.row_index,
            "feature_importance": result.get("feature_importance", []),
        }

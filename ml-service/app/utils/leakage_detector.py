from __future__ import annotations

import pandas as pd

from app.models.schemas import LeakageWarning


class LeakageDetector:
    LEAKAGE_THRESHOLD = 0.90
    WARNING_THRESHOLD = 0.70

    def check(self, df: pd.DataFrame, target_col: str) -> list[LeakageWarning]:
        warnings: list[LeakageWarning] = []
        if target_col not in df.columns:
            return warnings

        target = df[target_col]
        if not pd.api.types.is_numeric_dtype(target):
            target = pd.Series(pd.factorize(target.astype(str))[0], index=target.index)

        numeric_cols = df.select_dtypes(include="number").columns.tolist()
        if target_col in numeric_cols:
            numeric_cols.remove(target_col)

        for col in numeric_cols:
            try:
                correlation = abs(df[col].corr(target))
                if pd.isna(correlation):
                    continue
                if correlation >= self.LEAKAGE_THRESHOLD:
                    warnings.append(
                        LeakageWarning(
                            column=col,
                            correlation_with_target=round(float(correlation), 3),
                            warning=(
                                f"'{col}' has {correlation:.0%} correlation with target \u2014 "
                                "this is almost certainly a data leak. Remove before training."
                            ),
                        )
                    )
                elif correlation >= self.WARNING_THRESHOLD:
                    warnings.append(
                        LeakageWarning(
                            column=col,
                            correlation_with_target=round(float(correlation), 3),
                            warning=(
                                f"'{col}' has high correlation ({correlation:.0%}) with target \u2014 "
                                "verify this is a legitimate feature, not future data."
                            ),
                        )
                    )
            except Exception:
                continue

        for col in df.select_dtypes(include="number").columns:
            if col == target_col or len(df) == 0:
                continue
            if df[col].nunique(dropna=True) / len(df) > 0.95:
                warnings.append(
                    LeakageWarning(
                        column=col,
                        correlation_with_target=0.0,
                        warning=(
                            f"'{col}' appears to be an ID column ({df[col].nunique(dropna=True)} unique values). "
                            "ID columns should not be used as features."
                        ),
                    )
                )

        return warnings

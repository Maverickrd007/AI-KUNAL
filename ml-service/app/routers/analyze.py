from __future__ import annotations

import shutil
from pathlib import Path

from fastapi import APIRouter, File, Form, HTTPException, UploadFile

from app.models.schemas import DatasetProfile
from app.utils.data_profiler import DataProfiler, load_dataframe
from app.utils.paths import ensure_runtime_dirs, upload_dir

router = APIRouter()


@router.post("/analyze", response_model=DatasetProfile)
async def analyze_dataset(
    dataset_id: str = Form(...),
    file: UploadFile = File(...),
) -> DatasetProfile:
    ensure_runtime_dirs()
    original_name = file.filename or f"{dataset_id}.csv"
    suffix = Path(original_name).suffix.lower()
    if suffix not in {".csv", ".xlsx", ".xls"}:
        raise HTTPException(status_code=400, detail="Upload a CSV or XLSX dataset.")

    saved_path = upload_dir() / f"{dataset_id}{suffix}"
    with saved_path.open("wb") as output:
        shutil.copyfileobj(file.file, output)

    try:
        df = load_dataframe(saved_path)
        if df.empty:
            raise HTTPException(status_code=400, detail="The dataset has no rows.")
        if len(df.columns) < 2:
            raise HTTPException(status_code=400, detail="The dataset needs at least two columns.")
        if suffix != ".csv":
            csv_path = upload_dir() / f"{dataset_id}.csv"
            df.to_csv(csv_path, index=False)
        return DataProfiler().profile(df, dataset_id, original_name)
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Could not analyze dataset: {exc}") from exc

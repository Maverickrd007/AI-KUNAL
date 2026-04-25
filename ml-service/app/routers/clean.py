from __future__ import annotations

from fastapi import APIRouter, HTTPException

from app.models.schemas import CleaningRequest, CleaningResult
from app.services.cleaner import DataCleaner

router = APIRouter()


@router.post("/clean", response_model=CleaningResult)
async def clean_dataset(request: CleaningRequest) -> CleaningResult:
    try:
        return DataCleaner().clean(request.dataset_id, request.config)
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Cleaning failed: {exc}") from exc

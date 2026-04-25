from __future__ import annotations

import json

from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse

from app.models.schemas import TrainingConfig
from app.services.trainer import ModelTrainer

router = APIRouter()


def stream_training(config: TrainingConfig):
    try:
        yield from ModelTrainer().train_stream(config)
    except Exception as exc:
        yield json.dumps({"type": "error", "message": str(exc), "progress_pct": 100}) + "\n"


@router.post("/train")
async def train_models(config: TrainingConfig) -> StreamingResponse:
    if not config.algorithms:
        raise HTTPException(status_code=400, detail="Select at least one algorithm.")
    return StreamingResponse(stream_training(config), media_type="application/x-ndjson")

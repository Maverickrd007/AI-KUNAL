from __future__ import annotations

from fastapi import APIRouter, HTTPException

from app.models.schemas import ShapRequest, WhatIfRequest, WhatIfResponse
from app.services.explainer import ModelExplainer

router = APIRouter(prefix="/explain")


@router.post("/whatif", response_model=WhatIfResponse)
async def what_if(request: WhatIfRequest) -> WhatIfResponse:
    try:
        return ModelExplainer().what_if(request)
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"What-if simulation failed: {exc}") from exc


@router.post("/shap")
async def shap_values(request: ShapRequest):
    try:
        return ModelExplainer().shap_values(request)
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"SHAP explanation failed: {exc}") from exc

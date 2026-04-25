from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers import analyze, clean, explain, train
from app.utils.paths import ensure_runtime_dirs

ensure_runtime_dirs()

app = FastAPI(title="AstraML ML Service", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(analyze.router)
app.include_router(clean.router)
app.include_router(train.router)
app.include_router(explain.router)


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}

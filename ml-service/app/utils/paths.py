from __future__ import annotations

import os
from pathlib import Path


def project_root() -> Path:
    return Path(__file__).resolve().parents[3]


def upload_dir() -> Path:
    configured = os.getenv("UPLOAD_DIR")
    if configured:
        path = Path(configured)
        return path if path.is_absolute() else (Path.cwd() / path).resolve()

    docker_path = Path("/app/uploads")
    if docker_path.exists():
        return docker_path

    return project_root() / "backend" / "uploads"


def model_cache_dir() -> Path:
    configured = os.getenv("MODEL_CACHE_DIR", "./model_cache")
    path = Path(configured)
    return path if path.is_absolute() else (Path.cwd() / path).resolve()


def ensure_runtime_dirs() -> None:
    upload_dir().mkdir(parents=True, exist_ok=True)
    (model_cache_dir() / "sessions").mkdir(parents=True, exist_ok=True)
    (model_cache_dir() / "profiles").mkdir(parents=True, exist_ok=True)

from __future__ import annotations

import os
import secrets
from pathlib import Path

from fastapi import HTTPException, UploadFile, status

from app.core.config import settings

ALLOWED_TYPES = {"image/jpeg", "image/png", "image/webp", "image/gif"}


def _upload_root() -> Path:
    root = Path(settings.upload_dir)
    root.mkdir(parents=True, exist_ok=True)
    return root


async def save_upload(file: UploadFile, subdir: str = "complaints") -> dict:
    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported file type: {file.content_type}",
        )
    data = await file.read()
    max_bytes = settings.max_upload_mb * 1024 * 1024
    if len(data) > max_bytes:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File exceeds {settings.max_upload_mb} MB limit",
        )
    ext = os.path.splitext(file.filename or "")[1][:10] or ".bin"
    name = f"{secrets.token_hex(8)}{ext}"
    target_dir = _upload_root() / subdir
    target_dir.mkdir(parents=True, exist_ok=True)
    path = target_dir / name
    path.write_bytes(data)
    return {
        "file_url": f"/uploads/{subdir}/{name}",
        "file_name": file.filename or name,
        "content_type": file.content_type,
        "size_bytes": len(data),
    }

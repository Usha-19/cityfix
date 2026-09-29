"""Thin wrapper around the official hindsight-client.

Only the supported SDK surface is used: create_bank, retain, recall, reflect.
See https://docs.hindsight.vectorize.io/python-sdk/
"""
from __future__ import annotations

import logging
from typing import Any, Optional

from app.core.config import settings

logger = logging.getLogger("cityfix.memory")

_client: Any = None
_bank_ready: bool = False


def _import_hindsight():
    try:
        from hindsight_client import Hindsight  # type: ignore

        return Hindsight
    except Exception as exc:  # pragma: no cover - import guard
        logger.warning("hindsight-client not importable: %s", exc)
        return None


def get_client() -> Optional[Any]:
    """Return a shared Hindsight client, or None if not configured/available."""
    global _client
    if not settings.hindsight_enabled:
        return None
    if _client is not None:
        return _client
    Hindsight = _import_hindsight()
    if Hindsight is None:
        return None
    try:
        _client = Hindsight(
            base_url=settings.hindsight_base_url,
            api_key=settings.hindsight_api_key,
            timeout=settings.hindsight_timeout,
        )
    except Exception as exc:
        logger.error("Failed to construct Hindsight client: %s", exc)
        _client = None
    return _client


def ensure_bank() -> bool:
    """Ensure the CityFix memory bank exists. Idempotent + tolerant."""
    global _bank_ready
    if _bank_ready:
        return True
    client = get_client()
    if client is None:
        return False
    try:
        client.create_bank(
            bank_id=settings.hindsight_memory_bank,
            name="CityFix Civic Memory",
            background=(
                "Municipal civic-issue memory. Stores complaints, officer actions, "
                "repairs, and their real outcomes so recurring problems can be "
                "detected with historical context. Be skeptical of assuming an issue "
                "is permanently resolved without confirming evidence."
            ),
            disposition={"skepticism": 4, "literalism": 3, "empathy": 2},
        )
    except Exception as exc:
        # Bank likely already exists (idempotent create). Treat as ready.
        logger.debug("create_bank returned (bank may already exist): %s", exc)
    _bank_ready = True
    return True


def health_check() -> tuple[bool, Optional[str]]:
    """Best-effort connectivity probe."""
    client = get_client()
    if client is None:
        return False, "Hindsight not configured"
    try:
        ensure_bank()
        # A cheap recall acts as a ping; empty results are fine.
        client.recall(bank_id=settings.hindsight_memory_bank, query="health check", budget="low")
        return True, None
    except Exception as exc:
        return False, str(exc)

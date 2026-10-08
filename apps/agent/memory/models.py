# File: apps/agent/memory/models.py
from __future__ import annotations
from dataclasses import dataclass, field
from datetime import datetime, timezone
import uuid

import numpy as np


def _now() -> datetime:
    return datetime.now(timezone.utc)


@dataclass
class Memory:
    user_id: str
    kind: str                      # "semantic" | "episodic" | "procedural"
    content: str
    embedding: np.ndarray
    importance: float = 0.5
    confidence: float = 0.8
    source: str | None = None
    id: str = field(default_factory=lambda: str(uuid.uuid4()))
    created_at: datetime = field(default_factory=_now)
    updated_at: datetime = field(default_factory=_now)
    last_accessed: datetime | None = None
    access_count: int = 0
    archived: bool = False
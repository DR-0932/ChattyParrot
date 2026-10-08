from __future__ import annotations
import math
from dataclasses import dataclass

import numpy as np

from .models import Memory, _now
from .store import MemoryStore
from apps.agent.rag.ingestion.embedding import Embedder

@dataclass
class RankingConfig:
    w_similarity: float = 0.6
    w_recency: float = 0.2
    w_importance: float = 0.2
    recency_half_life_days: float = 30.0
    min_similarity: float = 0.25   
    candidates: int = 20           

class MemoryService:
    def __init__(self, embedder: Embedder, store: MemoryStore,ranking: RankingConfig | None = None):
        self.embedder = embedder
        self.store = store
        self.cfg = ranking or RankingConfig()

    def _embed_one(self, text: str) -> np.ndarray:
        return np.asarray(self.embedder.embed([text])[0], dtype=np.float32)

    def remember(self, user_id: str, content: str, kind: str = "semantic",importance: float = 0.5, source: str | None = None) -> Memory:
        m = Memory(user_id=user_id, 
                   kind=kind, 
                   content=content,
                   embedding=self._embed_one(content),
                   importance=importance, 
                   source=source)
        return self.store.add(m)

    def _recency(self, m: Memory) -> float:
        # Based on the last time the memory was created, updated, or used
        ref = max(t for t in (m.updated_at, m.last_accessed) if t)
        age_days = (_now() - ref).total_seconds() / 86400
        return math.exp(-math.log(2) * age_days / self.cfg.recency_half_life_days)

    def retrieve(self, user_id: str, query: str, k: int = 5,
                 kinds: list[str] | None = None) -> list[tuple[Memory, float]]:
        cfg = self.cfg
        hits = self.store.search(user_id, self._embed_one(query),
                                 limit=cfg.candidates, kinds=kinds)
        ranked = []
        for m, sim in hits:
            if sim < cfg.min_similarity:
                continue
            score = (cfg.w_similarity * sim
                     + cfg.w_recency * self._recency(m)
                     + cfg.w_importance * m.importance)
            ranked.append((m, score))
        ranked.sort(key=lambda x: x[1], reverse=True)
        top = ranked[:k]
        for m, _ in top:
            self.store.touch(m.id)
        return top

    @staticmethod
    def format_for_prompt(results: list[tuple[Memory, float]]) -> str:
        if not results:
            return ""
        lines = [f"- {m.content}" for m, _ in results]
        return "Known about this user:\n" + "\n".join(lines)
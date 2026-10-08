import numpy as np
from .models import Memory, _now


class MemoryStore:
    def __init__(self):
        self._items: dict[str, Memory] = {}

    def add(self, m: Memory) -> Memory:
        self._items[m.id] = m
        return m

    def search(self, user_id, embedding, limit=20, kinds=None):   # updated
        q = np.asarray(embedding, dtype=np.float32)
        scored = []
        for m in self._items.values():
            if m.user_id != user_id or m.archived:
                continue
            if kinds and m.kind not in kinds:
                continue
            scored.append((m, float(q @ m.embedding)))
        scored.sort(key=lambda x: x[1], reverse=True)
        return scored[:limit]

    def update(self, memory_id, **fields):
        m = self._items[memory_id]
        for k, v in fields.items():
            setattr(m, k, v)
        m.updated_at = _now()
        return m

    def delete(self, memory_id):
        self._items.pop(memory_id, None)

    def touch(self, memory_id):
        m = self._items[memory_id]
        m.last_accessed = _now()
        m.access_count += 1
"""Simple in-memory cache with TTL support"""
from datetime import datetime, timedelta
from typing import Any, Optional
from dataclasses import dataclass

@dataclass
class CacheEntry:
    data: Any
    expires_at: datetime

class Cache:
    def __init__(self, default_ttl_seconds: int = 3600):  # 1 hour default
        self.store: dict[str, CacheEntry] = {}
        self.default_ttl = default_ttl_seconds

    def get(self, key: str) -> Optional[Any]:
        """Get cached value if it exists and hasn't expired"""
        if key not in self.store:
            return None

        entry = self.store[key]
        if datetime.now() >= entry.expires_at:
            # Expired - remove it
            del self.store[key]
            return None

        return entry.data

    def set(self, key: str, value: Any, ttl_seconds: Optional[int] = None) -> None:
        """Set a cached value with optional custom TTL"""
        ttl = ttl_seconds if ttl_seconds is not None else self.default_ttl
        expires_at = datetime.now() + timedelta(seconds=ttl)
        self.store[key] = CacheEntry(data=value, expires_at=expires_at)

    def invalidate(self, key: str) -> None:
        """Remove a specific cache entry"""
        if key in self.store:
            del self.store[key]

    def clear(self) -> None:
        """Clear all cache entries"""
        self.store.clear()

    def get_stats(self) -> dict:
        """Get cache statistics"""
        now = datetime.now()
        valid_entries = sum(1 for entry in self.store.values() if entry.expires_at > now)
        return {
            "total_entries": len(self.store),
            "valid_entries": valid_entries,
            "expired_entries": len(self.store) - valid_entries
        }

# Global cache instance
cache = Cache(default_ttl_seconds=3600)  # 1 hour cache by default

import time
from typing import Any

_store: dict[str, tuple[Any, float]] = {}


def get(key: str, ttl: int) -> Any | None:
    if key in _store:
        value, ts = _store[key]
        if time.time() - ts < ttl:
            return value
        del _store[key]
    return None


def set(key: str, value: Any) -> None:
    _store[key] = (value, time.time())

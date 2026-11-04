"""
Caché en memoria con soporte de TTL para endpoints FastAPI.

Proporciona un decorador que cachea respuestas de endpoints
en un diccionario en proceso, con expiración configurable.

Uso:
    from cache import cache_response, invalidate_cache, cached

    @router.get("/products")
    @cached(ttl_seconds=30)
    def list_products(...):
        ...

    # Invalidar cuando hay escrituras
    invalidate_cache("list_products")
"""

from __future__ import annotations

import logging
import time
from collections import OrderedDict
from functools import wraps
from typing import Any, Callable

logger = logging.getLogger("api.cache")

# ──────────────────────────────────────────────
# Almacén global de caché
# ──────────────────────────────────────────────
# { cache_key: (expires_at, value) }
_cache_store: dict[str, tuple[float, Any]] = {}
_cache_prefixes: dict[str, str] = {}  # prefix -> cache_key mapping


def _now() -> float:
    return time.monotonic()


def get_cached(cache_key: str) -> Any | None:
    """Retorna el valor cacheado si existe y no ha expirado."""
    entry = _cache_store.get(cache_key)
    if entry is None:
        return None
    expires_at, value = entry
    if _now() > expires_at:
        del _cache_store[cache_key]
        return None
    return value


def set_cached(cache_key: str, value: Any, ttl_seconds: int) -> None:
    """Almacena un valor en caché con expiración TTL."""
    expires_at = _now() + ttl_seconds
    _cache_store[cache_key] = (expires_at, value)


def invalidate_cache(prefix: str) -> int:
    """Invalida todas las entradas de caché cuya clave empiece por `prefix`.

    Retorna la cantidad de entradas invalidadas.
    Útil para limpiar la caché cuando los datos subyacentes cambian.
    """
    keys_to_delete = [k for k in _cache_store if k.startswith(prefix)]
    for k in keys_to_delete:
        del _cache_store[k]
    count = len(keys_to_delete)
    if count:
        logger.info("Caché invalidada para prefix '%s': %d entradas eliminadas", prefix, count)
    return count


def clear_all_cache() -> int:
    """Limpia toda la caché. Retorna la cantidad de entradas eliminadas."""
    global _cache_store
    count = len(_cache_store)
    _cache_store.clear()
    if count:
        logger.info("Caché global limpiada: %d entradas eliminadas", count)
    return count


def build_cache_key(prefix: str, *args, **kwargs) -> str:
    """Construye una clave de caché a partir de un prefijo y argumentos.

    Incluye solo kwargs con valores no-None para evitar claves
    distintas cuando un parámetro opcional no se envía.
    """
    parts = [prefix]
    for arg in args:
        parts.append(str(arg))
    for key in sorted(kwargs.keys()):
        value = kwargs[key]
        if value is not None:
            parts.append(f"{key}={value}")
    return ":".join(parts)


# ════════════════════════════════════════════
# Decorador @cached
# ════════════════════════════════════════════

def cached(ttl_seconds: int = 60, prefix: str | None = None):
    """Decorador para cachear la respuesta de un endpoint.

    La clave de caché se construye automáticamente a partir del prefijo
    (o el nombre de la función) y los argumentos de la llamada.

    Args:
        ttl_seconds: Tiempo de vida de la caché en segundos.
        prefix: Prefijo para la clave de caché. Si es None, se usa
                el nombre de la función.
    """
    def decorator(func: Callable) -> Callable:
        @wraps(func)
        def wrapper(*args, **kwargs):
            nonlocal prefix
            if prefix is None:
                prefix = func.__name__

            # Construir clave de caché con los parámetros de la función
            cache_key = build_cache_key(prefix, *args, **kwargs)

            # Intentar obtener de caché
            cached_value = get_cached(cache_key)
            if cached_value is not None:
                logger.debug("Cache HIT: %s", cache_key)
                return cached_value

            # Ejecutar la función
            logger.debug("Cache MISS: %s", cache_key)
            result = func(*args, **kwargs)

            # Almacenar en caché
            set_cached(cache_key, result, ttl_seconds)
            return result
        return wrapper
    return decorator
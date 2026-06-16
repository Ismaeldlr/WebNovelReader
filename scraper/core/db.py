from contextlib import contextmanager
from typing import Any, Iterator

import psycopg2
from psycopg2.extras import RealDictCursor
from psycopg2.pool import ThreadedConnectionPool

from config import settings


_pool: ThreadedConnectionPool | None = None


def init_pool(minconn: int = 1, maxconn: int = 5) -> None:
    global _pool
    if _pool is None:
        _pool = ThreadedConnectionPool(minconn, maxconn, dsn=settings.database_url)


def close_pool() -> None:
    global _pool
    if _pool is not None:
        _pool.closeall()
        _pool = None


def _get_pool() -> ThreadedConnectionPool:
    if _pool is None:
        init_pool()
    if _pool is None:
        raise RuntimeError("Database pool was not initialized.")
    return _pool


def query(sql: str, params: tuple[Any, ...] | list[Any] | None = None) -> list[dict[str, Any]]:
    pool = _get_pool()
    conn = pool.getconn()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(sql, params or ())
            rows = [dict(row) for row in cur.fetchall()]
        conn.commit()
        return rows
    except Exception:
        conn.rollback()
        raise
    finally:
        pool.putconn(conn)


def execute(sql: str, params: tuple[Any, ...] | list[Any] | None = None) -> int:
    pool = _get_pool()
    conn = pool.getconn()
    try:
        with conn.cursor() as cur:
            cur.execute(sql, params or ())
            rowcount = cur.rowcount
        conn.commit()
        return rowcount
    except Exception:
        conn.rollback()
        raise
    finally:
        pool.putconn(conn)


@contextmanager
def transaction() -> Iterator[Any]:
    pool = _get_pool()
    conn = pool.getconn()
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        pool.putconn(conn)

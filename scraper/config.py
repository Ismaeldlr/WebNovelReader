import os
from dataclasses import dataclass
from pathlib import Path
from urllib.parse import quote_plus

from dotenv import load_dotenv


SCRAPER_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = SCRAPER_DIR.parent
SERVER_DIR = PROJECT_ROOT / "server"

load_dotenv(PROJECT_ROOT / ".env")
load_dotenv(SERVER_DIR / ".env", override=True)
load_dotenv(SCRAPER_DIR / ".env", override=True)


def _bool_env(name: str, default: bool) -> bool:
    value = os.getenv(name)
    if value is None:
        return default
    return value.strip().lower() in {"1", "true", "yes", "on"}


def _int_env(name: str, default: int) -> int:
    value = os.getenv(name)
    if value is None:
        return default
    try:
        return int(value)
    except ValueError:
        return default


def _float_env(name: str, default: float) -> float:
    value = os.getenv(name)
    if value is None:
        return default
    try:
        return float(value)
    except ValueError:
        return default


def _database_url() -> str:
    scraper_explicit = os.getenv("SCRAPER_DATABASE_URL")
    if scraper_explicit:
        return scraper_explicit

    host = os.getenv("DB_HOST", "localhost")
    port = os.getenv("DB_PORT", "5432")
    database = os.getenv("DB_NAME", "webnovel_hub")
    user = os.getenv("DB_USER", "postgres")
    password = quote_plus(os.getenv("DB_PASSWORD", ""))
    if any(os.getenv(name) for name in ("DB_HOST", "DB_PORT", "DB_NAME", "DB_USER", "DB_PASSWORD")):
        return f"postgresql://{quote_plus(user)}:{password}@{host}:{port}/{database}"

    explicit = os.getenv("DATABASE_URL")
    if explicit:
        return explicit

    return f"postgresql://{quote_plus(user)}:{password}@{host}:{port}/{database}"


@dataclass(frozen=True)
class Settings:
    database_url: str
    scraper_poll_interval: float
    request_delay: float
    headless: bool
    covers_dir: Path
    max_retries: int


settings = Settings(
    database_url=_database_url(),
    scraper_poll_interval=_float_env("SCRAPER_POLL_INTERVAL", 5.0),
    request_delay=_float_env("REQUEST_DELAY", 2.0),
    headless=_bool_env("HEADLESS", True),
    covers_dir=Path(os.getenv("COVERS_DIR", PROJECT_ROOT / "server" / "public" / "covers")).resolve(),
    max_retries=_int_env("MAX_RETRIES", 3),
)

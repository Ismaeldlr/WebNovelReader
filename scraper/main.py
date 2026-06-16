import logging
import time
from dataclasses import replace
from typing import Any

from playwright.sync_api import Error as PlaywrightError, TimeoutError as PlaywrightTimeoutError

from config import settings
from core import db, job_queue
from core.browser import BrowserManager
from core.models import (
    DuplicateNovelError,
    RateLimitedError,
    StructureChangedError,
    UnknownSourceError,
)
from core.utils import detect_source_site
from dispatcher import get_scraper


logging.basicConfig(
    level=logging.INFO,
    format="[%(asctime)s] %(levelname)s %(message)s",
)
logger = logging.getLogger("scraper")

INITIAL_CHAPTER_PREFETCH_COUNT = 3
INITIAL_CHAPTER_PREFETCH_SPACING = 6.0


def _payload(job: dict[str, Any]) -> dict[str, Any]:
    payload = job.get("payload") or {}
    if isinstance(payload, dict):
        return payload
    return {}


def _categorize_error(exc: Exception) -> tuple[str, bool]:
    if isinstance(exc, StructureChangedError):
        return "structure_changed", False
    if isinstance(exc, RateLimitedError):
        return "rate_limited", True
    if isinstance(exc, DuplicateNovelError):
        return "unknown", False
    if isinstance(exc, UnknownSourceError):
        return "unknown", False
    if isinstance(exc, (PlaywrightTimeoutError, PlaywrightError, TimeoutError, ConnectionError)):
        return "network_error", True
    return "unknown", True


def prefetch_initial_chapters(scraper, chapters):
    enriched = list(chapters)
    last_started_at: float | None = None

    for index, chapter in enumerate(enriched[:INITIAL_CHAPTER_PREFETCH_COUNT]):
        if last_started_at is not None:
            elapsed = time.monotonic() - last_started_at
            if elapsed < INITIAL_CHAPTER_PREFETCH_SPACING:
                time.sleep(INITIAL_CHAPTER_PREFETCH_SPACING - elapsed)

        logger.info("Prefetching initial chapter %s: %s", chapter.chapter_number, chapter.source_url)
        last_started_at = time.monotonic()
        content = scraper.scrape_chapter_content(chapter.source_url)
        enriched[index] = replace(chapter, content=content)

    return enriched


def process_job(browser: BrowserManager, job: dict[str, Any]) -> None:
    job_type = str(job.get("type") or "")
    if job_type == "chapter_fetch":
        process_chapter_fetch(browser, job)
        return
    if job_type != "novel_ingestion":
        raise UnknownSourceError(f"Unsupported job type: {job_type}")

    payload = _payload(job)
    url = str(payload.get("url") or "").strip()
    if not url:
        raise UnknownSourceError("Job payload is missing a URL.")

    source_site = str(payload.get("source_site") or "").strip() or detect_source_site(url)
    user_id = job.get("triggered_by")
    if not user_id:
        raise UnknownSourceError("Job is missing the user who triggered it.")

    logger.info("Scraping %s job %s: %s", source_site, job["id"], url)
    with browser.new_page() as page:
        scraper = get_scraper(source_site, page, settings)
        novel = scraper.scrape_novel(url)
        chapters = scraper.scrape_chapter_list(url)
        chapters = prefetch_initial_chapters(scraper, chapters)
        novel_id = job_queue.ingest_novel(novel, chapters, str(job["id"]), str(user_id))
        job_queue.mark_complete(str(job["id"]), novel_id, len(chapters))
        logger.info("Completed job %s: novel=%s chapters=%s", job["id"], novel_id, len(chapters))


def process_chapter_fetch(browser: BrowserManager, job: dict[str, Any]) -> None:
    payload = _payload(job)
    url = str(payload.get("url") or payload.get("chapter_url") or "").strip()
    if not url:
        raise UnknownSourceError("Chapter fetch job payload is missing a URL.")

    chapter_id = job.get("chapter_id") or payload.get("chapter_id")
    if not chapter_id:
        raise UnknownSourceError("Chapter fetch job is missing chapter_id.")

    source_site = str(payload.get("source_site") or "").strip() or detect_source_site(url)

    logger.info("Fetching %s chapter job %s: %s", source_site, job["id"], url)
    with browser.new_page() as page:
        scraper = get_scraper(source_site, page, settings)
        content = scraper.scrape_chapter_content(url)
        word_count = job_queue.store_chapter_content(str(chapter_id), content)
        job_queue.mark_chapter_complete(str(job["id"]), str(chapter_id), word_count)
        logger.info("Completed chapter job %s: chapter=%s words=%s", job["id"], chapter_id, word_count)


def main() -> None:
    browser = BrowserManager()
    db.init_pool()
    browser.start()
    logger.info("Scraper started. Polling every %.1fs", settings.scraper_poll_interval)

    try:
        while True:
            job = job_queue.claim_next_job()
            if job is None:
                time.sleep(settings.scraper_poll_interval)
                continue

            try:
                process_job(browser, job)
            except Exception as exc:
                error_type, retry = _categorize_error(exc)
                logger.exception("Job %s failed as %s", job["id"], error_type)
                job_queue.mark_failed(str(job["id"]), error_type, str(exc), retry)
                if job.get("type") == "chapter_fetch":
                    job_queue.mark_chapter_fetch_failed(str(job.get("chapter_id") or ""), error_type, str(exc))
                if isinstance(exc, RateLimitedError):
                    time.sleep(max(settings.scraper_poll_interval, settings.request_delay * 5))
            time.sleep(0.5)
    except KeyboardInterrupt:
        logger.info("Stopping scraper.")
    finally:
        browser.close()
        db.close_pool()


if __name__ == "__main__":
    main()

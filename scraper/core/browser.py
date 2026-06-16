import time
from contextlib import contextmanager
from typing import Iterator

from playwright.sync_api import Browser, Error as PlaywrightError, Page, TimeoutError, sync_playwright

from config import settings
from core.models import RateLimitedError


USER_AGENT = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
    "AppleWebKit/537.36 (KHTML, like Gecko) "
    "Chrome/125.0.0.0 Safari/537.36"
)

RATE_LIMIT_TEXT = (
    "too many requests",
    "rate limit",
    "temporarily blocked",
    "try again later",
    "cloudflare ray id",
)

FINGERPRINT_SCRIPT = """
Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
const getParameter = WebGLRenderingContext.prototype.getParameter;
WebGLRenderingContext.prototype.getParameter = function(parameter) {
  if (parameter === 37445) return 'Intel Inc.';
  if (parameter === 37446) return 'Intel Iris OpenGL Engine';
  return getParameter.call(this, parameter);
};
"""


class BrowserManager:
    def __init__(self) -> None:
        self._playwright = None
        self._browser: Browser | None = None

    def start(self) -> None:
        if self._browser is not None:
            return

        self._playwright = sync_playwright().start()
        self._browser = self._playwright.chromium.launch(headless=settings.headless)

    def close(self) -> None:
        if self._browser is not None:
            self._browser.close()
            self._browser = None
        if self._playwright is not None:
            self._playwright.stop()
            self._playwright = None

    @contextmanager
    def new_page(self) -> Iterator[Page]:
        if self._browser is None:
            self.start()
        if self._browser is None:
            raise RuntimeError("Browser failed to start.")

        context = self._browser.new_context(
            user_agent=USER_AGENT,
            viewport={"width": 1366, "height": 768},
            locale="en-US",
            timezone_id="America/New_York",
            java_script_enabled=True,
        )
        context.add_init_script(FINGERPRINT_SCRIPT)
        page = context.new_page()
        try:
            yield page
        finally:
            page.close()
            context.close()


def _looks_rate_limited(page: Page) -> bool:
    try:
        body = page.locator("body").inner_text(timeout=1500).lower()
    except PlaywrightError:
        return False
    return any(message in body for message in RATE_LIMIT_TEXT)


def goto_with_retry(page: Page, url: str, retries: int = 3) -> None:
    attempt = 0
    last_error: Exception | None = None

    while attempt <= retries:
        try:
            response = page.goto(url, wait_until="domcontentloaded", timeout=45_000)
            if response is not None and response.status == 429:
                raise RateLimitedError(f"HTTP 429 while loading {url}")
            if _looks_rate_limited(page):
                raise RateLimitedError(f"Rate limit page detected for {url}")
            return
        except RateLimitedError:
            raise
        except (TimeoutError, PlaywrightError) as exc:
            last_error = exc
            if attempt >= retries:
                raise
            time.sleep(2 ** attempt)
            attempt += 1

    if last_error is not None:
        raise last_error

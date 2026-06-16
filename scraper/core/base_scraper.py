import re
import time
from abc import ABC, abstractmethod
from collections.abc import Sequence
from urllib.parse import urljoin

from playwright.sync_api import Error as PlaywrightError, Locator, Page, TimeoutError

from config import Settings
from core.browser import goto_with_retry
from core.models import ChapterData, NovelData, StructureChangedError
from core.utils import strip_html


Selector = str | Sequence[str]


class BaseScraper(ABC):
    def __init__(self, page: Page, config: Settings) -> None:
        self.page = page
        self.config = config

    @abstractmethod
    def scrape_novel(self, url: str) -> NovelData:
        pass

    @abstractmethod
    def scrape_chapter_list(self, novel_url: str) -> list[ChapterData]:
        pass

    @abstractmethod
    def scrape_chapter_content(self, chapter_url: str) -> str:
        pass

    def _sleep(self) -> None:
        if self.config.request_delay > 0:
            time.sleep(self.config.request_delay)

    def _goto(self, url: str) -> None:
        self._sleep()
        goto_with_retry(self.page, url, retries=self.config.max_retries)

    def _selectors(self, selectors: Selector) -> list[str]:
        if isinstance(selectors, str):
            return [selectors]
        return list(selectors)

    def _wait_for_any(self, selectors: Selector, label: str, timeout: int = 15_000) -> str:
        last_error: Exception | None = None
        for selector in self._selectors(selectors):
            try:
                self.page.wait_for_selector(selector, timeout=timeout)
                return selector
            except TimeoutError as exc:
                last_error = exc
        raise StructureChangedError(f"Could not find {label} on {self.page.url}") from last_error

    def _first_locator(self, selectors: Selector) -> Locator | None:
        for selector in self._selectors(selectors):
            locator = self.page.locator(selector).first
            try:
                if locator.count() > 0:
                    return locator
            except PlaywrightError:
                continue
        return None

    def _first_text(self, selectors: Selector, label: str, required: bool = True) -> str | None:
        locator = self._first_locator(selectors)
        if locator is None:
            if required:
                raise StructureChangedError(f"Could not find {label} on {self.page.url}")
            return None

        text = ""
        for attr in ("content", "alt", "title"):
            try:
                text = locator.get_attribute(attr) or ""
            except PlaywrightError:
                text = ""
            if text.strip():
                break

        if not text.strip():
            try:
                text = locator.inner_text(timeout=3000)
            except PlaywrightError:
                text = locator.text_content(timeout=3000) or ""

        clean = strip_html(text)
        if required and not clean:
            raise StructureChangedError(f"{label} was empty on {self.page.url}")
        return clean or None

    def _first_attr(self, selectors: Selector, attr: str, label: str, required: bool = True) -> str | None:
        locator = self._first_locator(selectors)
        if locator is None:
            if required:
                raise StructureChangedError(f"Could not find {label} on {self.page.url}")
            return None

        value = locator.get_attribute(attr)
        if required and not value:
            raise StructureChangedError(f"{label} was empty on {self.page.url}")
        return value

    def _all_texts(self, selectors: Selector) -> list[str]:
        values: list[str] = []
        for selector in self._selectors(selectors):
            try:
                locator = self.page.locator(selector)
                count = locator.count()
            except PlaywrightError:
                continue
            for index in range(count):
                try:
                    text = strip_html(locator.nth(index).inner_text(timeout=1500))
                except PlaywrightError:
                    text = ""
                if text and text not in values:
                    values.append(text)
        return values

    def _inner_html(self, selectors: Selector, label: str) -> str:
        locator = self._first_locator(selectors)
        if locator is None:
            raise StructureChangedError(f"Could not find {label} on {self.page.url}")
        return locator.inner_html(timeout=5000)

    def _chapter_number(self, title: str, fallback: int) -> int:
        match = re.search(r"\b(?:chapter\s*)?(\d+)\b", title, flags=re.IGNORECASE)
        return int(match.group(1)) if match else fallback

    def _absolute_url(self, href: str | None) -> str:
        if not href:
            return ""
        return urljoin(self.page.url, href)

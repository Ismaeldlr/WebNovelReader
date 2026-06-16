import json
import math
import re
import time
from urllib.parse import urljoin, urlparse

from playwright.sync_api import Error as PlaywrightError

from core.base_scraper import BaseScraper
from core.browser import goto_with_retry
from core.models import ChapterData, NovelData, RateLimitedError, StructureChangedError
from core.utils import strip_html
from sites.ranobes import selectors


RANOBES_BASE_URL = "https://ranobes.top"
AD_STRINGS = (
    "ranobes",
    "advertisement",
    "support us",
    "previous chapter",
    "next chapter",
)


class RanobesScraper(BaseScraper):
    def _sleep(self, minimum: float = 3.0) -> None:
        time.sleep(max(float(self.config.request_delay), minimum))

    def _goto_chapter(self, url: str) -> None:
        self._sleep(minimum=6.0)
        goto_with_retry(self.page, url, retries=self.config.max_retries)

    def _wait_for_ranobes(self, selector: str | tuple[str, ...], label: str, timeout: int = 20_000) -> str:
        try:
            return self._wait_for_any(selector, label, timeout=timeout)
        except StructureChangedError as exc:
            raise RateLimitedError(
                f"Ranobes did not render {label}; Cloudflare or rate limiting may be blocking the request."
            ) from exc

    def _extract_novel_id(self, novel_url: str) -> str:
        path = urlparse(novel_url).path
        match = re.search(r"/novels/(\d+)-", path)
        if not match:
            raise StructureChangedError(f"Could not extract Ranobes novel id from {novel_url}")
        return match.group(1)

    def _chapter_list_url(self, novel_id: str, page_number: int) -> str:
        base = f"{RANOBES_BASE_URL}/chapters/{novel_id}/"
        if page_number <= 1:
            return base
        return f"{base}page/{page_number}/"

    def _extract_chapter_count(self) -> int | None:
        try:
            item = self.page.locator(selectors.NOVEL_CHAPTER_COUNT_LI).first
            if item.count() == 0:
                return None
            text = item.locator(selectors.NOVEL_CHAPTER_COUNT_SPAN).first.inner_text(timeout=2000)
        except PlaywrightError:
            return None

        match = re.search(r"\d+", text.replace(",", ""))
        return int(match.group(0)) if match else None

    def _extract_chapter_list_link(self, novel_id: str) -> str:
        return self._chapter_list_url(novel_id, 1)

    def _chapter_script_text(self) -> str:
        scripts = self.page.locator(selectors.CHAPTER_LIST_SCRIPT)
        for index in range(scripts.count()):
            text = scripts.nth(index).text_content(timeout=2000) or ""
            if '"chapters"' in text:
                return text
        raise StructureChangedError(f"Could not find Ranobes chapter JSON on {self.page.url}")

    def _extract_chapter_data_from_script(self, script_text: str) -> dict:
        match = re.search(selectors.CHAPTER_DATA_REGEX, script_text, flags=re.DOTALL)
        if not match:
            raise StructureChangedError(f"Could not extract Ranobes __DATA__ object on {self.page.url}")

        try:
            parsed = json.loads(match.group(1))
        except json.JSONDecodeError as exc:
            raise StructureChangedError(f"Ranobes chapter JSON could not be parsed on {self.page.url}") from exc

        if not isinstance(parsed, dict):
            raise StructureChangedError(f"Ranobes __DATA__ was not an object on {self.page.url}")
        return parsed

    def _extract_pages_from_data(self, data: dict) -> int | None:
        for key in ("pages_count", "pages", "count_pages"):
            value = data.get(key)
            if value is None:
                continue
            try:
                return int(value)
            except (TypeError, ValueError):
                continue
        return None

    def _extract_chapters_from_data(self, data: dict) -> list[dict]:
        chapters = data.get("chapters")
        if not isinstance(chapters, list):
            raise StructureChangedError(f"Ranobes __DATA__.chapters was not a list on {self.page.url}")
        return [item for item in chapters if isinstance(item, dict)]

    def scrape_novel(self, url: str) -> NovelData:
        self._goto(url)
        self._wait_for_ranobes(selectors.NOVEL_TITLE, "novel title")

        title = self._first_text(selectors.NOVEL_TITLE, "novel title") or "Untitled"
        author = self._first_text(selectors.NOVEL_AUTHOR, "novel author", required=False)
        description = self._first_text(selectors.NOVEL_DESCRIPTION, "novel description", required=False)
        cover_url = self._first_attr(selectors.NOVEL_COVER, "src", "cover image", required=False)

        return NovelData(
            title=title,
            author=author,
            description=description,
            cover_url=urljoin(RANOBES_BASE_URL, cover_url) if cover_url else None,
            tags=self._all_texts(selectors.NOVEL_TAGS),
            source_url=url,
            source_site="ranobes",
        )

    def scrape_chapter_list(self, novel_url: str) -> list[ChapterData]:
        novel_id = self._extract_novel_id(novel_url)
        self._goto(novel_url)
        self._wait_for_ranobes(selectors.NOVEL_TITLE, "novel title")

        chapter_count = self._extract_chapter_count()
        first_page_url = self._extract_chapter_list_link(novel_id)
        total_pages = max(1, math.ceil(chapter_count / selectors.CHAPTERS_PER_PAGE)) if chapter_count else None
        raw_chapters: list[dict] = []
        seen_urls: set[str] = set()
        page_number = 1

        while total_pages is None or page_number <= total_pages:
            chapter_list_url = first_page_url if page_number == 1 else self._chapter_list_url(novel_id, page_number)
            self._goto(chapter_list_url)
            self._wait_for_ranobes(selectors.CHAPTER_LIST_CONTAINER, "chapter list container")

            data = self._extract_chapter_data_from_script(self._chapter_script_text())
            if total_pages is None:
                total_pages = self._extract_pages_from_data(data) or 1

            page_chapters = self._extract_chapters_from_data(data)
            if not page_chapters and page_number > 1:
                break

            for item in page_chapters:
                href = item.get("link")
                if not href:
                    continue
                source_url = urljoin(RANOBES_BASE_URL, str(href))
                if source_url in seen_urls:
                    continue
                seen_urls.add(source_url)
                raw_chapters.append(
                    {
                        "title": strip_html(str(item.get("title") or "")),
                        "source_url": source_url,
                    }
                )

            page_number += 1

        if not raw_chapters:
            raise StructureChangedError(f"No chapters found on {novel_url}")

        raw_chapters.reverse()
        return [
            ChapterData(
                chapter_number=index + 1,
                title=item["title"] or f"Chapter {index + 1}",
                source_url=item["source_url"],
            )
            for index, item in enumerate(raw_chapters)
        ]

    def _clean_chapter_paragraph(self, locator) -> str:
        try:
            html = locator.evaluate(
                """element => {
                    const clone = element.cloneNode(true);
                    clone.querySelectorAll('span').forEach(span => span.remove());
                    return clone.innerHTML;
                }"""
            )
        except PlaywrightError:
            html = locator.inner_html(timeout=2000)
        return strip_html(html)

    def scrape_chapter_content(self, chapter_url: str) -> str:
        self._goto_chapter(chapter_url)
        self._wait_for_ranobes(selectors.CHAPTER_TITLE, "chapter title")

        wrapper = self._first_locator(selectors.CHAPTER_CONTENT_BODY)
        if wrapper is None:
            raise StructureChangedError(f"Could not find chapter content on {chapter_url}")

        paragraphs: list[str] = []
        paragraph_locators = wrapper.locator(selectors.CHAPTER_PARAGRAPHS)
        for index in range(paragraph_locators.count()):
            text = self._clean_chapter_paragraph(paragraph_locators.nth(index))
            lowered = text.lower()
            if not text or any(ad_string in lowered for ad_string in AD_STRINGS):
                continue
            paragraphs.append(text)

        if paragraphs:
            return "\n\n".join(paragraphs)

        content = strip_html(wrapper.inner_html(timeout=5000))
        if content:
            return content

        raise StructureChangedError(f"Chapter content was empty on {chapter_url}")

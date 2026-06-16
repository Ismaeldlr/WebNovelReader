from core.base_scraper import BaseScraper
from core.models import ChapterData, NovelData, StructureChangedError
from core.utils import strip_html
from sites.royalroad import selectors


class RoyalRoadScraper(BaseScraper):
    def scrape_novel(self, url: str) -> NovelData:
        self._goto(url)
        self._wait_for_any(selectors.NOVEL_TITLE, "novel title")

        title = self._first_text(selectors.NOVEL_TITLE, "novel title") or "Untitled"
        author = self._first_text(selectors.NOVEL_AUTHOR, "novel author", required=False)
        description = self._first_text(selectors.NOVEL_DESCRIPTION, "novel description", required=False)
        cover_url = self._first_attr(selectors.NOVEL_COVER, "src", "cover image", required=False)
        if not cover_url:
            cover_url = self._first_attr(selectors.NOVEL_COVER, "content", "cover image", required=False)

        return NovelData(
            title=title,
            author=author,
            description=description,
            cover_url=self._absolute_url(cover_url),
            tags=self._all_texts(selectors.NOVEL_TAGS),
            source_url=url,
            source_site="royal_road",
        )

    def scrape_chapter_list(self, novel_url: str) -> list[ChapterData]:
        self._goto(novel_url)
        self._wait_for_any(selectors.CHAPTER_LIST_ROWS, "chapter list")

        chapters: list[ChapterData] = []
        rows = self.page.locator(selectors.CHAPTER_LIST_ROWS[0])
        if rows.count() == 0:
            rows = self.page.locator(selectors.CHAPTER_LIST_ROWS[1])
        if rows.count() == 0:
            rows = self.page.locator(selectors.CHAPTER_LIST_ROWS[2])

        for index in range(rows.count()):
            row = rows.nth(index)
            link = row.locator(selectors.CHAPTER_LINK[0]).first
            if link.count() == 0:
                continue

            href = link.get_attribute("href")
            title = strip_html(link.inner_text(timeout=2000)) or f"Chapter {index + 1}"
            chapters.append(
                ChapterData(
                    chapter_number=self._chapter_number(title, index + 1),
                    title=title,
                    source_url=self._absolute_url(href),
                )
            )

        if not chapters:
            raise StructureChangedError(f"No chapters found on {novel_url}")
        return chapters

    def scrape_chapter_content(self, chapter_url: str) -> str:
        self._goto(chapter_url)
        self._wait_for_any(selectors.CHAPTER_CONTENT_BODY, "chapter content")
        return strip_html(self._inner_html(selectors.CHAPTER_CONTENT_BODY, "chapter content"))

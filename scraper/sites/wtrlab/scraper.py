from core.base_scraper import BaseScraper
from core.models import ChapterData, NovelData, StructureChangedError
from core.utils import strip_html
from sites.wtrlab import selectors


class WtrLabScraper(BaseScraper):
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
            source_site="wtr_lab",
        )

    def scrape_chapter_list(self, novel_url: str) -> list[ChapterData]:
        self._goto(novel_url)
        self._wait_for_any(selectors.CHAPTER_LIST_ROWS, "chapter list")

        chapters: list[ChapterData] = []
        seen_urls: set[str] = set()

        for selector in selectors.CHAPTER_LIST_ROWS:
            links = self.page.locator(selector)
            for index in range(links.count()):
                link = links.nth(index)
                href = self._absolute_url(link.get_attribute("href"))
                if not href or href in seen_urls:
                    continue
                title = strip_html(link.inner_text(timeout=2000)) or f"Chapter {len(chapters) + 1}"
                seen_urls.add(href)
                chapters.append(
                    ChapterData(
                        chapter_number=self._chapter_number(title, len(chapters) + 1),
                        title=title,
                        source_url=href,
                    )
                )
            if chapters:
                break

        if not chapters:
            raise StructureChangedError(f"No chapters found on {novel_url}")
        return chapters

    def scrape_chapter_content(self, chapter_url: str) -> str:
        self._goto(chapter_url)
        self._wait_for_any(selectors.CHAPTER_CONTENT_BODY, "chapter content")
        return strip_html(self._inner_html(selectors.CHAPTER_CONTENT_BODY, "chapter content"))

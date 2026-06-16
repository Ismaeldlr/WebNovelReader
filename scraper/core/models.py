from dataclasses import dataclass, field


@dataclass(frozen=True)
class NovelData:
    title: str
    author: str | None
    description: str | None
    cover_url: str | None
    tags: list[str] = field(default_factory=list)
    source_url: str = ""
    source_site: str = ""


@dataclass(frozen=True)
class ChapterData:
    chapter_number: int
    title: str
    source_url: str
    content: str | None = None


class ScraperError(Exception):
    """Base class for scraper-specific failures."""


class UnknownSourceError(ScraperError):
    pass


class StructureChangedError(ScraperError):
    pass


class RateLimitedError(ScraperError):
    pass


class DuplicateNovelError(ScraperError):
    pass

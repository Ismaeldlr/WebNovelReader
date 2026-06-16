NOVEL_TITLE = (
    "div.fic-title h1",
    ".fic-title h1",
    "h1",
    "meta[property='og:title']",
)
NOVEL_AUTHOR = (
    ".fic-title h4 a[href*='/profile/']",
    "h4 a[href*='/profile/']",
    "a[href*='/profile/']",
)
NOVEL_DESCRIPTION = (
    ".fiction-info .description .hidden-content",
    ".fiction-info .description",
    "div.description",
    "meta[property='og:description']",
)
NOVEL_COVER = (
    "img.thumbnail",
    ".fic-header img",
    "meta[property='og:image']",
)
NOVEL_TAGS = (
    ".fiction-info .tags a",
    "a[href*='tagsAdd']",
)
CHAPTER_LIST_ROWS = (
    "table#chapters tbody tr",
    "tr.chapter-row",
    "tr[data-url]",
)
CHAPTER_TITLE = (
    "a[href*='/chapter/']",
    "td:first-child a",
)
CHAPTER_LINK = (
    "a[href*='/chapter/']",
)
CHAPTER_CONTENT_BODY = (
    ".chapter-inner",
    ".chapter-content",
    "#chapter-content",
)

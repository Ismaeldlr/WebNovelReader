NOVEL_TITLE = (
    "h1",
    "[data-testid='novel-title']",
    "meta[property='og:title']",
)
NOVEL_AUTHOR = (
    "a[href*='/author/']",
    "[data-testid='novel-author']",
    ".author a",
)
NOVEL_DESCRIPTION = (
    "[data-testid='novel-description']",
    ".novel-description",
    ".description",
    "meta[property='og:description']",
)
NOVEL_COVER = (
    "img[alt][src*='cover']",
    "img[alt]",
    "meta[property='og:image']",
)
NOVEL_TAGS = (
    "a[href*='/genre/']",
    "a[href*='genre=']",
    ".genres a",
    ".tags a",
)
CHAPTER_LIST_ROWS = (
    "a[href*='/chapter/']",
    "a[href*='/read/']",
    ".chapter-list a",
)
CHAPTER_CONTENT_BODY = (
    "[data-testid='chapter-content']",
    ".chapter-content",
    "article",
    "main",
)

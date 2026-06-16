NOVEL_TITLE = (
    "div#dle-content .title",
    ".r-fullstory .title",
    ".title",
)
NOVEL_AUTHOR = "span.tag_list"
NOVEL_DESCRIPTION = (
    "div.cont-text.showcont-h",
    "div.showcont-h",
)
NOVEL_CHAPTER_COUNT_LI = 'li[title="Glossary + illustrations + division of chapters, etc."]'
NOVEL_CHAPTER_COUNT_SPAN = "span.grey"
NOVEL_CHAPTERS_LINK = (
    "a.uppercase.bold[href*='/chapters/']",
    "a.uppercase[href*='/chapters/']",
    "a[href*='/chapters/']",
)
NOVEL_COVER = (
    ".poster img",
    ".r-fullstory-poster img",
    "img[alt][src*='uploads']",
)
NOVEL_TAGS = (
    ".r-fullstory-tags a",
    ".tags a",
    "a[href*='/tags/']",
)
CHAPTER_LIST_CONTAINER = "div#dle-content"
CHAPTER_LIST_SCRIPT = "div#dle-content script"
CHAPTER_DATA_REGEX = r"window\.__DATA__\s*=\s*(\{.*\})\s*;?\s*$"
CHAPTERS_PER_PAGE = 25
CHAPTER_TITLE = (
    "h1.h4.title",
    "h1.title",
)
CHAPTER_CONTENT_BODY = (
    "div.content-text",
    ".content-text",
    ".text",
    "#arrticle",
    "article",
)
CHAPTER_PARAGRAPHS = "p"

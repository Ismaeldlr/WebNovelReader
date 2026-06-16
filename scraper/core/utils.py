import re
from html import unescape
from pathlib import Path
from urllib.parse import urlparse
from urllib.request import Request, urlopen

from PIL import Image

from core.models import UnknownSourceError


def strip_html(text: str | None) -> str:
    if not text:
        return ""

    value = str(text)
    value = re.sub(r"<script[\s\S]*?</script>", " ", value, flags=re.IGNORECASE)
    value = re.sub(r"<style[\s\S]*?</style>", " ", value, flags=re.IGNORECASE)
    value = re.sub(r"<br\s*/?>", "\n", value, flags=re.IGNORECASE)
    value = re.sub(r"</p\s*>", "\n\n", value, flags=re.IGNORECASE)
    value = re.sub(r"<[^>]+>", " ", value)
    value = unescape(value)
    value = re.sub(r"[ \t]+\n", "\n", value)
    value = re.sub(r"\n{3,}", "\n\n", value)
    value = re.sub(r"[ \t]{2,}", " ", value)
    return value.strip()


def count_words(text: str | None) -> int:
    if not text:
        return 0
    return len(re.findall(r"\b[\w'-]+\b", text))


def download_cover(url: str | None, novel_id: str, covers_dir: Path) -> str | None:
    if not url:
        return None

    try:
        covers_dir.mkdir(parents=True, exist_ok=True)
        request = Request(
            url,
            headers={
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/125 Safari/537.36",
                "Accept": "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
            },
        )
        with urlopen(request, timeout=30) as response:
            with Image.open(response) as image:
                output_path = covers_dir / f"{novel_id}.jpg"
                image.convert("RGB").save(output_path, "JPEG", quality=88, optimize=True)
                return f"/covers/{novel_id}.jpg"
    except Exception:
        return None


def detect_source_site(url: str) -> str:
    host = urlparse(url).netloc.lower()

    if "ranobes" in host:
        return "ranobes"
    if "wtr-lab" in host or "wtrlab" in host:
        return "wtr_lab"
    if "royalroad" in host:
        return "royal_road"

    raise UnknownSourceError(f"Unsupported source URL: {url}")


def slugify(text: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", text.lower())
    return slug.strip("-")[:80] or "novel"

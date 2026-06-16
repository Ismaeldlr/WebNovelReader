from playwright.sync_api import Page

from config import Settings
from core.models import UnknownSourceError
from sites.ranobes.scraper import RanobesScraper
from sites.royalroad.scraper import RoyalRoadScraper
from sites.wtrlab.scraper import WtrLabScraper


def get_scraper(source_site: str, page: Page, config: Settings):
    if source_site == "ranobes":
        return RanobesScraper(page, config)
    if source_site == "wtr_lab":
        return WtrLabScraper(page, config)
    if source_site == "royal_road":
        return RoyalRoadScraper(page, config)

    raise UnknownSourceError(f"Unsupported source site: {source_site}")

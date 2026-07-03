import os
import logging
from pathlib import Path
from typing import Dict, List
from urllib.parse import urlparse, urlunparse, parse_qs, urlencode

from dotenv import load_dotenv

load_dotenv(Path(__file__).parent.parent / ".env")

RSS_FEEDS: List[Dict[str, str]] = [
    {"url": "http://feeds.bbci.co.uk/news/rss.xml", "name": "bbc", "label": "BBC News"},
    {"url": "https://feeds.npr.org/1001/rss.xml", "name": "npr", "label": "NPR"},
    {"url": "https://www.theguardian.com/world/rss", "name": "guardian", "label": "The Guardian"},
]


class Settings:
    def __init__(self) -> None:
        raw_url: str = os.getenv(
            "DIRECT_URL",
            os.getenv("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/news_pulse"),
        )
        parsed = urlparse(raw_url)
        qs = parse_qs(parsed.query)
        qs.pop("pgbouncer", None)
        self.DATABASE_URL = urlunparse(parsed._replace(query=urlencode(qs, doseq=True)))
        self.RSS_FEEDS = RSS_FEEDS
        self.MIN_CLUSTER_SIMILARITY = float(os.getenv("MIN_CLUSTER_SIMILARITY", "0.1"))
        self.MIN_TERM_FREQUENCY = int(os.getenv("MIN_TERM_FREQUENCY", "1"))
        self.LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO")

    def configure_logging(self) -> None:
        logging.basicConfig(
            level=getattr(logging, self.LOG_LEVEL.upper(), logging.INFO),
            format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
            datefmt="%Y-%m-%d %H:%M:%S",
        )

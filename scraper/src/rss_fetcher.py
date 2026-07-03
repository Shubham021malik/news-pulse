import logging
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

import requests
import feedparser
from dateutil import parser as dateparser

logger = logging.getLogger(__name__)

USER_AGENT = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
    "AppleWebKit/537.36 (KHTML, like Gecko) "
    "Chrome/120.0.0.0 Safari/537.36"
)


class RSSFetcher:
    def __init__(self, feeds: List[Dict[str, str]], max_retries: int = 2, timeout: int = 10) -> None:
        self.feeds = feeds
        self.max_retries = max_retries
        self.timeout = timeout

    def fetch_all(self) -> List[Dict[str, Any]]:
        all_articles: List[Dict[str, Any]] = []

        with ThreadPoolExecutor(max_workers=len(self.feeds)) as executor:
            future_map = {executor.submit(self._fetch_single_feed, feed): feed for feed in self.feeds}
            for future in as_completed(future_map):
                feed = future_map[future]
                try:
                    articles = future.result()
                    all_articles.extend(articles)
                    logger.info("Fetched %d articles from %s", len(articles), feed["label"])
                except Exception:
                    logger.exception("Failed to fetch feed: %s", feed["label"])

        return all_articles

    def _fetch_single_feed(self, feed: Dict[str, str]) -> List[Dict[str, Any]]:
        url, label, name = feed["url"], feed["label"], feed["name"]

        for attempt in range(1, self.max_retries + 1):
            try:
                response = requests.get(url, timeout=self.timeout, headers={"User-Agent": USER_AGENT})
                response.raise_for_status()
                parsed = feedparser.parse(response.text)
                return [n for entry in parsed.entries if (n := self._normalize_entry(entry, label, name))]
            except Exception:
                logger.exception("Error fetching %s (attempt %d/%d)", label, attempt, self.max_retries)
                if attempt < self.max_retries:
                    time.sleep(1)
        return []

    def _normalize_entry(self, entry: Any, source_label: str, source_name: str) -> Optional[Dict[str, Any]]:
        title = getattr(entry, "title", None)
        url = getattr(entry, "link", None)
        if not title or not url:
            logger.warning("Skipping entry missing title or link in %s", source_label)
            return None

        return {
            "title": str(title),
            "url": str(url),
            "source": source_name,
            "source_label": source_label,
            "summary": self._get_summary(entry),
            "published_at": self._get_published_date(entry),
        }

    def _get_summary(self, entry: Any) -> str:
        for field in ("summary", "description", "content"):
            value = getattr(entry, field, None)
            if value is None:
                continue
            if isinstance(value, list) and len(value) > 0:
                return str(value[0].get("value", "")) if hasattr(value[0], "get") else str(value[0])
            return str(value)
        return ""

    def _get_published_date(self, entry: Any) -> datetime:
        for field in ("published", "pubDate", "updated", "updated_parsed"):
            raw = getattr(entry, field, None)
            if raw is None:
                continue
            try:
                if isinstance(raw, str):
                    parsed = dateparser.parse(raw)
                    if parsed:
                        return parsed
                elif isinstance(raw, datetime):
                    return raw
            except (ValueError, TypeError):
                continue
        return datetime.now(timezone.utc)

import logging
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from typing import Any, Dict, List

import requests
import trafilatura
from bs4 import BeautifulSoup

logger = logging.getLogger(__name__)

USER_AGENT = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
    "AppleWebKit/537.36 (KHTML, like Gecko) "
    "Chrome/120.0.0.0 Safari/537.36"
)


class ArticleExtractor:
    def __init__(self, timeout: int = 10, max_retries: int = 2, max_workers: int = 10) -> None:
        self.timeout = timeout
        self.max_retries = max_retries
        self.max_workers = max_workers

    def extract_all(self, articles: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        urls_to_fetch = [a for a in articles if a.get("url")]
        if not urls_to_fetch:
            return articles

        results: List[Dict[str, Any]] = []
        with ThreadPoolExecutor(max_workers=self.max_workers) as executor:
            future_map = {executor.submit(self._extract_single, article): article for article in urls_to_fetch}
            for future in as_completed(future_map):
                article = future_map[future]
                try:
                    results.append(future.result())
                except Exception:
                    logger.exception("Unexpected error extracting: %s", article.get("url"))
                    article["content"] = article.get("summary", "")
                    results.append(article)

        return results

    def _extract_single(self, article: Dict[str, Any]) -> Dict[str, Any]:
        url = article.get("url", "")

        for attempt in range(1, self.max_retries + 1):
            try:
                response = requests.get(url, timeout=self.timeout, headers={"User-Agent": USER_AGENT})
                response.raise_for_status()
            except requests.RequestException:
                logger.warning("Request failed for %s (attempt %d/%d)", url, attempt, self.max_retries)
                if attempt < self.max_retries:
                    time.sleep(2 ** attempt)
                continue

            content = trafilatura.extract(response.text, output_format="txt", include_links=False)
            if content:
                article["content"] = content.strip()
                return article

            soup = BeautifulSoup(response.text, "html.parser")
            text = "\n".join(p.get_text(strip=True) for p in soup.find_all("p") if p.get_text(strip=True))
            if text:
                article["content"] = text
                return article

            logger.warning("No content extracted from %s", url)
            break

        article["content"] = article.get("summary", "")
        return article

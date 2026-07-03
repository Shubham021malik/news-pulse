import logging
from typing import Any, Dict, List, Set

logger = logging.getLogger(__name__)


class Deduplicator:
    def filter_new_articles(
        self, articles: List[Dict[str, Any]], existing_urls: Set[str]
    ) -> List[Dict[str, Any]]:
        new_articles: List[Dict[str, Any]] = []
        seen_urls: Set[str] = set()
        dup_count: int = 0
        for article in articles:
            url = article.get("url", "")
            if url in existing_urls or url in seen_urls:
                dup_count += 1
                logger.debug("Skipping duplicate: %s", url)
            else:
                seen_urls.add(url)
                new_articles.append(article)

        if dup_count:
            logger.info("Filtered out %d duplicate articles", dup_count)
        logger.info("New articles after dedup: %d", len(new_articles))
        return new_articles

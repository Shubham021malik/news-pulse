import argparse
import logging
import sys
from typing import Any, Dict, List

from db_writer import DatabaseWriter
from deduplicator import Deduplicator
from article_extractor import ArticleExtractor
from rss_fetcher import RSSFetcher
from topic_clusterer import TopicClusterer
from config import Settings

logger = logging.getLogger(__name__)


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--quick", action="store_true",
                        help="Skip full article content extraction (uses RSS summary only)")
    args = parser.parse_args()

    settings = Settings()
    settings.configure_logging()

    logger.info("Starting News Pulse RSS scraper" + (" (quick mode)" if args.quick else ""))

    db = DatabaseWriter(settings.DATABASE_URL)
    try:
        db.connect()
    except Exception:
        logger.exception("Failed to connect to database, exiting")
        return 1

    rss_fetcher = RSSFetcher(settings.RSS_FEEDS)
    article_extractor = ArticleExtractor()
    deduplicator = Deduplicator()
    topic_clusterer = TopicClusterer(min_term_frequency=settings.MIN_TERM_FREQUENCY)

    try:
        logger.info("=== Phase 1: Fetch and Store Articles ===")
        raw_articles = rss_fetcher.fetch_all()
        logger.info("Fetched %d raw articles", len(raw_articles))

        if raw_articles:
            if args.quick:
                # Quick mode: skip full article content extraction, use RSS summary
                for a in raw_articles:
                    a["content"] = a.get("summary", "")
                articles_with_content = raw_articles
                logger.info("Quick mode: using RSS summaries, skipping full extraction")
            else:
                articles_with_content = article_extractor.extract_all(raw_articles)
                logger.info("Extracted content for %d articles", len(articles_with_content))

            urls = [a["url"] for a in articles_with_content if "url" in a]
            existing_urls = db.get_existing_urls(urls)
            new_articles = deduplicator.filter_new_articles(articles_with_content, existing_urls)

            if new_articles:
                inserted_ids = db.insert_articles(new_articles)
                logger.info("Inserted %d new articles", len(inserted_ids))
            else:
                logger.info("No new articles to insert")
        else:
            logger.warning("No articles fetched from any source")

        logger.info("=== Phase 2: Cluster Unclustered Articles ===")
        unclustered = db.get_unclustered_articles()
        logger.info("Found %d unclustered articles", len(unclustered))

        if len(unclustered) < 2:
            logger.info("Not enough articles to cluster (need at least 2)")
        else:
            clusters = topic_clusterer.cluster(
                unclustered, similarity_threshold=settings.MIN_CLUSTER_SIMILARITY,
            )

            if clusters:
                logger.info("Updating database with %d clusters", len(clusters))

                for cluster in clusters:
                    db.create_cluster(
                        label=cluster["label"],
                        article_ids=cluster["article_ids"],
                        start_time=cluster["start_time"],
                        end_time=cluster["end_time"],
                    )

                total_clustered = sum(len(c["article_ids"]) for c in clusters)
                logger.info(
                    "Summary: %d clusters created, %d articles clustered, %d remaining unclustered",
                    len(clusters), total_clustered, len(unclustered) - total_clustered,
                )
            else:
                logger.info("No clusters generated from %d articles", len(unclustered))

    except Exception:
        logger.exception("Fatal error during scraper run")
        return 1
    finally:
        db.close()

    logger.info("News Pulse scraper completed successfully")
    return 0


if __name__ == "__main__":
    sys.exit(main())

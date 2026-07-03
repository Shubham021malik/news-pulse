import logging
import uuid
from datetime import datetime
from typing import Any, Dict, List, Optional, Set

import psycopg2
from psycopg2.extras import execute_values

logger = logging.getLogger(__name__)


class DatabaseWriter:
    def __init__(self, connection_string: str) -> None:
        self.connection_string: str = connection_string
        self.connection: Optional[psycopg2.extensions.connection] = None

    def connect(self) -> None:
        try:
            self.connection = psycopg2.connect(self.connection_string)
            self.connection.autocommit = False
            logger.info("Connected to database")
        except psycopg2.Error:
            logger.exception("Failed to connect to database")
            raise

    def get_existing_urls(self, urls: List[str]) -> Set[str]:
        if not urls:
            return set()
        if self.connection is None:
            raise RuntimeError("Database not connected. Call connect() first.")
        try:
            with self.connection.cursor() as cur:
                placeholders = ",".join("%s" for _ in urls)
                query = f"SELECT url FROM articles WHERE url IN ({placeholders})"
                cur.execute(query, urls)
                rows = cur.fetchall()
                return {row[0] for row in rows}
        except psycopg2.Error:
            logger.exception("Failed to query existing URLs")
            raise

    def insert_articles(self, articles: List[Dict[str, Any]]) -> List[str]:
        if not articles:
            return []
        if self.connection is None:
            raise RuntimeError("Database not connected. Call connect() first.")
        try:
            with self.connection.cursor() as cur:
                rows = [
                    (
                        str(uuid.uuid4()),
                        a["title"],
                        a["url"],
                        a.get("source", ""),
                        a.get("source_label", ""),
                        a.get("summary", ""),
                        a.get("content", ""),
                        a.get("published_at", datetime.now()),
                    )
                    for a in articles
                ]
                query = """
                    INSERT INTO articles (id, title, url, source, source_label, summary, content, published_at)
                    VALUES %s
                    ON CONFLICT (url) DO NOTHING
                """
                execute_values(cur, query, rows)
                self.connection.commit()
                logger.info("Inserted %d articles (duplicates skipped)", len(rows))
                return []
        except psycopg2.errors.UniqueViolation:
            self.connection.rollback()
            logger.warning("UniqueViolation during batch insert — retrying individually")
            return self._insert_articles_individually(articles)
        except psycopg2.Error:
            self.connection.rollback()
            logger.exception("Failed to insert articles")
            raise

    def _insert_articles_individually(self, articles: List[Dict[str, Any]]) -> List[str]:
        ids: List[str] = []
        for a in articles:
            try:
                with self.connection.cursor() as cur:
                    article_id = str(uuid.uuid4())
                    cur.execute(
                        """
                        INSERT INTO articles (id, title, url, source, source_label, summary, content, published_at)
                        VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                        ON CONFLICT (url) DO NOTHING
                        RETURNING id
                        """,
                        (
                            article_id,
                            a["title"],
                            a["url"],
                            a.get("source", ""),
                            a.get("source_label", ""),
                            a.get("summary", ""),
                            a.get("content", ""),
                            a.get("published_at", datetime.now()),
                        ),
                    )
                    result = cur.fetchone()
                    if result:
                        ids.append(str(result[0]))
                self.connection.commit()
            except psycopg2.errors.UniqueViolation:
                self.connection.rollback()
                logger.debug("Skipping duplicate article: %s", a.get("url", ""))
            except psycopg2.Error:
                self.connection.rollback()
                logger.exception("Failed to insert article: %s", a.get("url", ""))
        logger.info("Inserted %d articles individually (duplicates skipped)", len(ids))
        return ids

    def get_unclustered_articles(self) -> List[Dict[str, Any]]:
        if self.connection is None:
            raise RuntimeError("Database not connected. Call connect() first.")
        try:
            with self.connection.cursor() as cur:
                cur.execute("""
                    SELECT id, title, COALESCE(summary, ''), COALESCE(content, ''), published_at
                    FROM articles
                    WHERE cluster_id IS NULL
                    ORDER BY published_at DESC
                """)
                rows = cur.fetchall()
                return [
                    {
                        "id": str(row[0]),
                        "title": row[1],
                        "summary": row[2],
                        "content": row[3],
                        "published_at": row[4],
                    }
                    for row in rows
                ]
        except psycopg2.Error:
            logger.exception("Failed to fetch unclustered articles")
            raise

    def delete_all_clusters(self) -> None:
        if self.connection is None:
            raise RuntimeError("Database not connected. Call connect() first.")
        try:
            with self.connection.cursor() as cur:
                cur.execute("UPDATE articles SET cluster_id = NULL")
                cur.execute("DELETE FROM clusters")
                self.connection.commit()
                logger.info("Cleared all clusters and unlinked articles")
        except psycopg2.Error:
            self.connection.rollback()
            logger.exception("Failed to delete clusters")
            raise

    def create_cluster(self, label: str, article_ids: List[str], start_time: datetime, end_time: datetime) -> str:
        if self.connection is None:
            raise RuntimeError("Database not connected. Call connect() first.")
        try:
            with self.connection.cursor() as cur:
                cluster_id = str(uuid.uuid4())
                article_count = len(article_ids)
                now = datetime.now()
                cur.execute(
                    "INSERT INTO clusters (id, label, article_count, start_time, end_time, created_at, updated_at) VALUES (%s, %s, %s, %s, %s, %s, %s) RETURNING id",
                    (cluster_id, label, article_count, start_time, end_time, now, now),
                )
                cluster_id = str(cur.fetchone()[0])
                for aid in article_ids:
                    cur.execute(
                        "UPDATE articles SET cluster_id = %s WHERE id = %s",
                        (cluster_id, aid),
                    )
                self.connection.commit()
                logger.info("Created cluster '%s' with %d articles", label, article_count)
                return cluster_id
        except psycopg2.Error:
            self.connection.rollback()
            logger.exception("Failed to create cluster")
            raise

    def close(self) -> None:
        if self.connection:
            try:
                self.connection.close()
                logger.info("Database connection closed")
            except psycopg2.Error:
                logger.exception("Error closing database connection")

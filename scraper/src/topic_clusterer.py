import logging
import re
from datetime import datetime, timezone
from typing import Any, Dict, List, Set, Tuple

import nltk
import numpy as np
from nltk.corpus import stopwords
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

logger = logging.getLogger(__name__)


class TopicClusterer:
    def __init__(self, min_term_frequency: int = 2) -> None:
        self.min_term_frequency = min_term_frequency
        self._stop_words: Set[str] | None = None

    def cluster(self, articles: List[Dict[str, Any]], similarity_threshold: float = 0.3) -> List[Dict[str, Any]]:
        if len(articles) < 2:
            logger.info("Not enough articles to cluster (%d)", len(articles))
            return []

        texts = self._prepare_texts(articles)
        vectorizer = TfidfVectorizer(min_df=self.min_term_frequency, max_df=0.85, sublinear_tf=True)
        tfidf_matrix = vectorizer.fit_transform(texts)
        feature_names = vectorizer.get_feature_names_out().tolist()

        if tfidf_matrix.shape[0] < 2:
            return []

        sim_matrix = cosine_similarity(tfidf_matrix)
        clusters = self._find_clusters(sim_matrix, similarity_threshold)

        if not clusters:
            logger.info("No clusters found at threshold %.2f", similarity_threshold)
            return []

        now = datetime.now(timezone.utc)
        results: List[Dict[str, Any]] = []
        for indices in clusters:
            times = [articles[i].get("published_at") for i in indices if articles[i].get("published_at")]
            results.append({
                "label": self._generate_label(indices, tfidf_matrix, feature_names),
                "article_ids": [articles[i]["id"] for i in indices],
                "start_time": min(times) if times else now,
                "end_time": max(times) if times else now,
            })

        logger.info("Created %d clusters from %d articles", len(results), len(articles))
        return results

    def _prepare_texts(self, articles: List[Dict[str, Any]]) -> List[str]:
        stop_words = self._get_stop_words()
        return [
            " ".join(
                w for w in re.sub(r"[^a-z0-9\s]+", " ", f"{a.get('title', '')} {a.get('summary', '')} {a.get('content', '')}".lower()).split()
                if w not in stop_words and len(w) > 2
            )
            for a in articles
        ]

    def _find_clusters(self, sim_matrix: np.ndarray, threshold: float) -> List[List[int]]:
        n = sim_matrix.shape[0]
        visited = [False] * n
        clusters: List[List[int]] = []

        for i in range(n):
            if visited[i]:
                continue
            component: List[int] = []
            stack = [i]
            while stack:
                node = stack.pop()
                if visited[node]:
                    continue
                visited[node] = True
                component.append(node)
                for j in range(n):
                    if not visited[j] and sim_matrix[node, j] >= threshold:
                        stack.append(j)
            if len(component) > 1:
                clusters.append(sorted(component))

        return clusters

    def _generate_label(self, indices: List[int], tfidf_matrix: Any, feature_names: List[str]) -> str:
        sub_matrix = tfidf_matrix[indices, :]
        mean_tfidf = sub_matrix.mean(axis=0).A1 if hasattr(sub_matrix, "A1") else np.asarray(sub_matrix.mean(axis=0)).flatten()
        top_terms = [feature_names[i] for i in mean_tfidf.argsort()[::-1][:3] if mean_tfidf[i] > 0]
        return ", ".join(top_terms) if top_terms else "untitled"

    def _get_stop_words(self) -> Set[str]:
        if self._stop_words is None:
            try:
                self._stop_words = set(stopwords.words("english"))
            except LookupError:
                nltk.download("stopwords", quiet=True)
                self._stop_words = set(stopwords.words("english"))
        return self._stop_words

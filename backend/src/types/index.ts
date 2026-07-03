export interface ClusterResponse {
  id: string;
  label: string;
  articleCount: number;
  startTime: string;
  endTime: string;
}

export interface ClusterDetailResponse extends ClusterResponse {
  articles: ArticleResponse[];
}

export interface ArticleResponse {
  id: string;
  title: string;
  url: string;
  source: string;
  sourceLabel: string;
  summary: string;
  publishedAt: string;
}

export interface TimelineItem {
  id: string;
  label: string;
  startTime: string;
  endTime: string;
  articleCount: number;
  intensity: number;
}

export interface JobStatusResponse {
  id: string;
  status: string;
  startedAt: string | null;
  completedAt: string | null;
  error: string | null;
}

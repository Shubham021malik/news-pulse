export interface Cluster {
  id: string;
  label: string;
  articleCount: number;
  startTime: string;
  endTime: string;
}

export interface Article {
  id: string;
  title: string;
  url: string;
  source: string;
  sourceLabel: string;
  summary: string;
  publishedAt: string;
}

export interface ClusterDetail extends Cluster {
  articles: Article[];
}

export interface TimelineItem extends Cluster {
  intensity: number;
}

export interface Source {
  source: string;
  sourceLabel: string;
}

export interface JobStatus {
  id: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  startedAt: string | null;
  completedAt: string | null;
  error: string | null;
}

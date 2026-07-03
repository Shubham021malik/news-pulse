import axios from 'axios';
import { Cluster, ClusterDetail, TimelineItem, Source, JobStatus } from '@/types';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api',
  timeout: 30000,
});

export const fetchClusters = async (source?: string): Promise<Cluster[]> => {
  const { data } = await api.get<Cluster[]>('/clusters', { params: source ? { source } : {} });
  return data;
};

export const fetchClusterDetail = async (id: string): Promise<ClusterDetail> => {
  const { data } = await api.get<ClusterDetail>(`/clusters/${id}`, { timeout: 60000 });
  return data;
};

export const fetchTimeline = async (source?: string): Promise<TimelineItem[]> => {
  const { data } = await api.get<TimelineItem[]>('/timeline', { params: source ? { source } : {} });
  return data;
};

export const fetchSources = async (): Promise<Source[]> => {
  const { data } = await api.get<Source[]>('/sources');
  return data;
};

export const triggerIngest = async (): Promise<{ id: string }> => {
  const { data } = await api.post<{ id: string }>('/ingest/trigger');
  return data;
};

export const fetchJobStatus = async (jobId: string): Promise<JobStatus> => {
  const { data } = await api.get<JobStatus>(`/ingest/status/${jobId}`);
  return data;
};

export async function pollForJob(jobId: string, timeoutMs = 120000): Promise<void> {
  const startTime = Date.now();
  let consecutiveErrors = 0;

  while (Date.now() - startTime < timeoutMs) {
    await new Promise((r) => setTimeout(r, 3000));
    const status = await fetchJobStatus(jobId).catch(() => null);

    if (status === null) {
      if (++consecutiveErrors >= 10) throw new Error('Cannot reach the backend server.');
      continue;
    }

    consecutiveErrors = 0;
    if (status.status === 'completed') return;
    if (status.status === 'failed') throw new Error(status.error || 'Ingest pipeline failed');
  }

  throw new Error('Ingest timed out.');
}

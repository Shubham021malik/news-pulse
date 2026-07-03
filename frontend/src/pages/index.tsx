import { useState, useEffect, useCallback } from 'react';
import { Cluster, ClusterDetail, Source, TimelineItem } from '@/types';
import {
  fetchClusters,
  fetchClusterDetail,
  fetchTimeline,
  fetchSources,
  triggerIngest,
  pollForJob,
} from '@/services/api';
import Layout from '@/components/Layout';
import Timeline from '@/components/Timeline';
import ClusterDetailPanel from '@/components/ClusterDetail';
import SourceFilter from '@/components/SourceFilter';
import RefreshButton from '@/components/RefreshButton';
import LoadingState from '@/components/LoadingState';
import ErrorState from '@/components/ErrorState';
import Spinner from '@/components/Spinner';

export default function Home() {
  const [clusters, setClusters] = useState<Cluster[]>([]);
  const [selectedCluster, setSelectedCluster] = useState<ClusterDetail | null>(null);
  const [loadingClusterId, setLoadingClusterId] = useState<string | null>(null);
  const [timelineData, setTimelineData] = useState<TimelineItem[]>([]);
  const [sources, setSources] = useState<Source[]>([]);
  const [selectedSource, setSelectedSource] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadData = useCallback(async (source?: string | null) => {
    setLoading(true);
    setError(null);
    try {
      const [clusterData, timeline] = await Promise.all([
        fetchClusters(source ?? undefined),
        fetchTimeline(source ?? undefined),
      ]);
      setClusters(clusterData);
      setTimelineData(timeline);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(selectedSource); }, [selectedSource, loadData]);
  useEffect(() => { fetchSources().then(setSources).catch(() => {}); }, []);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    setError(null);
    try {
      const { id } = await triggerIngest();
      await pollForJob(id);
      await loadData(selectedSource);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Refresh failed');
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleSelectCluster = async (id: string) => {
    const cluster = clusters.find((c) => c.id === id);
    if (!cluster) return;
    setLoadingClusterId(id);
    try {
      setSelectedCluster(await fetchClusterDetail(id));
    } catch {
      setSelectedCluster({ ...cluster, articles: [] });
    } finally {
      setLoadingClusterId(null);
    }
  };

  return (
    <Layout>
      <div className="space-y-5">
        <div className="flex items-center justify-between gap-4">
          <SourceFilter sources={sources} selectedSource={selectedSource} onChange={setSelectedSource} />
          <RefreshButton onRefresh={handleRefresh} loading={isRefreshing} />
        </div>

        {error && <ErrorState message={error} onRetry={() => loadData(selectedSource)} />}

        {loading && timelineData.length === 0 && !error && (
          <LoadingState message="Loading news clusters..." />
        )}

        {isRefreshing && (
          <div className="flex items-center justify-center gap-2.5 py-3 bg-primary-50/80 rounded-lg border border-primary-100">
            <Spinner className="h-4 w-4" />
            <p className="text-sm font-medium text-primary-700">Fetching latest news...</p>
          </div>
        )}

        {(!loading || timelineData.length > 0) && !error && (
          <Timeline
            data={timelineData}
            onSelectCluster={handleSelectCluster}
            loading={loading}
            loadingClusterId={loadingClusterId}
          />
        )}

        {selectedCluster && !loadingClusterId && (
          <ClusterDetailPanel cluster={selectedCluster} onClose={() => setSelectedCluster(null)} />
        )}
      </div>
    </Layout>
  );
}

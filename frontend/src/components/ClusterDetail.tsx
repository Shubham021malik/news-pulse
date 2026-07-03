import { ClusterDetail as ClusterDetailType } from '@/types';
import { formatDateTime } from '@/utils/date';

interface ClusterDetailProps {
  cluster: ClusterDetailType | null;
  onClose: () => void;
}

const SOURCE_BADGES: Record<string, { bg: string; text: string }> = {
  bbc: { bg: 'bg-red-100', text: 'text-red-700' },
  npr: { bg: 'bg-purple-100', text: 'text-purple-700' },
  guardian: { bg: 'bg-blue-100', text: 'text-blue-700' },
};

function getSourceStyle(source: string) {
  return SOURCE_BADGES[source.toLowerCase()] || { bg: 'bg-gray-100', text: 'text-gray-700' };
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").trim();
}

function truncate(text: string, max: number): string {
  return text.length > max ? text.slice(0, max) + '...' : text;
}

export default function ClusterDetail({ cluster, onClose }: ClusterDetailProps) {
  if (!cluster) return null;

  const sortedArticles = [...(cluster.articles || [])].sort(
    (a, b) => new Date(a.publishedAt).getTime() - new Date(b.publishedAt).getTime()
  );

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-xl bg-white shadow-2xl overflow-y-auto">
        <div className="sticky top-0 bg-white/95 backdrop-blur border-b border-gray-200 px-6 py-4 flex items-start justify-between z-10">
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-bold text-gray-900">{cluster.label}</h2>
            <p className="text-sm text-gray-500 mt-0.5">
              {cluster.articleCount} article{cluster.articleCount !== 1 ? 's' : ''}
            </p>
          </div>
          <button
            onClick={onClose}
            className="ml-4 p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors flex-shrink-0"
          >
            <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="px-6 py-4 space-y-4">
          {sortedArticles.map((article) => {
            const style = getSourceStyle(article.source);
            const cleanSummary = article.summary ? truncate(stripHtml(article.summary), 250) : '';
            return (
              <article key={article.id} className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-center gap-2 mb-3">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${style.bg} ${style.text}`}>
                    {article.sourceLabel || article.source}
                  </span>
                  <span className="text-xs text-gray-400">{formatDateTime(article.publishedAt)}</span>
                </div>
                <a
                  href={article.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm font-semibold text-gray-900 hover:text-primary-600 leading-snug block mb-2"
                >
                  {article.title}
                </a>
                {cleanSummary && (
                  <p className="text-xs text-gray-500 leading-relaxed">{cleanSummary}</p>
                )}
              </article>
            );
          })}
        </div>
      </div>
    </div>
  );
}

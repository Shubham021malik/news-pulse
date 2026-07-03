import { useMemo, useState, useEffect, useCallback } from 'react';
import { TimelineItem } from '@/types';
import { formatDate, formatDateTime, getDuration } from '@/utils/date';

interface TimelineProps {
  data: TimelineItem[];
  onSelectCluster: (id: string) => void;
  loading: boolean;
  loadingClusterId?: string | null;
}

const COLORS = [
  '#3b82f6', '#10b981', '#8b5cf6', '#f59e0b', '#ef4444',
  '#06b6d4', '#f97316', '#14b8a6', '#ec4899', '#6366f1',
];

interface Lane { items: TimelineItem[] }

function assignLanes(items: TimelineItem[]): Lane[] {
  const lanes: Lane[] = [];
  for (const item of items) {
    const start = new Date(item.startTime).getTime();
    let placed = false;
    for (const lane of lanes) {
      if (start >= new Date(lane.items[lane.items.length - 1].endTime).getTime()) {
        lane.items.push(item);
        placed = true;
        break;
      }
    }
    if (!placed) lanes.push({ items: [item] });
  }
  return lanes;
}

export default function Timeline({ data, onSelectCluster, loading, loadingClusterId }: TimelineProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  const sorted = useMemo(
    () => [...data].sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()),
    [data]
  );

  const timeRange = useMemo(() => {
    if (sorted.length === 0) return { min: 0, max: 0 };
    const starts = sorted.map((d) => new Date(d.startTime).getTime());
    const ends = sorted.map((d) => new Date(d.endTime).getTime());
    return { min: Math.min(...starts), max: Math.max(...ends) };
  }, [sorted]);

  const lanes = useMemo(() => [...assignLanes(sorted)].reverse(), [sorted]);

  const handleMouseMove = useCallback((e: React.MouseEvent, item: TimelineItem) => {
    setHoveredId(item.id);
    setTooltipPos({ x: e.clientX, y: e.clientY });
  }, []);

  useEffect(() => {
    const onLeave = () => setHoveredId(null);
    document.addEventListener('mouseleave', onLeave);
    return () => document.removeEventListener('mouseleave', onLeave);
  }, []);

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="h-5 bg-gray-200 rounded w-24 animate-pulse mb-6" />
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex gap-2 items-center">
              <div
                className="h-7 rounded-md bg-gray-200 animate-pulse"
                style={{ width: `${30 + Math.random() * 40}%`, animationDelay: `${i * 0.1}s` }}
              />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-10 text-center">
        <svg className="h-12 w-12 text-gray-300 mx-auto mb-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <p className="text-gray-500 text-sm">No topics tracked yet.</p>
        <p className="text-gray-400 text-xs mt-1">Topics will appear here once news is fetched.</p>
      </div>
    );
  }

  const totalRange = timeRange.max - timeRange.min || 1;
  const TICK_COUNT = 6;
  const ticks = Array.from({ length: TICK_COUNT + 1 }, (_, i) => timeRange.min + (totalRange * i) / TICK_COUNT);

  const ROW_HEIGHT = 44;
  const BAR_HEIGHT = 28;
  const LANE_GAP = 4;
  const CHART_HEIGHT = lanes.length * (ROW_HEIGHT + LANE_GAP);

  const hoveredItem = hoveredId ? sorted.find((d) => d.id === hoveredId) : null;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-semibold text-gray-800">Timeline</h2>
        <span className="text-xs text-gray-400">
          {data.length} topic{data.length !== 1 ? 's' : ''} &middot; {formatDate(new Date(timeRange.min).toISOString())} — {formatDate(new Date(timeRange.max).toISOString())}
        </span>
      </div>

      <div className="relative mb-2">
        <div className="flex justify-between text-[10px] text-gray-400 font-medium">
          {ticks.map((tick, i) => (
            <span key={i}>{formatDate(new Date(tick).toISOString())}</span>
          ))}
        </div>
        <div className="mt-1 h-px bg-gray-200 relative">
          {ticks.map((tick, i) => (
            <div key={i} className="absolute top-0 w-px h-2 bg-gray-300" style={{ left: `${((tick - timeRange.min) / totalRange) * 100}%` }} />
          ))}
        </div>
      </div>

      <div className="relative overflow-x-auto" style={{ minHeight: CHART_HEIGHT + 8 }}>
        <div className="relative" style={{ minWidth: 600, height: CHART_HEIGHT }}>
          {ticks.map((tick, i) => (
            <div key={i} className="absolute top-0 bottom-0 w-px bg-gray-100" style={{ left: `${((tick - timeRange.min) / totalRange) * 100}%` }} />
          ))}

          {lanes.map((lane, laneIdx) =>
            lane.items.map((item) => {
              const startMs = new Date(item.startTime).getTime();
              const endMs = new Date(item.endTime).getTime();
              const leftPct = ((startMs - timeRange.min) / totalRange) * 100;
              const widthPct = Math.max(((endMs - startMs) / totalRange) * 100, 1.5);
              const color = COLORS[sorted.indexOf(item) % COLORS.length];
              const isHovered = hoveredId === item.id;
              const isLoading = loadingClusterId === item.id;
              const intensity = 0.4 + item.intensity * 0.6;

              return (
                <button
                  key={item.id}
                  onClick={() => onSelectCluster(item.id)}
                  onMouseMove={(e) => handleMouseMove(e, item)}
                  onMouseLeave={() => setHoveredId(null)}
                  className="absolute rounded-md cursor-pointer transition-all duration-150 flex items-center px-2 gap-1.5 group"
                  style={{
                    left: `${leftPct}%`,
                    width: `${widthPct}%`,
                    top: laneIdx * (ROW_HEIGHT + LANE_GAP),
                    height: BAR_HEIGHT,
                    backgroundColor: color,
                    opacity: isHovered || isLoading ? 1 : intensity,
                    boxShadow: isHovered ? `0 0 0 2px ${color}, 0 4px 12px ${color}44` : undefined,
                    zIndex: isHovered || isLoading ? 10 : 1,
                    transform: isHovered || isLoading ? 'scaleY(1.15)' : undefined,
                  }}
                  title={item.label}
                >
                  <span className="text-[11px] font-semibold text-white truncate drop-shadow-sm">
                    {item.label}
                  </span>
                  {isLoading && (
                    <svg className="animate-spin h-3 w-3 text-white ml-auto flex-shrink-0" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                  )}
                  <span className="text-[9px] text-white/80 font-medium whitespace-nowrap ml-auto hidden group-hover:inline">
                    {item.articleCount} articles
                  </span>
                </button>
              );
            })
          )}
        </div>
      </div>

      {hoveredItem && (
        <div
          className="fixed z-50 bg-gray-900 text-white rounded-lg px-3 py-2 text-xs shadow-xl pointer-events-none max-w-xs"
          style={{ left: tooltipPos.x + 12, top: tooltipPos.y - 10 }}
        >
          <p className="font-semibold mb-1">{hoveredItem.label}</p>
          <p className="text-gray-300">{hoveredItem.articleCount} article{hoveredItem.articleCount !== 1 ? 's' : ''}</p>
          <p className="text-gray-400 text-[10px] mt-0.5">
            {formatDateTime(hoveredItem.startTime)} → {formatDateTime(hoveredItem.endTime)}
          </p>
          <p className="text-gray-400 text-[10px]">Duration: {getDuration(hoveredItem.startTime, hoveredItem.endTime)}</p>
        </div>
      )}

      <div className="mt-4 pt-3 border-t border-gray-100">
        <p className="text-[10px] text-gray-400">
          Each bar = topic cluster. Width = time span. Opacity = relative article count. Click to explore.
        </p>
      </div>
    </div>
  );
}

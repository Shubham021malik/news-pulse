import { Source } from '@/types';

interface SourceFilterProps {
  sources: Source[];
  selectedSource: string | null;
  onChange: (source: string | null) => void;
}

function pillClass(active: boolean) {
  return `whitespace-nowrap px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
    active
      ? 'bg-primary-600 text-white shadow-sm'
      : 'bg-white text-gray-600 border border-gray-300 hover:bg-gray-50'
  }`;
}

export default function SourceFilter({ sources, selectedSource, onChange }: SourceFilterProps) {
  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-1">
      <button onClick={() => onChange(null)} className={pillClass(selectedSource === null)}>
        All Sources
      </button>
      {sources.map((s) => (
        <button key={s.source} onClick={() => onChange(s.source)} className={pillClass(selectedSource === s.source)}>
          {s.sourceLabel || s.source}
        </button>
      ))}
    </div>
  );
}

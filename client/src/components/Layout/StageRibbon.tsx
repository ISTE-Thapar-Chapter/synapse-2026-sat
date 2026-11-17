import React from 'react';
import { useStage } from '../../context/StageContext.js';
import { CheckCircle2, Radio } from 'lucide-react';
import { StageIdentifier } from '../../types/index.js';

interface StageMeta {
  id: StageIdentifier;
  name: string;
  step: number;
}

const STAGES: StageMeta[] = [
  { id: 'registration', name: '1. Registration', step: 1 },
  { id: 'cleaning', name: '2. Cleaning', step: 2 },
  { id: 'cleaning-leaderboard', name: '3. Leaderboard', step: 3 },
  { id: 'model-training', name: '4. Model Training', step: 4 },
  { id: 'ranking', name: '5. Ranking', step: 5 },
  { id: 'final-submission', name: '6. Final Company', step: 6 },
];

export const StageRibbon: React.FC = () => {
  const { activeStage } = useStage();

  const currentIdx = STAGES.findIndex((s) => s.id === activeStage);

  return (
    <div className="bg-white border-b border-mist px-4 py-3 shadow-xs">
      <div className="max-w-7xl mx-auto flex items-center justify-between overflow-x-auto no-scrollbar gap-2">
        {STAGES.map((s, idx) => {
          const isCurrent = s.id === activeStage;
          const isPassed = currentIdx > idx;

          return (
            <div
              key={s.id}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs whitespace-nowrap transition-colors ${
                isCurrent
                  ? 'bg-ink text-white font-semibold ring-1 ring-saffron shadow-sm'
                  : isPassed
                  ? 'text-emerald-800 bg-emerald-50/70'
                  : 'text-ink-muted bg-paper/50'
              }`}
            >
              {isPassed ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
              ) : isCurrent ? (
                <Radio className="w-3.5 h-3.5 text-saffron flex-shrink-0 animate-pulse" />
              ) : (
                <span className="w-3.5 h-3.5 rounded-full border border-mist-dark text-[10px] flex items-center justify-center text-ink-muted">
                  {s.step}
                </span>
              )}
              <span>{s.name}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

import { Badge } from '@nexora/ui';
import { Lock, Construction, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface ComingSoonProps {
  title: string;
  phase: number;
  description: string;
  plannedFeatures: string[];
}

export function ComingSoon({
  title,
  phase,
  description,
  plannedFeatures,
}: ComingSoonProps) {
  const navigate = useNavigate();

  return (
    <div className="mx-auto max-w-3xl py-12">
      <button
        onClick={() => navigate('/')}
        className="mb-6 flex items-center gap-2 text-xs font-medium text-neutral-400 hover:text-white transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Dashboard
      </button>

      <div className="rounded-2xl border border-[#1f2433] bg-[#0d0f17] p-8 text-center space-y-6">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-950/50 border border-indigo-500/30 text-indigo-400">
          <Lock className="h-8 w-8" />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-center gap-2">
            <Badge variant="warning">Coming in Phase {phase}</Badge>
            <Badge variant="outline">Strict Gating</Badge>
          </div>
          <h1 className="text-2xl font-bold text-white">{title}</h1>
          <p className="mx-auto max-w-lg text-sm text-neutral-400">
            {description}
          </p>
        </div>

        <div className="rounded-xl border border-[#1f2433] bg-[#131620]/60 p-6 text-left">
          <div className="flex items-center gap-2 text-xs font-semibold text-neutral-300 mb-3">
            <Construction className="h-4 w-4 text-amber-400" />
            <span>Planned Capabilities in Phase {phase}</span>
          </div>
          <ul className="grid grid-cols-1 gap-2 text-xs text-neutral-400 sm:grid-cols-2">
            {plannedFeatures.map((feat, i) => (
              <li key={i} className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-indigo-500" />
                <span>{feat}</span>
              </li>
            ))}
          </ul>
        </div>

        <p className="text-xs text-neutral-400">
          In adherence to the strict 10-phase master development prompt, this capability is
          intentionally locked until Phase {phase} is authorized by the user.
        </p>
      </div>
    </div>
  );
}


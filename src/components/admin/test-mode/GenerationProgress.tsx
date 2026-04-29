import React from 'react';
import { CheckCircle2, Circle, Loader2, XCircle, Ban, AlertTriangle, Unlock } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import type { GenerationStep } from './types';

interface GenerationProgressProps {
  steps: GenerationStep[];
  currentStep: number;
  visible: boolean;
  /** Optional: shown when set, allows admin to cancel a background job */
  onCancel?: () => void;
  /** Optional: shown above the progress bar to clarify the run is server-side */
  backgroundNotice?: boolean;
  /** Optional: shown when the job heartbeat is older than 3 minutes */
  isStale?: boolean;
  /** Optional: callback to force unlock a stale/dead job */
  onForceUnlock?: () => void;
}

const statusIcon: Record<GenerationStep['status'], React.ReactNode> = {
  pending: <Circle className="h-4 w-4 text-muted-foreground" />,
  running: <Loader2 className="h-4 w-4 animate-spin text-primary" />,
  done: <CheckCircle2 className="h-4 w-4 text-primary" />,
  error: <XCircle className="h-4 w-4 text-destructive" />,
};

const GenerationProgress: React.FC<GenerationProgressProps> = ({
  steps,
  currentStep,
  visible,
  onCancel,
  backgroundNotice,
  isStale,
  onForceUnlock,
}) => {
  if (!visible) return null;

  const doneCount = steps.filter((s) => s.status === 'done').length;
  const progressPercent = Math.round((doneCount / steps.length) * 100);

  return (
    <div className="space-y-3 p-4 rounded-lg border bg-card">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium">Progression de la génération</span>
        <div className="flex items-center gap-3">
          <span className="text-muted-foreground">{progressPercent}%</span>
          {onCancel && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-destructive hover:text-destructive"
              onClick={onCancel}
            >
              <Ban className="h-3.5 w-3.5 mr-1" />
              Annuler
            </Button>
          )}
        </div>
      </div>
      {isStale && (
        <div className="flex items-start gap-2 p-2 rounded-md bg-destructive/10 border border-destructive/30">
          <AlertTriangle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
          <div className="flex-1 space-y-2">
            <p className="text-xs text-destructive font-medium">
              Job potentiellement bloqué — aucun signal de vie depuis plus de 3 minutes.
            </p>
            {onForceUnlock && (
              <Button
                variant="outline"
                size="sm"
                className="h-7 px-2 text-xs"
                onClick={onForceUnlock}
              >
                <Unlock className="h-3.5 w-3.5 mr-1" />
                Forcer le déverrouillage
              </Button>
            )}
          </div>
        </div>
      )}
      {backgroundNotice && !isStale && (
        <p className="text-xs text-muted-foreground">
          La génération continue côté serveur. Vous pouvez fermer cet onglet et revenir plus tard.
        </p>
      )}
      <Progress value={progressPercent} className="h-2" />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
        {steps.map((step, i) => (
          <div
            key={i}
            className={`flex items-center gap-2 text-xs py-1 px-2 rounded ${
              i === currentStep ? 'bg-primary/5' : ''
            }`}
          >
            {statusIcon[step.status]}
            <span
              className={
                step.status === 'done'
                  ? 'text-muted-foreground line-through'
                  : step.status === 'error'
                  ? 'text-destructive'
                  : ''
              }
            >
              {step.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default GenerationProgress;

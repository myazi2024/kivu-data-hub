import React from 'react';
import { CheckCircle2, Loader2, XCircle, Circle, AlertTriangle } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { CLEANUP_STEPS } from './cleanupSteps';

interface Props {
  visible: boolean;
  /** When set: cleanup finished. Map step → rows deleted. */
  perStep?: Record<string, number> | null;
  failedStep?: string | null;
  /** Steps that hit the MAX_ITERATIONS safety ceiling — may still have rows. */
  truncatedSteps?: string[] | null;
}

const CleanupProgress: React.FC<Props> = ({
  visible,
  perStep = null,
  failedStep = null,
  truncatedSteps = null,
}) => {
  if (!visible) return null;
  const finished = perStep !== null;
  const total = perStep ? Object.values(perStep).reduce((a, b) => a + b, 0) : 0;
  const percent = finished ? 100 : 30; // indeterminate-ish during run
  const truncatedSet = new Set(truncatedSteps ?? []);

  return (
    <div className="space-y-3 p-4 rounded-lg border bg-card">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium">
          {finished
            ? failedStep
              ? `Purge interrompue à l'étape "${failedStep}"`
              : `Purge terminée — ${total} enregistrement(s) supprimé(s)`
            : 'Purge des données TEST en cours…'}
        </span>
        <span className="text-muted-foreground">{percent}%</span>
      </div>
      <Progress value={percent} className="h-2" />
      {truncatedSet.size > 0 && (
        <div className="flex items-start gap-2 text-xs p-2 rounded bg-warning/10 text-warning border border-warning/30">
          <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" aria-hidden="true" />
          <span>
            Plafond de sécurité atteint pour {truncatedSet.size} étape(s) — il
            reste probablement des données. Relancez la purge pour les éliminer.
          </span>
        </div>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-64 overflow-auto">
        {CLEANUP_STEPS.map((step) => {
          const deleted = perStep?.[step];
          const isFailed = failedStep === step;
          const isTruncated = truncatedSet.has(step);
          const isDone = finished && !isFailed;
          return (
            <div key={step} className="flex items-center gap-2 text-xs py-1 px-2 rounded">
              {isFailed ? (
                <XCircle className="h-4 w-4 text-destructive" />
              ) : isTruncated ? (
                <AlertTriangle className="h-4 w-4 text-warning" />
              ) : isDone ? (
                <CheckCircle2 className="h-4 w-4 text-primary" />
              ) : finished ? (
                <Circle className="h-4 w-4 text-muted-foreground" />
              ) : (
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
              )}
              <span
                className={
                  isFailed
                    ? 'text-destructive'
                    : isTruncated
                      ? 'text-warning'
                      : isDone
                        ? 'text-muted-foreground'
                        : ''
                }
              >
                {step}
                {typeof deleted === 'number' && deleted > 0 && (
                  <span className="ml-1 text-primary font-medium">({deleted})</span>
                )}
                {isTruncated && <span className="ml-1">⚠</span>}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default CleanupProgress;

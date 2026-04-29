import React from 'react';
import { CheckCircle2, Loader2, XCircle, Circle } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

export const CLEANUP_STEPS = [
  'permit_payments', 'permit_admin_actions', 'fraud_attempts', 'contributor_codes',
  'service_access', 'payment_transactions', 'invoices', 'contributions',
  'mutation_requests', 'subdivision_requests', 'land_disputes',
  'expertise_payments', 'expertise_requests', 'land_title_requests',
  'ownership_history', 'tax_history', 'boundary_history',
  'mortgage_payments', 'mortgages', 'building_permits', 'parcels',
  'generated_certificates', 'boundary_conflicts',
] as const;

interface Props {
  visible: boolean;
  /** When set: cleanup finished. Map step → rows deleted. */
  perStep?: Record<string, number> | null;
  failedStep?: string | null;
}

const CleanupProgress: React.FC<Props> = ({ visible, perStep = null, failedStep = null }) => {
  if (!visible) return null;
  const finished = perStep !== null;
  const total = perStep ? Object.values(perStep).reduce((a, b) => a + b, 0) : 0;
  const percent = finished ? 100 : 30; // indeterminate-ish during run

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
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-64 overflow-auto">
        {CLEANUP_STEPS.map((step) => {
          const deleted = perStep?.[step];
          const isFailed = failedStep === step;
          const isDone = finished && !isFailed;
          return (
            <div key={step} className="flex items-center gap-2 text-xs py-1 px-2 rounded">
              {isFailed ? (
                <XCircle className="h-4 w-4 text-destructive" />
              ) : isDone ? (
                <CheckCircle2 className="h-4 w-4 text-primary" />
              ) : finished ? (
                <Circle className="h-4 w-4 text-muted-foreground" />
              ) : (
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
              )}
              <span className={isFailed ? 'text-destructive' : isDone ? 'text-muted-foreground' : ''}>
                {step}
                {typeof deleted === 'number' && deleted > 0 && (
                  <span className="ml-1 text-primary font-medium">({deleted})</span>
                )}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default CleanupProgress;

import React, { useEffect, useState } from 'react';
import { CheckCircle2, CircleAlert, Loader2, Lightbulb } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { getSecurityLevel } from '@/lib/parcelSecurity';
import { useParcelSecurityReport, type SecurityCriterion } from '@/hooks/useOwnership';

export const SecurityScoreRing: React.FC<{ score: number; size?: number; onClick?: () => void }> = ({ score, size = 64, onClick }) => {
  const { label, colorVar } = getSecurityLevel(score);
  const stroke = size / 9;
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const [shown, setShown] = useState(0);
  useEffect(() => {
    const id = requestAnimationFrame(() => setShown(score));
    return () => cancelAnimationFrame(id);
  }, [score]);
  const ring = (
    <span className="relative inline-flex flex-col items-center gap-0.5">
      <svg width={size} height={size} className="-rotate-90" aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke} className="stroke-muted" />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke} strokeLinecap="round"
          stroke={`hsl(var(${colorVar}))`} strokeDasharray={circ} strokeDashoffset={circ * (1 - shown / 100)}
          className="transition-[stroke-dashoffset] duration-700 ease-out motion-reduce:transition-none" />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-sm font-bold text-foreground" style={{ height: size }}>{score}%</span>
      <span className="text-[10px] font-medium" style={{ color: `hsl(var(${colorVar}))` }}>{label}</span>
    </span>
  );
  if (!onClick) return ring;
  return (
    <button type="button" onClick={onClick} aria-label={`Niveau de sécurisation ${score} %, ${label}. Voir le détail`}
      className="rounded-xl p-1 transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
      {ring}
    </button>
  );
};

export const ParcelSecurityReportDialog: React.FC<{
  parcelId: string | null; parcelNumber?: string; onOpenChange: (o: boolean) => void; onComplete?: () => void;
}> = ({ parcelId, parcelNumber, onOpenChange, onComplete }) => {
  const { data, isLoading, error } = useParcelSecurityReport(parcelId);
  const applicable = (data?.criteria ?? []).filter((c) => c.applicable);
  const done = applicable.filter((c) => c.done);
  const todo = applicable.filter((c) => !c.done).sort((a, b) => b.weight - a.weight);
  return (
    <Dialog open={!!parcelId} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto rounded-2xl sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Bilan de sécurisation</DialogTitle>
          <DialogDescription>Parcelle {parcelNumber}</DialogDescription>
        </DialogHeader>
        {isLoading && <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>}
        {error && <p className="text-sm text-destructive">Impossible de charger le bilan.</p>}
        {data && (
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <SecurityScoreRing score={data.score} size={88} />
              <p className="text-xs text-muted-foreground">{done.length} critère(s) sur {applicable.length} remplis. Plus le score est élevé, mieux vos droits sur la parcelle sont documentés.</p>
            </div>
            {todo[0] && (
              <div className="flex gap-2 rounded-xl border border-border bg-muted/50 p-3 text-xs">
                <Lightbulb className="h-4 w-4 shrink-0 text-primary" />
                <span><strong>Prochaine étape recommandée :</strong> {todo[0].label} (+{todo[0].weight} pts).</span>
              </div>
            )}
            <CriteriaList title="À compléter" items={todo} done={false} />
            <CriteriaList title="Complétés" items={done} done />
            {todo.length > 0 && onComplete && (
              <Button className="w-full" onClick={onComplete}>Compléter les informations</Button>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

const CriteriaList: React.FC<{ title: string; items: SecurityCriterion[]; done: boolean }> = ({ title, items, done }) => {
  if (!items.length) return null;
  return (
    <div className="space-y-1.5">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title} ({items.length})</p>
      {items.map((c) => (
        <div key={c.key} className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm">
          {done ? <CheckCircle2 className="h-4 w-4 shrink-0" style={{ color: 'hsl(var(--security-high))' }} />
            : <CircleAlert className="h-4 w-4 shrink-0" style={{ color: 'hsl(var(--security-medium))' }} />}
          <span className="flex-1">{c.label}<span className="block text-[11px] text-muted-foreground">{c.theme}</span></span>
          <span className="text-xs text-muted-foreground">{c.weight} pts</span>
        </div>
      ))}
    </div>
  );
};

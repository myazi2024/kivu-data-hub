import React, { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { ArrowRight, Check, X } from 'lucide-react';
import { toast } from 'sonner';
import { useAdminCorrectionRequests, type CorrectionRequestRow } from '@/hooks/useCorrectionRequests';
import { getEditableField, formatFieldValue } from '@/lib/ccc/editableFieldsCatalog';

const STATUSES = [
  { value: 'pending', label: 'En attente' },
  { value: 'approved', label: 'Approuvées' },
  { value: 'rejected', label: 'Rejetées' },
  { value: 'cancelled', label: 'Annulées' },
];

/** Traitement admin des demandes de modification ciblées des contributions CCC. */
export const CCCCorrectionRequestsPanel: React.FC = () => {
  const [status, setStatus] = useState('pending');
  const { requests, loading, decide, deciding } = useAdminCorrectionRequests(status);
  const [rejectTarget, setRejectTarget] = useState<CorrectionRequestRow | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  const approve = async (r: CorrectionRequestRow) => {
    try {
      await decide({ id: r.id, decision: 'approved' });
      toast.success('Modification appliquée à la contribution et à la parcelle');
    } catch (e: any) {
      toast.error(e?.message ?? "Impossible d'appliquer la modification");
    }
  };

  const confirmReject = async () => {
    if (!rejectTarget) return;
    if (rejectionReason.trim().length < 5) {
      toast.error('Le motif de rejet doit contenir au moins 5 caractères');
      return;
    }
    try {
      await decide({ id: rejectTarget.id, decision: 'rejected', rejectionReason });
      toast.success('Demande rejetée');
      setRejectTarget(null);
      setRejectionReason('');
    } catch (e: any) {
      toast.error(e?.message ?? 'Impossible de rejeter la demande');
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold">Demandes de modification</h3>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="h-9 w-44 text-sm"><SelectValue /></SelectTrigger>
          <SelectContent>
            {STATUSES.map((s) => (
              <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin motion-reduce:animate-none rounded-full h-6 w-6 border-b-2 border-primary" />
        </div>
      ) : requests.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">Aucune demande dans cet état.</p>
      ) : (
        <div className="space-y-2">
          {requests.map((r) => (
            <div key={r.id} className="rounded-xl border p-3 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{r.parcel_number}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {new Date(r.created_at).toLocaleString('fr-FR')}
                  </p>
                </div>
                <Badge variant="secondary">{r.changes?.length ?? 0} donnée(s)</Badge>
              </div>

              <div className="space-y-1">
                {(r.changes ?? []).map((c) => {
                  const def = getEditableField(c.field);
                  return (
                    <div key={c.field} className="flex items-center gap-2 text-xs">
                      <span className="text-muted-foreground shrink-0">{c.label} :</span>
                      <span className="line-through text-muted-foreground truncate">
                        {def ? formatFieldValue(def, c.old_value) : c.old_value || '—'}
                      </span>
                      <ArrowRight className="h-3 w-3 shrink-0 text-muted-foreground" />
                      <span className="font-medium truncate">
                        {def ? formatFieldValue(def, c.new_value) : c.new_value || '—'}
                      </span>
                    </div>
                  );
                })}
              </div>

              <p className="text-xs text-muted-foreground">Motif : {r.reason}</p>
              {r.status === 'rejected' && r.rejection_reason && (
                <p className="text-xs text-destructive">Rejet : {r.rejection_reason}</p>
              )}

              {r.status === 'pending' && (
                <div className="flex gap-2">
                  <Button size="sm" className="h-8 text-xs" disabled={deciding} onClick={() => approve(r)}>
                    <Check className="h-3.5 w-3.5 mr-1" /> Approuver et appliquer
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 text-xs"
                    disabled={deciding}
                    onClick={() => setRejectTarget(r)}
                  >
                    <X className="h-3.5 w-3.5 mr-1" /> Rejeter
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <AlertDialog open={!!rejectTarget} onOpenChange={(o) => { if (!o) { setRejectTarget(null); setRejectionReason(''); } }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Rejeter la demande</AlertDialogTitle>
            <AlertDialogDescription>
              L'utilisateur sera notifié du motif. Aucune donnée ne sera modifiée.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Input
            value={rejectionReason}
            maxLength={500}
            onChange={(e) => setRejectionReason(e.target.value)}
            placeholder="Motif du rejet"
            className="h-9 text-sm"
          />
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={(e) => { e.preventDefault(); confirmReject(); }}>
              Confirmer le rejet
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default CCCCorrectionRequestsPanel;

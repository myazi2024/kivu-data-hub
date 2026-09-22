import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowRight, ClipboardList } from 'lucide-react';
import { toast } from 'sonner';
import { useCorrectionRequests } from '@/hooks/useCorrectionRequests';
import { getEditableField, formatFieldValue } from '@/lib/ccc/editableFieldsCatalog';

const STATUS_LABEL: Record<string, { label: string; variant: 'secondary' | 'default' | 'destructive' | 'outline' }> = {
  pending: { label: 'En attente', variant: 'secondary' },
  approved: { label: 'Approuvée', variant: 'default' },
  rejected: { label: 'Rejetée', variant: 'destructive' },
  cancelled: { label: 'Annulée', variant: 'outline' },
};

/** Suivi des demandes de modification ciblées de l'utilisateur. */
export const UserCorrectionRequests: React.FC = () => {
  const { requests, loading, cancelRequest, cancelling } = useCorrectionRequests();

  if (loading) {
    return (
      <div className="bg-background rounded-2xl border p-6 flex justify-center">
        <div className="animate-spin motion-reduce:animate-none rounded-full h-6 w-6 border-b-2 border-primary" />
      </div>
    );
  }

  if (requests.length === 0) return null;

  const handleCancel = async (id: string) => {
    try {
      await cancelRequest(id);
      toast.success('Demande annulée');
    } catch {
      toast.error("Impossible d'annuler cette demande");
    }
  };

  return (
    <div className="bg-background rounded-2xl shadow-sm border overflow-hidden mt-4">
      <div className="p-3 border-b flex items-center gap-2">
        <ClipboardList className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-semibold">Mes demandes de modification</h3>
      </div>
      <div className="p-3 space-y-2">
        {requests.map((r) => {
          const status = STATUS_LABEL[r.status] ?? STATUS_LABEL.pending;
          return (
            <div key={r.id} className="rounded-xl bg-muted/30 p-3 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-medium truncate">{r.parcel_number}</p>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge variant={status.variant}>{status.label}</Badge>
                  <span className="text-[10px] text-muted-foreground">
                    {new Date(r.created_at).toLocaleDateString('fr-FR')}
                  </span>
                </div>
              </div>

              <div className="space-y-1">
                {(r.changes ?? []).map((c) => {
                  const def = getEditableField(c.field);
                  return (
                    <div key={c.field} className="flex items-center gap-2 text-xs">
                      <span className="text-muted-foreground shrink-0">{c.label} :</span>
                      <span className="text-muted-foreground line-through truncate">
                        {def ? formatFieldValue(def, c.old_value) : c.old_value || 'Non renseigné'}
                      </span>
                      <ArrowRight className="h-3 w-3 text-muted-foreground shrink-0" />
                      <span className="font-medium truncate">
                        {def ? formatFieldValue(def, c.new_value) : c.new_value || 'Non renseigné'}
                      </span>
                    </div>
                  );
                })}
              </div>

              {r.status === 'rejected' && r.rejection_reason && (
                <p className="text-xs text-destructive">Motif du rejet : {r.rejection_reason}</p>
              )}

              {r.status === 'pending' && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs"
                  disabled={cancelling}
                  onClick={() => handleCancel(r.id)}
                >
                  Annuler la demande
                </Button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default UserCorrectionRequests;

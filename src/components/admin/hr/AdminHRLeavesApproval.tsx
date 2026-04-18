import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Check, X, ClipboardCheck, Loader2 } from 'lucide-react';
import { useHRLeaves } from '@/hooks/useHRLeaves';
import { useHREmployees } from '@/hooks/useHREmployees';

export const AdminHRLeavesApproval = () => {
  const { leaves, approveLeave, rejectLeave, isUpdating, isLoading } = useHRLeaves();
  const { employees } = useHREmployees();
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [reason, setReason] = useState('');

  const empName = (id: string) => {
    const e = employees.find((x: any) => x.id === id);
    return e ? `${e.first_name} ${e.last_name}` : id.slice(0, 8);
  };

  const pending = leaves.filter((l: any) => l.status === 'pending');

  const handleReject = async () => {
    if (!rejectingId) return;
    await rejectLeave(rejectingId, reason);
    setRejectingId(null);
    setReason('');
  };

  if (isLoading) return <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin" /></div>;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <ClipboardCheck className="h-4 w-4 text-primary" />
          Approbations en attente <Badge variant="secondary">{pending.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {pending.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-6">Aucune demande en attente</p>
        ) : (
          <div className="space-y-2">
            {pending.map((l: any) => (
              <div key={l.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 bg-muted/40 rounded">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{empName(l.employee_id)}</p>
                  <p className="text-xs text-muted-foreground">
                    {l.leave_type} · {l.start_date} → {l.end_date} ({l.days_count || '?'}j)
                  </p>
                  {l.reason && <p className="text-xs text-muted-foreground mt-1 italic">"{l.reason}"</p>}
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" disabled={isUpdating} onClick={() => approveLeave(l.id)}>
                    <Check className="h-3.5 w-3.5 mr-1" />Approuver
                  </Button>
                  <Button size="sm" variant="destructive" disabled={isUpdating} onClick={() => setRejectingId(l.id)}>
                    <X className="h-3.5 w-3.5 mr-1" />Refuser
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      <Dialog open={!!rejectingId} onOpenChange={(o) => !o && setRejectingId(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Motif du refus</DialogTitle></DialogHeader>
          <Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Expliquez la raison du refus…" rows={4} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectingId(null)}>Annuler</Button>
            <Button variant="destructive" onClick={handleReject} disabled={!reason.trim() || isUpdating}>
              Confirmer le refus
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default AdminHRLeavesApproval;

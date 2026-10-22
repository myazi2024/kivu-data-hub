import React, { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { FileText, KeyRound, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { CLAIM_STATUS_LABELS, decideOwnershipClaim, useAdminOwnershipClaims, type OwnershipClaim } from '@/hooks/useOwnership';
import { PROOF_LABELS, openProof } from '@/lib/ownership';

const AdminOwnershipClaims: React.FC = () => {
  const [status, setStatus] = useState('pending');
  const { data = [], isLoading } = useAdminOwnershipClaims(status);
  const qc = useQueryClient();
  const [busy, setBusy] = useState<string | null>(null);
  const [rejecting, setRejecting] = useState<OwnershipClaim | null>(null);
  const [approving, setApproving] = useState<OwnershipClaim | null>(null);
  const [reason, setReason] = useState('');

  const act = async (c: OwnershipClaim, action: 'in_review' | 'approve' | 'reject', r?: string) => {
    setBusy(c.id);
    try {
      await decideOwnershipClaim(c.id, action, r);
      toast.success(action === 'approve' ? 'Gestion transférée.' : action === 'reject' ? 'Revendication refusée.' : 'Prise en charge.');
      qc.invalidateQueries({ queryKey: ['admin-ownership-claims'] });
    } catch (e: any) {
      toast.error(e?.message || 'Action impossible');
    } finally {
      setBusy(null);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2"><KeyRound className="h-4 w-4 text-primary" /> Revendications de propriété</CardTitle>
        <p className="text-xs text-muted-foreground">Rattachement d'une contribution ou contestation d'une parcelle déjà gérée par un propriétaire.</p>
      </CardHeader>
      <CardContent className="space-y-3">
        <Tabs value={status} onValueChange={setStatus}>
          <TabsList className="flex-wrap h-auto">
            {['pending', 'in_review', 'approved', 'rejected', 'cancelled', 'all'].map((s) => (
              <TabsTrigger key={s} value={s} className="text-xs">{s === 'all' ? 'Toutes' : CLAIM_STATUS_LABELS[s as OwnershipClaim['status']]}</TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        {isLoading && <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />}
        {!isLoading && data.length === 0 && <p className="text-sm text-muted-foreground">Aucune revendication.</p>}
        {data.map((c) => {
          const docs = [...(c.identity_docs || []), ...(c.rights_docs || []), ...(c.exploitation_docs || [])];
          const open = c.status === 'pending' || c.status === 'in_review';
          return (
            <div key={c.id} className="rounded-xl border border-border p-3 space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm font-semibold text-foreground">{c.parcel_number}</p>
                <Badge variant={c.claim_type === 'contest' ? 'secondary' : 'outline'} className="text-[10px]">
                  {c.claim_type === 'contest' ? 'Contestation' : 'Rattachement de contribution'}
                </Badge>
                <Badge className="text-[10px]">{CLAIM_STATUS_LABELS[c.status]}</Badge>
                <span className="ml-auto text-[11px] text-muted-foreground">{new Date(c.created_at).toLocaleString('fr-FR')}</span>
              </div>
              {c.statement && <p className="text-xs text-foreground/80 whitespace-pre-wrap">{c.statement}</p>}
              {c.rejection_reason && <p className="text-xs text-destructive">Motif : {c.rejection_reason}</p>}
              <div className="flex flex-wrap gap-1">
                {docs.map((d) => (
                  <Button key={d.path} size="sm" variant="outline" className="h-6 px-2 text-[10px]" onClick={() => openProof(d.path).catch(() => toast.error('Document indisponible'))}>
                    <FileText className="h-3 w-3 mr-1" />{PROOF_LABELS[d.kind] ?? d.kind}
                  </Button>
                ))}
              </div>
              {open && (
                <div className="flex flex-wrap gap-2">
                  {c.status === 'pending' && <Button size="sm" variant="outline" disabled={busy === c.id} onClick={() => act(c, 'in_review')}>Prendre en charge</Button>}
                  <Button size="sm" disabled={busy === c.id} onClick={() => setApproving(c)}>Approuver</Button>
                  <Button size="sm" variant="destructive" disabled={busy === c.id} onClick={() => { setReason(''); setRejecting(c); }}>Refuser</Button>
                </div>
              )}
            </div>
          );
        })}
      </CardContent>

      <AlertDialog open={!!approving} onOpenChange={(o) => !o && setApproving(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Transférer la gestion de {approving?.parcel_number} ?</AlertDialogTitle>
            <AlertDialogDescription>
              Le demandeur deviendra le propriétaire de compte de la parcelle{approving?.claim_type === 'contest' ? " ; l'ancien titulaire sera prévenu" : ''}. Les autres revendications en cours seront refusées.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={() => { const c = approving!; setApproving(null); act(c, 'approve'); }}>Approuver</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!rejecting} onOpenChange={(o) => !o && setRejecting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Refuser la revendication</AlertDialogTitle>
            <AlertDialogDescription>Le motif sera envoyé au demandeur.</AlertDialogDescription>
          </AlertDialogHeader>
          <Textarea rows={3} maxLength={1500} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Motif du refus (5 caractères minimum)" />
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction disabled={reason.trim().length < 5} onClick={() => { const c = rejecting!; setRejecting(null); act(c, 'reject', reason); }}>Refuser</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
};

export default AdminOwnershipClaims;

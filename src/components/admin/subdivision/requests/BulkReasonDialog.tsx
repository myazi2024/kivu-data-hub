import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  action: 'approve' | 'reject' | 'return' | null;
  count: number;
  processing: boolean;
  onConfirm: (payload: { reason?: string; processingFee?: number; notes?: string }) => void;
}

export function BulkReasonDialog({ open, onOpenChange, action, count, processing, onConfirm }: Props) {
  const [reason, setReason] = useState('');
  const [fee, setFee] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (open) { setReason(''); setFee(''); setNotes(''); }
  }, [open]);

  if (!action) return null;

  const titles = {
    approve: `Approuver ${count} demande(s)`,
    reject: `Rejeter ${count} demande(s)`,
    return: `Renvoyer ${count} demande(s) pour correction`,
  } as const;

  const submit = () => {
    if (action === 'reject' && !reason.trim()) return;
    if (action === 'return' && !reason.trim()) return;
    if (action === 'approve') {
      const f = parseFloat(fee);
      if (isNaN(f) || f < 0) return;
      onConfirm({ processingFee: f, notes: notes || undefined });
    } else {
      onConfirm({ reason, notes: notes || undefined });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{titles[action]}</DialogTitle>
          <DialogDescription>
            Cette action sera appliquée à toutes les demandes sélectionnées.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          {action === 'approve' && (
            <div className="space-y-1">
              <Label>Frais de traitement (USD) appliqué à chaque demande</Label>
              <Input type="number" step="0.01" min="0" value={fee} onChange={(e) => setFee(e.target.value)} />
            </div>
          )}
          {(action === 'reject' || action === 'return') && (
            <div className="space-y-1">
              <Label>Motif {action === 'reject' ? 'du rejet' : 'du renvoi'} (obligatoire)</Label>
              <Textarea rows={3} value={reason} onChange={(e) => setReason(e.target.value)} />
            </div>
          )}
          <div className="space-y-1">
            <Label>Notes internes (optionnel)</Label>
            <Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={processing}>Annuler</Button>
          <Button onClick={submit} disabled={processing}>
            {processing && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Confirmer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Trash2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

/**
 * Admin-only button that triggers `purge_test_billing_data` RPC.
 * Requires typing "PURGE" to confirm.
 */
const PurgeTestDataButton = ({ onDone }: { onDone?: () => void }) => {
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  const handlePurge = async () => {
    if (confirm !== 'PURGE') return;
    setLoading(true);
    const { data, error } = await (supabase as any).rpc('purge_test_billing_data', {
      p_reason: 'manual_admin_purge',
    });
    setLoading(false);
    if (error) {
      toast.error(`Échec de la purge: ${error.message}`);
      return;
    }
    const result = (data ?? {}) as { archived_invoices?: number; archived_transactions?: number };
    toast.success(
      `Purge OK — ${result.archived_invoices ?? 0} factures et ${
        result.archived_transactions ?? 0
      } transactions archivées.`,
    );
    setOpen(false);
    setConfirm('');
    onDone?.();
  };

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 text-xs text-destructive">
          <Trash2 className="h-3 w-3 mr-1" />
          Purger TEST
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Purger les données de test ?</AlertDialogTitle>
          <AlertDialogDescription className="space-y-2">
            <span className="block">
              Cette action archive et supprime définitivement les factures dont le numéro de
              parcelle commence par <code>TEST-</code> ou dont l'email client contient{' '}
              <code>test</code> / <code>example.com</code>, ainsi que toutes les transactions
              de paiement marquées TEST/SIMULATION.
            </span>
            <span className="block">
              Les données archivées restent disponibles dans <code>archived_invoices</code> et{' '}
              <code>archived_transactions</code>.
            </span>
            <span className="block font-medium">
              Tapez <code className="bg-muted px-1">PURGE</code> pour confirmer :
            </span>
            <Input
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="PURGE"
              className="h-8 text-xs"
            />
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Annuler</AlertDialogCancel>
          <AlertDialogAction
            disabled={confirm !== 'PURGE' || loading}
            onClick={(e) => {
              e.preventDefault();
              handlePurge();
            }}
          >
            {loading ? 'Purge en cours…' : 'Purger définitivement'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default PurgeTestDataButton;

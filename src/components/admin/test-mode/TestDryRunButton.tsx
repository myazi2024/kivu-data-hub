import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Eye, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';

interface DryRunResult {
  per_step: Record<string, number>;
  total: number;
  partial?: boolean;
  error?: string;
  computed_at?: string;
}

/**
 * Triggers `count_test_data_to_cleanup()` to preview a purge without deleting.
 * Renders the per-step counts in a dialog so admins can validate the impact
 * before confirming a destructive cleanup.
 */
const TestDryRunButton: React.FC<{ disabled?: boolean }> = ({ disabled }) => {
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<DryRunResult | null>(null);
  const [open, setOpen] = useState(false);

  const run = async () => {
    setBusy(true);
    try {
      const { data, error } = await supabase.rpc('count_test_data_to_cleanup');
      if (error) throw new Error(error.message);
      const payload = (data ?? { per_step: {}, total: 0 }) as unknown as DryRunResult;
      setResult(payload);
      setOpen(true);
      if (payload.partial) {
        toast.warning('Simulation partielle', { description: payload.error ?? 'Certaines étapes ont échoué' });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur inconnue';
      toast.error('Échec de la simulation', { description: message });
    } finally {
      setBusy(false);
    }
  };

  const entries = result ? Object.entries(result.per_step).sort((a, b) => b[1] - a[1]) : [];

  return (
    <>
      <Button variant="outline" onClick={run} disabled={busy || disabled}>
        {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Eye className="mr-2 h-4 w-4" />}
        Simuler la purge
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Simulation de purge — aucune donnée supprimée</DialogTitle>
            <DialogDescription>
              Aperçu du nombre d'enregistrements TEST qui seraient supprimés à chaque étape de la purge serveur.
            </DialogDescription>
          </DialogHeader>
          {result && (
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b pb-2">
                <span className="text-sm font-medium">Total à supprimer</span>
                <Badge variant={result.total > 0 ? 'default' : 'secondary'}>{result.total}</Badge>
              </div>
              <div className="max-h-72 overflow-y-auto space-y-1.5">
                {entries.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">Aucune donnée test détectée.</p>
                )}
                {entries.map(([step, count]) => (
                  <div key={step} className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{step}</span>
                    <Badge variant={count > 0 ? 'outline' : 'secondary'} className="font-mono">
                      {count}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Fermer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default TestDryRunButton;

import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { Loader2, ShieldCheck } from 'lucide-react';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called when AAL2 has been reached. */
  onSuccess?: () => void;
  /** Optional context label shown to the user (e.g. "Suppression d'un utilisateur"). */
  reason?: string;
}

/**
 * Prompts the user for a TOTP code to elevate the current session from aal1 → aal2.
 * Used as a guard before sensitive admin actions.
 */
export const MfaChallengeDialog: React.FC<Props> = ({ open, onOpenChange, onSuccess, reason }) => {
  const { toast } = useToast();
  const [factorId, setFactorId] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [bootstrapping, setBootstrapping] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setCode('');
      setError(null);
      return;
    }
    let cancelled = false;
    (async () => {
      setBootstrapping(true);
      try {
        const { data, error } = await supabase.auth.mfa.listFactors();
        if (error) throw error;
        const verified = (data?.totp || []).find((f) => f.status === 'verified');
        if (!verified) {
          setError('Aucun facteur 2FA actif. Activez la 2FA depuis votre compte avant de continuer.');
        } else if (!cancelled) {
          setFactorId(verified.id);
        }
      } catch (err: any) {
        if (!cancelled) setError(err.message || 'Impossible de charger les facteurs 2FA.');
      } finally {
        if (!cancelled) setBootstrapping(false);
      }
    })();
    return () => { cancelled = true; };
  }, [open]);

  const verify = async () => {
    if (!factorId || code.length !== 6) return;
    setLoading(true);
    try {
      const { data: chData, error: chErr } = await supabase.auth.mfa.challenge({ factorId });
      if (chErr) throw chErr;
      const { error: vErr } = await supabase.auth.mfa.verify({
        factorId,
        challengeId: chData.id,
        code,
      });
      if (vErr) throw vErr;
      toast({ title: '2FA validée', description: 'Action sensible débloquée.' });
      onSuccess?.();
      onOpenChange(false);
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Code invalide', description: err.message || 'Veuillez réessayer.' });
      setCode('');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            Vérification 2FA requise
          </DialogTitle>
          <DialogDescription>
            {reason
              ? `Cette action sensible (${reason}) nécessite une validation par code à 6 chiffres.`
              : 'Veuillez confirmer votre identité via votre application d\'authentification.'}
          </DialogDescription>
        </DialogHeader>

        {bootstrapping ? (
          <div className="flex justify-center py-6">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : error ? (
          <div className="py-4 text-sm text-destructive">{error}</div>
        ) : (
          <div className="space-y-4">
            <div className="flex justify-center">
              <InputOTP maxLength={6} value={code} onChange={setCode} autoFocus>
                <InputOTPGroup>
                  {[0, 1, 2, 3, 4, 5].map((i) => (
                    <InputOTPSlot key={i} index={i} />
                  ))}
                </InputOTPGroup>
              </InputOTP>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>Annuler</Button>
              <Button onClick={verify} disabled={loading || code.length !== 6}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Valider
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default MfaChallengeDialog;

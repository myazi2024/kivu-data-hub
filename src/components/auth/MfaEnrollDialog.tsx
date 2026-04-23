import { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { Loader2, ShieldCheck, Copy, Check } from 'lucide-react';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called once enrollment is verified successfully. */
  onEnrolled?: () => void;
}

/**
 * MFA TOTP enrollment flow:
 *   1. enroll → returns secret + otpauth URI (rendered as QR)
 *   2. user scans with authenticator (Google Authenticator, 1Password…)
 *   3. user enters 6-digit code → challenge + verify
 */
export const MfaEnrollDialog: React.FC<Props> = ({ open, onOpenChange, onEnrolled }) => {
  const { toast } = useToast();
  const [step, setStep] = useState<'init' | 'scan' | 'verify' | 'done'>('init');
  const [factorId, setFactorId] = useState<string | null>(null);
  const [qrSvgUrl, setQrSvgUrl] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [friendlyName, setFriendlyName] = useState('Authenticator');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const enrollAbortedRef = useRef<string | null>(null);

  // Cleanup unverified factor on close
  useEffect(() => {
    if (!open && enrollAbortedRef.current) {
      const id = enrollAbortedRef.current;
      enrollAbortedRef.current = null;
      supabase.auth.mfa.unenroll({ factorId: id }).catch(() => {});
    }
  }, [open]);

  // Reset state when reopened
  useEffect(() => {
    if (open) {
      setStep('init');
      setFactorId(null);
      setQrSvgUrl(null);
      setSecret(null);
      setCode('');
      setFriendlyName('Authenticator');
      setCopied(false);
    }
  }, [open]);

  const startEnroll = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: 'totp',
        friendlyName: friendlyName || `Authenticator ${new Date().toLocaleDateString()}`,
      });
      if (error) throw error;
      setFactorId(data.id);
      enrollAbortedRef.current = data.id;
      setSecret(data.totp.secret);
      // Render the otpauth URI to a data URL QR code
      const dataUrl = await QRCode.toDataURL(data.totp.uri, { width: 240, margin: 1 });
      setQrSvgUrl(dataUrl);
      setStep('scan');
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Erreur', description: err.message || 'Impossible de démarrer l\'enrôlement.' });
    } finally {
      setLoading(false);
    }
  };

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
      enrollAbortedRef.current = null;
      setStep('done');
      toast({ title: '2FA activée', description: 'Votre application sera désormais demandée.' });
      onEnrolled?.();
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Code invalide', description: err.message || 'Veuillez réessayer.' });
    } finally {
      setLoading(false);
    }
  };

  const copySecret = async () => {
    if (!secret) return;
    try {
      await navigator.clipboard.writeText(secret);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // ignore
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            Activer l'authentification à deux facteurs
          </DialogTitle>
          <DialogDescription>
            Renforcez la sécurité de votre compte avec un code à 6 chiffres généré par une application d'authentification.
          </DialogDescription>
        </DialogHeader>

        {step === 'init' && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="friendly-name" className="text-xs">Nom du facteur</Label>
              <Input
                id="friendly-name"
                value={friendlyName}
                onChange={(e) => setFriendlyName(e.target.value)}
                placeholder="Ex: Téléphone perso"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Vous aurez besoin d'une application telle que Google Authenticator, Microsoft Authenticator, 1Password ou Authy.
            </p>
            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>Annuler</Button>
              <Button onClick={startEnroll} disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Continuer
              </Button>
            </DialogFooter>
          </div>
        )}

        {step === 'scan' && (
          <div className="space-y-4">
            <div className="flex flex-col items-center gap-2">
              {qrSvgUrl && (
                <img
                  src={qrSvgUrl}
                  alt="QR code à scanner avec votre application d'authentification"
                  className="rounded-md border bg-background p-2"
                />
              )}
              <p className="text-[11px] text-muted-foreground">Ou saisissez ce secret manuellement :</p>
              <button
                type="button"
                onClick={copySecret}
                className="flex items-center gap-2 text-xs font-mono bg-muted px-2 py-1 rounded hover:bg-muted/80 transition-colors"
              >
                {secret}
                {copied ? <Check className="h-3 w-3 text-success" /> : <Copy className="h-3 w-3" />}
              </button>
            </div>
            <Button className="w-full" onClick={() => setStep('verify')}>J'ai scanné le code</Button>
          </div>
        )}

        {step === 'verify' && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-xs">Code à 6 chiffres</Label>
              <div className="flex justify-center">
                <InputOTP maxLength={6} value={code} onChange={setCode}>
                  <InputOTPGroup>
                    {[0, 1, 2, 3, 4, 5].map((i) => (
                      <InputOTPSlot key={i} index={i} />
                    ))}
                  </InputOTPGroup>
                </InputOTP>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setStep('scan')} disabled={loading}>Retour</Button>
              <Button onClick={verify} disabled={loading || code.length !== 6}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Vérifier
              </Button>
            </DialogFooter>
          </div>
        )}

        {step === 'done' && (
          <div className="space-y-4 text-center">
            <ShieldCheck className="h-12 w-12 text-success mx-auto" />
            <p className="text-sm">2FA activée avec succès. À votre prochaine connexion, votre code vous sera demandé.</p>
            <Button className="w-full" onClick={() => onOpenChange(false)}>Fermer</Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default MfaEnrollDialog;

import { useState, useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Lock, Shield, Smartphone, Eye, EyeOff, Check, X, Trash2, ShieldCheck } from "lucide-react";
import { validatePassword } from "@/lib/passwordPolicy";
import { useMfaStatus } from "@/hooks/useMfaStatus";
import { MfaEnrollDialog } from "@/components/auth/MfaEnrollDialog";
import { SENSITIVE_ROLES_LABEL_REQUIRED, isAdminRole } from "@/components/auth/mfaConstants";

export const UserAccountSecurity = () => {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const mfa = useMfaStatus();
  const [enrollOpen, setEnrollOpen] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const adminMustMfa = isAdminRole(profile?.role);

  const check = useMemo(() => validatePassword(newPassword), [newPassword]);
  const matches = newPassword.length > 0 && newPassword === confirmPassword;
  const canSubmit = check.valid && matches && !loading;

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (!check.valid) {
      toast({ variant: "destructive", title: "Mot de passe trop faible", description: check.problems.join(' • ') });
      return;
    }
    if (!matches) {
      toast({ variant: "destructive", title: "Erreur", description: "Les mots de passe ne correspondent pas." });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      toast({ title: "Mot de passe modifié" });
      setNewPassword("");
      setConfirmPassword("");
    } catch (error: any) {
      toast({ variant: "destructive", title: "Erreur", description: error.message });
    } finally {
      setLoading(false);
    }
  };

  const strengthColor =
    check.strength <= 1 ? 'bg-destructive' :
    check.strength === 2 ? 'bg-amber-500' :
    check.strength === 3 ? 'bg-yellow-500' : 'bg-green-500';
  const strengthLabel =
    check.strength <= 1 ? 'Très faible' :
    check.strength === 2 ? 'Faible' :
    check.strength === 3 ? 'Bon' : 'Fort';

  return (
    <div className="space-y-3">
      {/* Changer mot de passe */}
      <Card className="border-none shadow-md rounded-2xl">
        <CardContent className="p-3">
          <div className="flex items-center gap-2 mb-3">
            <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center">
              <Lock className="h-3.5 w-3.5 text-primary" />
            </div>
            <h3 className="text-sm font-semibold">Mot de passe</h3>
          </div>

          <form onSubmit={handlePasswordChange} className="space-y-2.5">
            <div className="space-y-1">
              <Label htmlFor="newPassword" className="text-[11px]">Nouveau mot de passe</Label>
              <div className="relative">
                <Input
                  id="newPassword"
                  type={showPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••••"
                  disabled={loading}
                  autoComplete="new-password"
                  className="h-9 text-sm pr-9 rounded-xl"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-9 w-9 p-0"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                >
                  {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                </Button>
              </div>
            </div>

            {/* Strength meter + checklist */}
            {newPassword.length > 0 && (
              <div className="space-y-1.5 px-0.5">
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all ${strengthColor}`}
                      style={{ width: `${(check.strength / 4) * 100}%` }}
                    />
                  </div>
                  <span className="text-[10px] text-muted-foreground">{strengthLabel}</span>
                </div>
                <ul className="text-[10px] space-y-0.5">
                  {[
                    { ok: newPassword.length >= 10, label: '10 caractères minimum' },
                    { ok: /[A-Z]/.test(newPassword) && /[a-z]/.test(newPassword), label: 'Majuscule + minuscule' },
                    { ok: /[0-9]/.test(newPassword), label: 'Au moins un chiffre' },
                    { ok: /[^A-Za-z0-9]/.test(newPassword), label: 'Au moins un caractère spécial' },
                  ].map((c) => (
                    <li key={c.label} className={`flex items-center gap-1 ${c.ok ? 'text-green-600' : 'text-muted-foreground'}`}>
                      {c.ok ? <Check className="h-2.5 w-2.5" /> : <X className="h-2.5 w-2.5" />}
                      <span>{c.label}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="space-y-1">
              <Label htmlFor="confirmPassword" className="text-[11px]">Confirmer</Label>
              <Input
                id="confirmPassword"
                type={showPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••••"
                disabled={loading}
                autoComplete="new-password"
                className="h-9 text-sm rounded-xl"
              />
              {confirmPassword.length > 0 && !matches && (
                <p className="text-[10px] text-destructive">Les mots de passe ne correspondent pas</p>
              )}
            </div>

            <Button
              type="submit"
              disabled={!canSubmit}
              size="sm"
              className="w-full h-9 rounded-xl text-xs"
            >
              {loading && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin motion-reduce:animate-none" />}
              Changer le mot de passe
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* 2FA */}
      <Card className="border-none shadow-md rounded-2xl">
        <CardContent className="p-3">
          <div className="flex items-center justify-between mb-3 gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <div className={`h-7 w-7 rounded-lg flex items-center justify-center ${mfa.hasVerifiedFactor ? 'bg-success/10' : 'bg-muted'}`}>
                {mfa.hasVerifiedFactor
                  ? <ShieldCheck className="h-3.5 w-3.5 text-success" />
                  : <Shield className="h-3.5 w-3.5 text-muted-foreground" />}
              </div>
              <div className="min-w-0">
                <h3 className="text-sm font-semibold flex items-center gap-1.5">
                  Authentification à deux facteurs
                  {mfa.hasVerifiedFactor && <Badge variant="default" className="text-[9px] h-4 px-1.5">Active</Badge>}
                </h3>
                <p className="text-[10px] text-muted-foreground truncate">
                  {adminMustMfa ? SENSITIVE_ROLES_LABEL_REQUIRED : 'Recommandée pour sécuriser votre compte'}
                </p>
              </div>
            </div>
            {!mfa.hasVerifiedFactor && (
              <Button size="sm" className="h-8 text-xs shrink-0" onClick={() => setEnrollOpen(true)} disabled={mfa.loading}>
                Activer
              </Button>
            )}
          </div>

          {mfa.loading ? (
            <div className="flex items-center gap-2 p-2.5 bg-muted/30 rounded-xl">
              <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
              <p className="text-[11px] text-muted-foreground">Chargement…</p>
            </div>
          ) : mfa.factors.length > 0 ? (
            <ul className="space-y-1.5">
              {mfa.factors.map((f) => (
                <li key={f.id} className="flex items-center justify-between gap-2 p-2 bg-muted/30 rounded-xl">
                  <div className="flex items-center gap-2 min-w-0">
                    <Smartphone className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <div className="min-w-0">
                      <div className="text-xs font-medium truncate">{f.friendly_name || 'Authenticator'}</div>
                      <div className="text-[10px] text-muted-foreground">
                        {f.status === 'verified' ? 'Vérifié' : 'En attente'} ·{' '}
                        {new Date(f.created_at).toLocaleDateString('fr-FR')}
                      </div>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0 text-destructive shrink-0"
                    disabled={removingId === f.id || (adminMustMfa && mfa.factors.filter((x) => x.status === 'verified').length === 1)}
                    title={adminMustMfa && mfa.factors.filter((x) => x.status === 'verified').length === 1
                      ? 'Vous devez conserver au moins un facteur 2FA actif (rôle administrateur).'
                      : 'Supprimer ce facteur'}
                    onClick={async () => {
                      setRemovingId(f.id);
                      try {
                        const { error } = await supabase.auth.mfa.unenroll({ factorId: f.id });
                        if (error) throw error;
                        toast({ title: 'Facteur supprimé' });
                        await mfa.refresh();
                      } catch (err: any) {
                        toast({ variant: 'destructive', title: 'Erreur', description: err.message });
                      } finally {
                        setRemovingId(null);
                      }
                    }}
                  >
                    {removingId === f.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                  </Button>
                </li>
              ))}
            </ul>
          ) : (
            <div className="flex items-center gap-2 p-2.5 bg-muted/30 rounded-xl">
              <Smartphone className="h-3.5 w-3.5 text-muted-foreground" />
              <p className="text-[11px] text-muted-foreground">
                Aucun facteur configuré. {adminMustMfa
                  ? 'Vous devez activer la 2FA pour accéder aux outils d\'administration.'
                  : 'Activez une application TOTP (Google Authenticator, 1Password…).'}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <MfaEnrollDialog
        open={enrollOpen}
        onOpenChange={setEnrollOpen}
        onEnrolled={() => mfa.refresh()}
      />
    </div>
  );
};

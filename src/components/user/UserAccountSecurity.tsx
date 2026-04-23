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
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

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
          <div className="flex items-center gap-2 mb-3">
            <div className="h-7 w-7 rounded-lg bg-muted flex items-center justify-center">
              <Shield className="h-3.5 w-3.5 text-muted-foreground" />
            </div>
            <div>
              <h3 className="text-sm font-semibold">Authentification à deux facteurs</h3>
              <p className="text-[10px] text-muted-foreground">Bientôt disponible</p>
            </div>
          </div>

          <div className="flex items-center gap-2 p-2.5 bg-muted/30 rounded-xl">
            <Smartphone className="h-3.5 w-3.5 text-muted-foreground" />
            <p className="text-[11px] text-muted-foreground">
              La 2FA (TOTP) sera activée prochainement. En attendant, utilisez un mot de passe fort.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

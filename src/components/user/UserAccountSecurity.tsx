import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Lock, Shield, Smartphone } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

export const UserAccountSecurity = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (newPassword !== confirmPassword) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Les mots de passe ne correspondent pas.",
      });
      return;
    }

    if (newPassword.length < 6) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Le mot de passe doit contenir au moins 6 caractères.",
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) throw error;

      toast({
        title: "Mot de passe modifié",
        description: "Votre mot de passe a été mis à jour avec succès.",
      });
      setNewPassword("");
      setConfirmPassword("");
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4 md:space-y-6">
      <Card>
        <CardHeader className="pb-3 px-4 md:px-6">
          <CardTitle className="flex items-center gap-2 text-base md:text-lg">
            <Lock className="h-4 w-4 md:h-5 md:w-5" />
            Changer le mot de passe
          </CardTitle>
          <CardDescription className="text-xs md:text-sm">Mettez à jour votre mot de passe</CardDescription>
        </CardHeader>
        <CardContent className="px-4 md:px-6">
          <form onSubmit={handlePasswordChange} className="space-y-3 md:space-y-4">
            <div className="space-y-1.5 md:space-y-2">
              <Label htmlFor="newPassword" className="text-xs md:text-sm">Nouveau mot de passe</Label>
              <Input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••"
                disabled={loading}
                className="text-sm"
              />
            </div>

            <div className="space-y-1.5 md:space-y-2">
              <Label htmlFor="confirmPassword" className="text-xs md:text-sm">Confirmer</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                disabled={loading}
                className="text-sm"
              />
            </div>

            <Button type="submit" disabled={loading} size="sm" className="w-full sm:w-auto">
              {loading && <Loader2 className="mr-2 h-3 w-3 md:h-4 md:w-4 animate-spin" />}
              <span className="text-xs md:text-sm">Changer</span>
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3 px-4 md:px-6">
          <CardTitle className="flex items-center gap-2 text-base md:text-lg">
            <Shield className="h-4 w-4 md:h-5 md:w-5" />
            Authentification 2FA
          </CardTitle>
          <CardDescription className="text-xs md:text-sm">Sécurisez votre compte</CardDescription>
        </CardHeader>
        <CardContent className="px-4 md:px-6">
          <Alert className="py-2 px-3">
            <Smartphone className="h-3 w-3 md:h-4 md:w-4" />
            <AlertDescription className="text-xs md:text-sm">
              Configuration bientôt disponible
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  );
};

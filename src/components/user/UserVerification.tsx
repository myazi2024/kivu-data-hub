import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Loader2, Mail, CheckCircle2, XCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

export const UserVerification = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const handleResendVerification = async () => {
    if (!user?.email) return;

    setLoading(true);
    try {
      const { error } = await supabase.auth.resend({
        type: "signup",
        email: user.email,
      });

      if (error) throw error;

      toast({
        title: "Email envoyé",
        description: "Un email de vérification a été envoyé à votre adresse.",
      });
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

  const isEmailConfirmed = user?.email_confirmed_at !== null;

  return (
    <Card>
      <CardHeader className="pb-3 px-4 md:px-6">
        <CardTitle className="text-base md:text-lg">Vérifications</CardTitle>
        <CardDescription className="text-xs md:text-sm">Statut de vérification</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 px-4 md:px-6">
        <div className="flex items-center justify-between p-3 md:p-4 border rounded-lg">
          <div className="flex items-center gap-2 md:gap-3 flex-1 min-w-0">
            <Mail className="h-4 w-4 md:h-5 md:w-5 text-muted-foreground flex-shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="text-xs md:text-sm font-medium">Email</p>
              <p className="text-[10px] md:text-xs text-muted-foreground truncate">{user?.email}</p>
            </div>
          </div>
          <div className="flex-shrink-0">
            {isEmailConfirmed ? (
              <Badge variant="default" className="bg-green-500 hover:bg-green-600 text-[10px] md:text-xs px-2 py-0.5">
                <CheckCircle2 className="h-2.5 w-2.5 md:h-3 md:w-3 mr-1" />
                <span className="hidden sm:inline">Vérifié</span>
                <span className="sm:hidden">OK</span>
              </Badge>
            ) : (
              <Badge variant="secondary" className="text-[10px] md:text-xs px-2 py-0.5">
                <XCircle className="h-2.5 w-2.5 md:h-3 md:w-3 mr-1" />
                <span className="hidden sm:inline">Non vérifié</span>
                <span className="sm:hidden">Non</span>
              </Badge>
            )}
          </div>
        </div>

        {!isEmailConfirmed && (
          <Alert className="py-2 px-3">
            <Mail className="h-3 w-3 md:h-4 md:w-4" />
            <AlertDescription className="text-xs md:text-sm">
              Email non vérifié. Vérifiez votre boîte de réception.
            </AlertDescription>
          </Alert>
        )}

        {!isEmailConfirmed && (
          <Button
            onClick={handleResendVerification}
            disabled={loading}
            variant="outline"
            size="sm"
            className="w-full sm:w-auto"
          >
            {loading && <Loader2 className="mr-2 h-3 w-3 md:h-4 md:w-4 animate-spin" />}
            <span className="text-xs md:text-sm">Renvoyer l'email</span>
          </Button>
        )}
      </CardContent>
    </Card>
  );
};

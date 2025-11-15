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
      <CardHeader>
        <CardTitle>Vérifications</CardTitle>
        <CardDescription>Statut de vérification de votre compte</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between p-4 border rounded-lg">
          <div className="flex items-center gap-3">
            <Mail className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="font-medium">Email</p>
              <p className="text-sm text-muted-foreground">{user?.email}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isEmailConfirmed ? (
              <Badge variant="default" className="bg-green-500 hover:bg-green-600">
                <CheckCircle2 className="h-3 w-3 mr-1" />
                Vérifié
              </Badge>
            ) : (
              <Badge variant="secondary">
                <XCircle className="h-3 w-3 mr-1" />
                Non vérifié
              </Badge>
            )}
          </div>
        </div>

        {!isEmailConfirmed && (
          <Alert>
            <Mail className="h-4 w-4" />
            <AlertDescription>
              Votre adresse email n'est pas encore vérifiée. Vérifiez votre boîte de réception.
            </AlertDescription>
          </Alert>
        )}

        {!isEmailConfirmed && (
          <Button
            onClick={handleResendVerification}
            disabled={loading}
            variant="outline"
            className="w-full sm:w-auto"
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Renvoyer l'email de vérification
          </Button>
        )}
      </CardContent>
    </Card>
  );
};

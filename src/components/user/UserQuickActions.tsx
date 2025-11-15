import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Share2, HelpCircle, Copy } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

export const UserQuickActions = () => {
  const { toast } = useToast();
  const { user } = useAuth();

  const referralLink = `${window.location.origin}/auth?ref=${user?.id}`;

  const handleCopyReferralLink = () => {
    navigator.clipboard.writeText(referralLink);
    toast({
      title: "Lien copié",
      description: "Le lien de parrainage a été copié dans le presse-papier.",
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Actions rapides</CardTitle>
        <CardDescription>Accès rapide aux fonctionnalités importantes</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="p-4 border rounded-lg space-y-3">
          <div className="flex items-center gap-2">
            <Share2 className="h-5 w-5 text-primary" />
            <div>
              <p className="font-medium">Lien de parrainage</p>
              <p className="text-sm text-muted-foreground">Partagez et gagnez des récompenses</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <code className="flex-1 text-xs bg-muted p-2 rounded overflow-x-auto">
              {referralLink}
            </code>
            <Button
              size="sm"
              variant="outline"
              onClick={handleCopyReferralLink}
            >
              <Copy className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <Link to="/contact">
          <Button variant="outline" className="w-full justify-start gap-2">
            <HelpCircle className="h-4 w-4" />
            Contacter le support
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
};

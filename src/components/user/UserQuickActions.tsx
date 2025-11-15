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
      <CardHeader className="pb-3 px-4 md:px-6">
        <CardTitle className="text-base md:text-lg">Actions rapides</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 md:space-y-3 px-4 md:px-6">
        <div className="p-3 md:p-4 border rounded-lg space-y-2 md:space-y-3">
          <div className="flex items-center gap-2">
            <Share2 className="h-4 w-4 md:h-5 md:w-5 text-primary flex-shrink-0" />
            <div>
              <p className="text-xs md:text-sm font-medium">Lien de parrainage</p>
              <p className="text-[10px] md:text-xs text-muted-foreground">Partagez et gagnez</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <code className="flex-1 text-[10px] md:text-xs bg-muted p-2 rounded overflow-x-auto">
              {referralLink}
            </code>
            <Button
              size="sm"
              variant="outline"
              onClick={handleCopyReferralLink}
              className="flex-shrink-0"
            >
              <Copy className="h-3 w-3 md:h-4 md:w-4" />
            </Button>
          </div>
        </div>

        <Link to="/contact">
          <Button variant="outline" size="sm" className="w-full justify-start gap-2">
            <HelpCircle className="h-3 w-3 md:h-4 md:w-4" />
            <span className="text-xs md:text-sm">Contacter le support</span>
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
};

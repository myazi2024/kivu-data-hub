import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, CreditCard, Award, Building } from "lucide-react";

export const UserQuickStats = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    contributions: 0,
    permits: 0,
    invoices: 0,
    cccCodes: 0,
  });

  useEffect(() => {
    if (!user) return;

    const fetchStats = async () => {
      try {
        const [contributions, permits, invoices, cccCodes] = await Promise.all([
          supabase
            .from("cadastral_contributions")
            .select("id", { count: "exact", head: true })
            .eq("user_id", user.id),
          supabase
            .from("cadastral_contributions")
            .select("id", { count: "exact", head: true })
            .eq("user_id", user.id)
            .not("permit_request_data", "is", null),
          supabase
            .from("cadastral_invoices")
            .select("id", { count: "exact", head: true })
            .eq("user_id", user.id),
          supabase
            .from("cadastral_contributor_codes")
            .select("id", { count: "exact", head: true })
            .eq("user_id", user.id),
        ]);

        setStats({
          contributions: contributions.count || 0,
          permits: permits.count || 0,
          invoices: invoices.count || 0,
          cccCodes: cccCodes.count || 0,
        });
      } catch (error) {
        console.error("Error fetching stats:", error);
        // Garder les stats à 0 en cas d'erreur
      }
    };

    fetchStats();
  }, [user]);

  const statItems = [
    {
      title: "Contributions",
      value: stats.contributions,
      icon: FileText,
      description: "Contributions cadastrales",
    },
    {
      title: "Permis",
      value: stats.permits,
      icon: Building,
      description: "Permis de construire",
    },
    {
      title: "Factures",
      value: stats.invoices,
      icon: CreditCard,
      description: "Factures générées",
    },
    {
      title: "Codes CCC",
      value: stats.cccCodes,
      icon: Award,
      description: "Codes contributeur",
    },
  ];

  return (
    <Card>
      <CardHeader className="pb-3 px-4 md:px-6">
        <CardTitle className="text-base md:text-lg">Aperçu rapide</CardTitle>
      </CardHeader>
      <CardContent className="px-4 md:px-6">
        <div className="grid grid-cols-2 gap-2 md:gap-3">
          {statItems.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.title}
                className="p-3 md:p-4 border rounded-lg hover:bg-accent/5 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <div className="p-1.5 md:p-2 rounded-lg bg-primary/10">
                    <Icon className="h-3 w-3 md:h-4 md:w-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-xl md:text-2xl font-bold">{item.value}</p>
                    <p className="text-[10px] md:text-xs text-muted-foreground">{item.title}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

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
      <CardHeader>
        <CardTitle>Aperçu rapide</CardTitle>
        <CardDescription>Vos statistiques en un coup d'œil</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          {statItems.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.title}
                className="p-4 border rounded-lg hover:bg-accent/5 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Icon className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{item.value}</p>
                    <p className="text-xs text-muted-foreground">{item.title}</p>
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

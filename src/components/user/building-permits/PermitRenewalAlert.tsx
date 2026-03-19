import { Bell, Calendar, RefreshCw, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { format, differenceInDays } from "date-fns";
import { fr } from "date-fns/locale";

interface PermitRenewalAlertProps {
  permits: any[];
}

export function PermitRenewalAlert({ permits }: PermitRenewalAlertProps) {
  const getPermitsNearingExpiration = () => {
    return permits
      .filter((permit) => {
        if (permit.status !== "approved" && permit.status !== "verified") return false;
        if (!permit.building_permits) return false;

        const issueDate = new Date(permit.building_permits.issue_date);
        const validityMonths = permit.building_permits.validity_period_months || 12;
        const expiryDate = new Date(issueDate);
        expiryDate.setMonth(expiryDate.getMonth() + validityMonths);

        const daysUntilExpiry = differenceInDays(expiryDate, new Date());
        return daysUntilExpiry <= 90 && daysUntilExpiry > 0;
      })
      .map((permit) => {
        const issueDate = new Date(permit.building_permits.issue_date);
        const validityMonths = permit.building_permits.validity_period_months || 12;
        const expiryDate = new Date(issueDate);
        expiryDate.setMonth(expiryDate.getMonth() + validityMonths);
        const daysUntilExpiry = differenceInDays(expiryDate, new Date());

        return {
          ...permit,
          expiryDate,
          daysUntilExpiry,
        };
      })
      .sort((a, b) => a.daysUntilExpiry - b.daysUntilExpiry);
  };

  const expiringPermits = getPermitsNearingExpiration();

  if (expiringPermits.length === 0) {
    return null;
  }

  const getUrgencyColor = (days: number) => {
    if (days <= 30) return "border-red-600 text-red-600 bg-red-50";
    if (days <= 60) return "border-orange-600 text-orange-600 bg-orange-50";
    return "border-yellow-600 text-yellow-600 bg-yellow-50";
  };

  const getUrgencyIcon = (days: number) => {
    if (days <= 30) return <AlertTriangle className="h-4 w-4 text-red-600" />;
    if (days <= 60) return <Bell className="h-4 w-4 text-orange-600" />;
    return <Calendar className="h-4 w-4 text-yellow-600" />;
  };

  return (
    <Card className="border-border/50 bg-gradient-to-br from-orange-50/50 to-yellow-50/50">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-base">
          <span className="flex items-center gap-2">
            <Bell className="h-4 w-4 text-orange-600 animate-pulse" />
            Alertes de renouvellement
          </span>
          <Badge variant="outline" className="border-orange-600 text-orange-600 bg-orange-50">
            {expiringPermits.length}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {expiringPermits.map((permit) => (
          <div
            key={permit.id}
            className="rounded-lg border bg-background p-3 space-y-3 transition-shadow hover:shadow-sm"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3 flex-1 min-w-0">
                {getUrgencyIcon(permit.daysUntilExpiry)}
                <div className="flex-1 min-w-0 space-y-1">
                  <p className="text-sm font-medium leading-tight">
                    Parcelle {permit.parcel_number}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Permis N° {permit.building_permits?.permit_number || "N/A"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Expire le {format(permit.expiryDate, "d MMMM yyyy", { locale: fr })}
                  </p>
                </div>
              </div>
              <Badge
                variant="outline"
                className={`font-mono text-xs ${getUrgencyColor(permit.daysUntilExpiry)}`}
              >
                {permit.daysUntilExpiry}j
              </Badge>
            </div>

            <Button size="sm" className="w-full gap-2" variant="outline">
              <RefreshCw className="h-3 w-3" />
              Demander le renouvellement
            </Button>
          </div>
        ))}

        {/* Informations sur le renouvellement */}
        <div className="rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground">
          <p className="font-medium mb-1">ℹ️ À propos du renouvellement</p>
          <ul className="list-disc list-inside space-y-0.5">
            <li>Demandez le renouvellement au moins 30 jours avant l'expiration</li>
            <li>Les documents de conformité peuvent être requis</li>
            <li>Les frais de renouvellement varient selon le type de permis</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}

import { TrendingUp, Clock, CheckCircle, XCircle, BarChart3 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface PermitStatisticsProps {
  permits: any[];
}

export function PermitStatistics({ permits }: PermitStatisticsProps) {
  const totalPermits = permits.length;
  const pendingPermits = permits.filter((p) => p.status === "pending").length;
  const approvedPermits = permits.filter(
    (p) => p.status === "approved" || p.status === "verified"
  ).length;
  const rejectedPermits = permits.filter((p) => p.status === "rejected").length;

  const approvalRate =
    totalPermits > 0 ? Math.round((approvedPermits / totalPermits) * 100) : 0;

  const averageProcessingTime = () => {
    const processedPermits = permits.filter(
      (p) => p.status === "approved" || p.status === "rejected"
    );
    if (processedPermits.length === 0) return 0;

    const totalDays = processedPermits.reduce((sum, permit) => {
      const created = new Date(permit.created_at);
      const processed = new Date(
        permit.verified_at || permit.reviewed_at || permit.rejection_date
      );
      const days = Math.floor(
        (processed.getTime() - created.getTime()) / (1000 * 60 * 60 * 24)
      );
      return sum + days;
    }, 0);

    return Math.round(totalDays / processedPermits.length);
  };

  const avgDays = averageProcessingTime();

  const stats = [
    {
      label: "Demandes totales",
      value: totalPermits,
      icon: BarChart3,
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
    {
      label: "En cours",
      value: pendingPermits,
      icon: Clock,
      color: "text-yellow-600",
      bgColor: "bg-yellow-50",
    },
    {
      label: "Délivrés",
      value: approvedPermits,
      icon: CheckCircle,
      color: "text-green-600",
      bgColor: "bg-green-50",
    },
    {
      label: "Refusés",
      value: rejectedPermits,
      icon: XCircle,
      color: "text-red-600",
      bgColor: "bg-red-50",
    },
  ];

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-base">
          <span className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" />
            Statistiques
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Grille des statistiques */}
        <div className="grid grid-cols-2 gap-3">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="flex flex-col gap-2 rounded-lg border border-border/50 bg-background/50 p-3 transition-all hover:shadow-sm"
            >
              <div className="flex items-center justify-between">
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-lg ${stat.bgColor}`}
                >
                  <stat.icon className={`h-4 w-4 ${stat.color}`} />
                </div>
                <span className={`text-2xl font-bold ${stat.color}`}>
                  {stat.value}
                </span>
              </div>
              <p className="text-xs text-muted-foreground leading-tight">
                {stat.label}
              </p>
            </div>
          ))}
        </div>

        {/* Métriques supplémentaires */}
        <div className="space-y-3 rounded-lg border border-border/50 bg-muted/20 p-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Taux d'approbation</span>
            <Badge
              variant="outline"
              className={`font-bold ${
                approvalRate >= 70
                  ? "border-green-600 text-green-600 bg-green-50"
                  : approvalRate >= 40
                  ? "border-yellow-600 text-yellow-600 bg-yellow-50"
                  : "border-red-600 text-red-600 bg-red-50"
              }`}
            >
              {approvalRate}%
            </Badge>
          </div>

          {avgDays > 0 && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                Délai moyen de traitement
              </span>
              <Badge variant="outline" className="font-mono">
                {avgDays} jours
              </Badge>
            </div>
          )}

          {pendingPermits > 0 && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                Demandes en attente
              </span>
              <Badge variant="outline" className="border-yellow-600 text-yellow-600">
                {pendingPermits}
              </Badge>
            </div>
          )}
        </div>

        {/* Conseils */}
        {approvalRate < 50 && totalPermits >= 2 && (
          <div className="rounded-lg bg-orange-50 border border-orange-200 p-3 text-xs text-orange-800">
            <p className="font-medium mb-1">💡 Conseil</p>
            <p>
              Votre taux d'approbation est faible. Assurez-vous de fournir tous les
              documents requis et de vérifier la complétude de vos demandes avant
              soumission.
            </p>
          </div>
        )}

        {approvalRate >= 80 && totalPermits >= 2 && (
          <div className="rounded-lg bg-green-50 border border-green-200 p-3 text-xs text-green-800">
            <p className="font-medium mb-1">✨ Excellent</p>
            <p>
              Votre taux d'approbation est excellent ! Continuez à soumettre des
              dossiers complets et conformes.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

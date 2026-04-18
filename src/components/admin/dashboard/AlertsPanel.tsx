import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Clock, XCircle, UserX, Calendar, TrendingDown, Scale, Building2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface AlertItem {
  id: string;
  type: 'warning' | 'error' | 'info';
  title: string;
  description: string;
  count: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

interface AlertsPanelProps {
  loading: boolean;
  alerts: {
    overdueContributions?: number;
    failedPayments?: number;
    blockedUsers?: number;
    expiredCodes?: number;
    inactiveResellers?: number;
    pendingDisputes?: number;
    pendingMortgages?: number;
  };
  thresholds?: { overdue_days: number; inactive_days: number };
  onAlertAction?: (alertType: string) => void;
}

export function AlertsPanel({ loading, alerts, thresholds, onAlertAction }: AlertsPanelProps) {
  const overdueDays = thresholds?.overdue_days ?? 7;
  const inactiveDays = thresholds?.inactive_days ?? 30;

  if (loading) {
    return (
      <Card>
        <CardHeader className="p-4 md:p-6">
          <CardTitle className="text-sm md:text-base">Alertes importantes</CardTitle>
        </CardHeader>
        <CardContent className="p-4 md:p-6 pt-0 space-y-3">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  const alertItems: AlertItem[] = [
    {
      id: 'overdue', type: 'warning',
      title: 'Contributions en retard',
      description: `Contributions en attente depuis plus de ${overdueDays} jours`,
      count: alerts.overdueContributions || 0,
    },
    { id: 'failed', type: 'error', title: 'Paiements échoués',
      description: 'Paiements nécessitant une attention', count: alerts.failedPayments || 0 },
    { id: 'blocked', type: 'error', title: 'Utilisateurs bloqués',
      description: 'Comptes nécessitant une révision', count: alerts.blockedUsers || 0 },
    { id: 'expired', type: 'warning', title: 'Codes CCC expirés',
      description: 'Codes non utilisés avant expiration', count: alerts.expiredCodes || 0 },
    { id: 'inactive', type: 'info', title: 'Revendeurs inactifs',
      description: `Aucune vente depuis ${inactiveDays} jours`, count: alerts.inactiveResellers || 0 },
    { id: 'disputes', type: 'warning', title: 'Litiges en attente',
      description: 'Litiges nécessitant un traitement', count: alerts.pendingDisputes || 0 },
    { id: 'mortgages', type: 'info', title: 'Hypothèques en attente',
      description: 'Demandes d\'hypothèque à traiter', count: alerts.pendingMortgages || 0 },
  ];

  const getIcon = (type: string) => {
    const icons = {
      overdue: <Clock className="h-5 w-5" />,
      failed: <XCircle className="h-5 w-5" />,
      blocked: <UserX className="h-5 w-5" />,
      expired: <Calendar className="h-5 w-5" />,
      inactive: <TrendingDown className="h-5 w-5" />,
      disputes: <Scale className="h-5 w-5" />,
      mortgages: <Building2 className="h-5 w-5" />,
    };
    return icons[type as keyof typeof icons] || <AlertTriangle className="h-5 w-5" />;
  };

  const visibleAlerts = alertItems.filter(alert => alert.count > 0);

  return (
    <Card>
      <CardHeader className="p-4 md:p-6">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm md:text-base">Alertes importantes</CardTitle>
          {visibleAlerts.length > 0 && (
            <Badge variant="destructive" className="text-xs">
              {visibleAlerts.length}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-4 md:p-6 pt-0">
        <div className="space-y-3">
          {visibleAlerts.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Aucune alerte pour le moment
            </p>
          ) : (
            visibleAlerts.map((alert) => (
              <Alert
                key={alert.id}
                variant={alert.type === 'error' ? 'destructive' : 'default'}
                className="relative"
              >
                <div className="flex items-start gap-3">
                  <div className="mt-0.5">{getIcon(alert.id)}</div>
                  <div className="flex-1 min-w-0">
                    <AlertTitle className="text-sm mb-1">
                      {alert.title}
                      <Badge variant="outline" className="ml-2 text-xs">
                        {alert.count}
                      </Badge>
                    </AlertTitle>
                    <AlertDescription className="text-xs">
                      {alert.description}
                    </AlertDescription>
                  </div>
                  {onAlertAction && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="shrink-0"
                      onClick={() => onAlertAction(alert.id)}
                    >
                      Voir
                    </Button>
                  )}
                </div>
              </Alert>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Bell, TrendingDown, AlertTriangle, AlertCircle, CheckCircle, X } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useState } from 'react';

interface Alert {
  id: string;
  type: 'critical' | 'warning' | 'info' | 'success';
  title: string;
  message: string;
  timestamp: string;
  actionUrl?: string;
}

interface SmartAlertsProps {
  alerts?: Alert[];
  onDismiss?: (id: string) => void;
  onAction?: (id: string, url: string) => void;
}

export function SmartAlerts({ 
  alerts = [], 
  onDismiss = () => {}, 
  onAction = () => {} 
}: SmartAlertsProps) {
  const [dismissedAlerts, setDismissedAlerts] = useState<string[]>([]);

  const visibleAlerts = alerts.filter(alert => !dismissedAlerts.includes(alert.id));

  const handleDismiss = (id: string) => {
    setDismissedAlerts([...dismissedAlerts, id]);
    onDismiss(id);
  };

  const getAlertConfig = (type: Alert['type']) => {
    switch (type) {
      case 'critical':
        return {
          icon: AlertCircle,
          color: 'border-red-500 bg-red-500/10',
          badgeVariant: 'destructive' as const,
          iconColor: 'text-red-600'
        };
      case 'warning':
        return {
          icon: AlertTriangle,
          color: 'border-orange-500 bg-orange-500/10',
          badgeVariant: 'outline' as const,
          iconColor: 'text-orange-600'
        };
      case 'info':
        return {
          icon: Bell,
          color: 'border-blue-500 bg-blue-500/10',
          badgeVariant: 'secondary' as const,
          iconColor: 'text-blue-600'
        };
      case 'success':
        return {
          icon: CheckCircle,
          color: 'border-green-500 bg-green-500/10',
          badgeVariant: 'outline' as const,
          iconColor: 'text-green-600'
        };
    }
  };

  if (visibleAlerts.length === 0) {
    return (
      <Card>
        <CardHeader className="p-4 md:p-6">
          <CardTitle className="text-sm md:text-base flex items-center gap-2">
            <Bell className="h-4 w-4" />
            Alertes intelligentes
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 md:p-6 pt-0">
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <CheckCircle className="h-8 w-8 md:h-12 md:w-12 text-green-600 mb-2" />
            <p className="text-xs md:text-sm text-muted-foreground">
              Aucune alerte active
            </p>
            <p className="text-[10px] md:text-xs text-muted-foreground mt-1">
              Tout fonctionne normalement
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="p-4 md:p-6 pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm md:text-base flex items-center gap-2">
            <Bell className="h-4 w-4" />
            Alertes intelligentes
          </CardTitle>
          <Badge variant="secondary" className="text-[10px]">
            {visibleAlerts.length}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="p-4 md:p-6 pt-0">
        <ScrollArea className="h-[300px] md:h-[400px] pr-4">
          <div className="space-y-3">
            {visibleAlerts.map((alert) => {
              const config = getAlertConfig(alert.type);
              const Icon = config.icon;

              return (
                <div
                  key={alert.id}
                  className={`p-3 rounded-lg border ${config.color} relative`}
                >
                  <Button
                    variant="ghost"
                    size="sm"
                    className="absolute top-2 right-2 h-6 w-6 p-0"
                    onClick={() => handleDismiss(alert.id)}
                  >
                    <X className="h-3 w-3" />
                  </Button>

                  <div className="flex items-start gap-3 pr-8">
                    <Icon className={`h-4 w-4 md:h-5 md:w-5 shrink-0 mt-0.5 ${config.iconColor}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="text-xs md:text-sm font-semibold truncate">
                          {alert.title}
                        </h4>
                        <Badge variant={config.badgeVariant} className="text-[9px] md:text-[10px] shrink-0">
                          {alert.type}
                        </Badge>
                      </div>
                      <p className="text-[10px] md:text-xs text-muted-foreground mb-2">
                        {alert.message}
                      </p>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[9px] md:text-[10px] text-muted-foreground">
                          {new Date(alert.timestamp).toLocaleString('fr-FR', {
                            day: '2-digit',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                        {alert.actionUrl && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-6 text-[10px] md:text-xs px-2"
                            onClick={() => onAction(alert.id, alert.actionUrl!)}
                          >
                            Voir détails
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

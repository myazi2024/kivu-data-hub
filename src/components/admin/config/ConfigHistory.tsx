import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { History, RotateCcw, Loader2 } from 'lucide-react';
import { useConfigHistory } from '@/hooks/useConfigHistory';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface ConfigHistoryProps {
  onRestore: (configKey: string, configValue: any) => void;
}

export const ConfigHistory: React.FC<ConfigHistoryProps> = ({ onRestore }) => {
  const { history, loading, restoreFromHistory } = useConfigHistory();

  const handleRestore = async (historyId: string) => {
    const restored = await restoreFromHistory(historyId);
    if (restored) {
      onRestore(restored.config_key, restored.config_value);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-6">
          <Loader2 className="h-6 w-6 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <History className="h-4 w-4" />
          <CardTitle className="text-base">Historique des modifications</CardTitle>
        </div>
        <CardDescription className="text-xs">
          Les 50 dernières modifications de configuration
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {history.length === 0 ? (
          <Alert>
            <AlertDescription className="text-xs">
              Aucun historique disponible
            </AlertDescription>
          </Alert>
        ) : (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {history.map((entry) => (
              <div
                key={entry.id}
                className="p-3 border rounded-lg space-y-2 hover:bg-accent/50 transition-colors"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        {entry.config_key}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(entry.changed_at), {
                          addSuffix: true,
                          locale: fr
                        })}
                      </span>
                    </div>
                    {entry.change_description && (
                      <p className="text-xs text-muted-foreground">
                        {entry.change_description}
                      </p>
                    )}
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleRestore(entry.id)}
                  >
                    <RotateCcw className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { History, Loader2 } from 'lucide-react';
import { useSystemConfigAudit } from '@/hooks/useSystemConfigAudit';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

interface Props {
  tableName?: string;
  limit?: number;
  title?: string;
}

const ACTION_VARIANT: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  INSERT: 'default',
  UPDATE: 'secondary',
  DELETE: 'destructive',
};

export const SystemConfigAuditViewer: React.FC<Props> = ({ tableName, limit = 50, title }) => {
  const { entries, loading } = useSystemConfigAudit(tableName, limit);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <History className="h-4 w-4" /> {title || 'Historique modifications'}
        </CardTitle>
        <CardDescription className="text-xs">
          {tableName ? `Table ${tableName}` : 'Toutes tables config'} — {limit} dernières entrées
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center p-4"><Loader2 className="h-4 w-4 animate-spin" /></div>
        ) : entries.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-4">Aucune entrée</p>
        ) : (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {entries.map((e) => (
              <div key={e.id} className="flex items-start gap-2 p-2 border rounded-lg text-xs">
                <Badge variant={ACTION_VARIANT[e.action] || 'outline'} className="text-[10px]">
                  {e.action}
                </Badge>
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium">{e.table_name}</span>
                    {e.config_key && <span className="text-muted-foreground">· {e.config_key}</span>}
                  </div>
                  <p className="text-muted-foreground">
                    {e.admin_name || 'Système'} · {formatDistanceToNow(new Date(e.created_at), { addSuffix: true, locale: fr })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

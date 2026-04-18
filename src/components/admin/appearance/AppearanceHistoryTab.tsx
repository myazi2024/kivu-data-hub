import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { History, Loader2, Undo2 } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useAppearanceHistory } from '@/hooks/useAppearanceHistory';

interface Props {
  onAfterRestore?: () => void;
}

export default function AppearanceHistoryTab({ onAfterRestore }: Props) {
  const { entries, loading, restoring, restoreEntry } = useAppearanceHistory(40);

  const handleRestore = async (entry: any) => {
    const ok = await restoreEntry(entry);
    if (ok) onAfterRestore?.();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <History className="h-4 w-4" /> Historique des modifications
        </CardTitle>
        <CardDescription>Restaurez n'importe quelle version antérieure d'un paramètre.</CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin" /></div>
        ) : entries.length === 0 ? (
          <p className="text-center text-xs text-muted-foreground py-6">Aucun historique disponible</p>
        ) : (
          <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
            {entries.map(e => {
              const canRestore = e.action === 'UPDATE' && !!e.old_values?.config_value;
              return (
                <div key={e.id} className="flex items-center justify-between gap-3 p-2 border rounded-lg bg-muted/20">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="outline" className="text-[10px]">{e.action}</Badge>
                      <code className="text-xs font-mono">{e.config_key || '—'}</code>
                      <span className="text-[10px] text-muted-foreground">
                        {format(new Date(e.created_at), 'dd/MM/yy HH:mm', { locale: fr })}
                      </span>
                      {e.admin_name && <span className="text-[10px] text-muted-foreground">par {e.admin_name}</span>}
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={!canRestore || restoring === e.id}
                    onClick={() => handleRestore(e)}
                    title={canRestore ? 'Restaurer la valeur précédente' : 'Pas de version antérieure'}
                  >
                    {restoring === e.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Undo2 className="h-3.5 w-3.5" />}
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

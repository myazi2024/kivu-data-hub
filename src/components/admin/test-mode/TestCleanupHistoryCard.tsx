import React, { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { History, RefreshCw, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

interface HistoryRow {
  id: string;
  action: string;
  user_id: string | null;
  created_at: string;
  total_deleted: number;
  per_step: Record<string, number>;
  failed_step: string | null;
}

const ACTION_LABELS: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  MANUAL_TEST_DATA_CLEANUP_BATCHED: { label: 'Purge manuelle', variant: 'destructive' },
  AUTO_TEST_DATA_CLEANUP: { label: 'Purge auto (cron)', variant: 'secondary' },
  TEST_DATA_GENERATED: { label: 'Génération', variant: 'default' },
};

const TestCleanupHistoryCard: React.FC = () => {
  const [rows, setRows] = useState<HistoryRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.rpc('get_test_cleanup_history', { p_limit: 10 });
    if (!error && Array.isArray(data)) setRows(data as unknown as HistoryRow[]);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <History className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-base">Historique des opérations TEST</CardTitle>
              <CardDescription>10 dernières purges et générations</CardDescription>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={load} disabled={loading} aria-label="Rafraîchir">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {loading && rows.length === 0 ? (
          <div className="text-sm text-muted-foreground py-4">Chargement…</div>
        ) : rows.length === 0 ? (
          <div className="text-sm text-muted-foreground py-4">Aucun événement enregistré.</div>
        ) : (
          <ul className="space-y-2">
            {rows.map((r) => {
              const meta = ACTION_LABELS[r.action] ?? { label: r.action, variant: 'outline' as const };
              return (
                <li key={r.id} className="flex items-start justify-between gap-3 border-b last:border-b-0 pb-2 last:pb-0">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant={meta.variant} className="text-xs">{meta.label}</Badge>
                      {r.failed_step && (
                        <Badge variant="destructive" className="text-xs">Échec : {r.failed_step}</Badge>
                      )}
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(r.created_at), { addSuffix: true, locale: fr })}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {r.action === 'TEST_DATA_GENERATED'
                        ? 'Données test générées'
                        : `${r.total_deleted} enregistrement${r.total_deleted > 1 ? 's' : ''} supprimé${r.total_deleted > 1 ? 's' : ''}`}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
};

export default TestCleanupHistoryCard;

import React, { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Clock, RefreshCw, Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

interface CronRun {
  jobid: number;
  runid: number;
  status: string;
  return_message: string | null;
  start_time: string;
  end_time: string | null;
}

const JOB_NAME = 'cleanup-test-data-daily-rpc';

const TestCronStatusCard: React.FC = () => {
  const [runs, setRuns] = useState<CronRun[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await (supabase as any).rpc('get_cron_run_history', {
      p_jobname: JOB_NAME,
      p_limit: 5,
    });
    if (!error && Array.isArray(data)) setRuns(data as CronRun[]);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const lastRun = runs[0];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Clock className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-base">Cron de purge automatique</CardTitle>
              <CardDescription>Job <code className="text-[10px]">{JOB_NAME}</code> — quotidien 03:00 UTC</CardDescription>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={load} disabled={loading} aria-label="Rafraîchir">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {loading && runs.length === 0 ? (
          <div className="text-sm text-muted-foreground py-4">Chargement…</div>
        ) : !lastRun ? (
          <div className="text-sm text-muted-foreground py-4">Aucun run enregistré pour ce cron.</div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center gap-2 flex-wrap">
              {lastRun.status === 'succeeded' ? (
                <Badge className="text-xs bg-emerald-600 hover:bg-emerald-700">
                  <CheckCircle2 className="h-3 w-3 mr-1" /> Dernier run réussi
                </Badge>
              ) : (
                <Badge variant="destructive" className="text-xs">
                  <XCircle className="h-3 w-3 mr-1" /> Dernier run : {lastRun.status}
                </Badge>
              )}
              <span className="text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(lastRun.start_time), { addSuffix: true, locale: fr })}
              </span>
            </div>
            {lastRun.return_message && (
              <p className="text-xs text-muted-foreground line-clamp-2">{lastRun.return_message}</p>
            )}
            {runs.length > 1 && (
              <details className="text-xs">
                <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                  Voir les {runs.length - 1} runs précédents
                </summary>
                <ul className="mt-2 space-y-1">
                  {runs.slice(1).map((r) => (
                    <li key={r.runid} className="flex items-center gap-2">
                      <span className={r.status === 'succeeded' ? 'text-emerald-600' : 'text-destructive'}>
                        {r.status === 'succeeded' ? '✓' : '✗'}
                      </span>
                      <span className="text-muted-foreground">
                        {formatDistanceToNow(new Date(r.start_time), { addSuffix: true, locale: fr })}
                      </span>
                    </li>
                  ))}
                </ul>
              </details>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default TestCronStatusCard;

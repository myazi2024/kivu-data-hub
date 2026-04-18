import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useDisputeMortgageOverlaps } from '@/hooks/useDisputeMortgageOverlaps';
import { formatCurrency } from '@/utils/formatters';

const RISK_BADGE: Record<string, 'destructive' | 'default' | 'secondary'> = {
  high: 'destructive',
  medium: 'default',
  low: 'secondary',
};

export const DisputeMortgageOverlapsPanel = () => {
  const { rows, loading, error, refresh } = useDisputeMortgageOverlaps();

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-destructive" />
            Alertes croisées : litige + hypothèque ({rows.length})
          </CardTitle>
          <Button variant="outline" size="sm" onClick={refresh} disabled={loading}>
            <RefreshCw className="h-3 w-3 mr-1" /> Rafraîchir
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {error && <p className="text-xs text-destructive">{error}</p>}
        {loading && <p className="text-xs text-muted-foreground">Chargement…</p>}
        {!loading && rows.length === 0 && (
          <p className="text-xs text-muted-foreground italic">Aucune parcelle ne présente à la fois un litige et une hypothèque actifs. ✅</p>
        )}
        {rows.length > 0 && (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {rows.map((r) => (
              <div key={r.parcel_number} className="p-3 border rounded-md hover:bg-accent/50 transition-colors">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-xs font-semibold">{r.parcel_number}</span>
                    <Badge variant={RISK_BADGE[r.risk_level]} className="text-[9px] uppercase">{r.risk_level}</Badge>
                  </div>
                  <Link to={`/admin?tab=land-disputes`} className="text-xs text-primary hover:underline flex items-center gap-1">
                    Voir <ExternalLink className="h-3 w-3" />
                  </Link>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  {Number(r.active_mortgages_count)} hypothèque(s) active(s) · {formatCurrency(Number(r.total_mortgage_amount_usd || 0))} ·{' '}
                  {Number(r.active_disputes_count)} litige(s) ouvert(s)
                </p>
                {r.dispute_references && r.dispute_references.length > 0 && (
                  <p className="text-[10px] text-muted-foreground mt-1">
                    Litiges : <span className="font-mono">{r.dispute_references.join(', ')}</span>
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

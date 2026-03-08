/**
 * Displays previous tax declarations for a parcel.
 * Fix #12: Users can now see which fiscal years are already covered.
 */
import React, { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { History, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface TaxHistoryEntry {
  id: string;
  status: string;
  created_at: string;
  tax_history: any[];
}

interface TaxHistorySectionProps {
  parcelNumber: string;
  /** Filter to a specific tax type (optional) */
  taxTypeFilter?: string;
}

const STATUS_BADGES: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  pending: { label: 'En attente', variant: 'secondary' },
  approved: { label: 'Validée', variant: 'default' },
  rejected: { label: 'Rejetée', variant: 'destructive' },
};

const TaxHistorySection: React.FC<TaxHistorySectionProps> = ({ parcelNumber, taxTypeFilter }) => {
  const { user } = useAuth();
  const [entries, setEntries] = useState<TaxHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { setLoading(false); return; }

    const fetch = async () => {
      const { data } = await supabase
        .from('cadastral_contributions')
        .select('id, status, created_at, tax_history')
        .eq('parcel_number', parcelNumber)
        .eq('user_id', user.id)
        .eq('contribution_type', 'update')
        .not('tax_history', 'is', null)
        .order('created_at', { ascending: false })
        .limit(10);

      if (data) {
        // Filter by tax type if specified
        const filtered = taxTypeFilter
          ? data.filter((d: any) => {
              const history = d.tax_history as any[];
              return history?.some((h: any) => h.tax_type === taxTypeFilter);
            })
          : data;
        setEntries(filtered as TaxHistoryEntry[]);
      }
      setLoading(false);
    };
    fetch();
  }, [user, parcelNumber, taxTypeFilter]);

  if (loading) {
    return (
      <div className="flex justify-center py-2">
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (entries.length === 0) return null;

  return (
    <Card className="rounded-xl border-border/50">
      <CardContent className="p-3 space-y-2">
        <div className="flex items-center gap-1.5">
          <History className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            Déclarations précédentes
          </span>
        </div>
        <div className="space-y-1.5">
          {entries.map((entry) => {
            const history = (entry.tax_history as any[]) || [];
            return history.map((h: any, i: number) => {
              if (taxTypeFilter && h.tax_type !== taxTypeFilter) return null;
              const statusInfo = STATUS_BADGES[entry.status] || STATUS_BADGES.pending;
              return (
                <div key={`${entry.id}-${i}`} className="flex items-center justify-between text-xs p-1.5 bg-muted/30 rounded-lg">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{h.tax_year}</span>
                    <span className="text-muted-foreground truncate max-w-[120px]">{h.tax_type}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono">{Number(h.amount_usd || 0).toFixed(2)} USD</span>
                    <Badge variant={statusInfo.variant} className="text-[10px] h-5">
                      {statusInfo.label}
                    </Badge>
                  </div>
                </div>
              );
            });
          })}
        </div>
      </CardContent>
    </Card>
  );
};

export default TaxHistorySection;

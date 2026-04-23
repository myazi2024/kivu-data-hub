import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Search, Loader2, Clock, User, Compass, Receipt, Landmark, Scale, Download } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useParcelTimeline } from '@/hooks/useParcelTimeline';
import { formatCurrency } from '@/utils/formatters';
import { exportParcelDossier } from '@/utils/parcelDossierExport';
import { toast } from 'sonner';

const ICONS: Record<string, React.ReactNode> = {
  ownership_change: <User className="h-3.5 w-3.5" />,
  boundary_survey: <Compass className="h-3.5 w-3.5" />,
  tax_payment: <Receipt className="h-3.5 w-3.5" />,
  mortgage: <Landmark className="h-3.5 w-3.5" />,
  dispute: <Scale className="h-3.5 w-3.5" />,
};

const TYPE_LABELS: Record<string, string> = {
  ownership_change: 'Propriété',
  boundary_survey: 'Bornage',
  tax_payment: 'Fiscal',
  mortgage: 'Hypothèque',
  dispute: 'Litige',
};

// Marqueur sémantique : pastille primary par défaut, destructive pour litiges
const TYPE_DOT: Record<string, string> = {
  ownership_change: 'bg-primary/10 text-primary border-primary/30',
  boundary_survey: 'bg-primary/10 text-primary border-primary/30',
  tax_payment: 'bg-primary/10 text-primary border-primary/30',
  mortgage: 'bg-primary/10 text-primary border-primary/30',
  dispute: 'bg-destructive/10 text-destructive border-destructive/30',
};

export const ParcelTimelineView = () => {
  const [input, setInput] = useState('');
  const [searched, setSearched] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState<string | null>(null);
  const { events, loading, error } = useParcelTimeline(searched);

  const handleSearch = () => {
    const trimmed = input.trim();
    if (!trimmed) return;
    setSearched(trimmed);
    setTypeFilter(null);
  };

  const handleExportDossier = async () => {
    if (!searched) return;
    try {
      await exportParcelDossier(searched);
      toast.success('Dossier exporté');
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Erreur d'export";
      toast.error(msg);
    }
  };

  const counts = useMemo(() => {
    const acc: Record<string, number> = {};
    for (const ev of events) acc[ev.event_type] = (acc[ev.event_type] || 0) + 1;
    return acc;
  }, [events]);

  const filtered = useMemo(
    () => (typeFilter ? events.filter((e) => e.event_type === typeFilter) : events),
    [events, typeFilter],
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Clock className="h-4 w-4" /> Timeline transversale par parcelle
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex gap-2">
          <Input
            placeholder="Numéro de parcelle (ex: 1234/5678)"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            className="text-sm"
          />
          <Button onClick={handleSearch} size="sm" disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
          </Button>
          {searched && events.length > 0 && (
            <Button onClick={handleExportDossier} size="sm" variant="outline" title="Exporter le dossier complet (CSV)">
              <Download className="h-4 w-4" />
            </Button>
          )}
        </div>

        {error && <p className="text-xs text-destructive">{error}</p>}

        {searched && !loading && events.length === 0 && (
          <p className="text-xs text-muted-foreground italic">Aucun événement pour la parcelle « {searched} ».</p>
        )}

        {events.length > 0 && (
          <>
            <div className="flex flex-wrap gap-1.5">
              <Button
                size="sm"
                variant={typeFilter === null ? 'default' : 'outline'}
                className="h-6 px-2 text-[10px]"
                onClick={() => setTypeFilter(null)}
              >
                Tous ({events.length})
              </Button>
              {Object.entries(counts).map(([type, count]) => (
                <Button
                  key={type}
                  size="sm"
                  variant={typeFilter === type ? 'default' : 'outline'}
                  className="h-6 px-2 text-[10px]"
                  onClick={() => setTypeFilter((t) => (t === type ? null : type))}
                >
                  {TYPE_LABELS[type] || type} ({count})
                </Button>
              ))}
            </div>

            <div className="relative pl-5 border-l-2 border-muted space-y-3 max-h-[500px] overflow-y-auto">
              {filtered.map((ev, idx) => (
                <div key={idx} className="relative">
                  <div
                    className={`absolute -left-[26px] w-5 h-5 rounded-full border-2 flex items-center justify-center ${TYPE_DOT[ev.event_type] || 'bg-muted text-muted-foreground border-border'}`}
                  >
                    {ICONS[ev.event_type] || <Clock className="h-3 w-3" />}
                  </div>
                  <div className="p-2.5 rounded-md border bg-card">
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
                      <p className="text-xs font-semibold">{ev.title}</p>
                      <Badge variant="outline" className="text-[9px] uppercase">
                        {TYPE_LABELS[ev.event_type] || ev.event_type.replace('_', ' ')}
                      </Badge>
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      {ev.event_date ? format(new Date(ev.event_date), 'dd MMM yyyy', { locale: fr }) : 'Date inconnue'}
                      {ev.status && ` · ${ev.status}`}
                      {ev.amount_usd != null && ` · ${formatCurrency(ev.amount_usd)}`}
                      {ev.reference && ` · ${ev.reference}`}
                    </p>
                    {ev.description && <p className="text-[11px] text-muted-foreground mt-1">{ev.description}</p>}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};

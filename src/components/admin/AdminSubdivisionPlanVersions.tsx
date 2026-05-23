import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Loader2, FileText, Download, Star, RefreshCw, Search } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { toast } from '@/hooks/use-toast';
import { escapeIlike } from '@/utils/escapeIlike';

interface PlanVersionRow {
  id: string;
  subdivision_request_id: string;
  version_number: number;
  official_version: number | null;
  pdf_path: string | null;
  verification_code: string | null;
  reason: string | null;
  is_current: boolean;
  created_at: string;
  config_snapshot: any;
  request?: { reference_number: string; parcel_number: string } | null;
}

export default function AdminSubdivisionPlanVersions() {
  const [rows, setRows] = useState<PlanVersionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);

  const fetchRows = useCallback(async () => {
    setLoading(true);
    try {
      let q = (supabase as any)
        .from('subdivision_plan_versions')
        .select('id, subdivision_request_id, version_number, official_version, pdf_path, verification_code, reason, is_current, created_at, config_snapshot, request:subdivision_requests!subdivision_request_id(reference_number, parcel_number)')
        .order('created_at', { ascending: false })
        .limit(200);
      const { data, error } = await q;
      if (error) throw error;
      let list = (data || []) as PlanVersionRow[];
      if (search.trim()) {
        const s = search.trim().toLowerCase();
        list = list.filter(r =>
          (r.request?.reference_number || '').toLowerCase().includes(s) ||
          (r.request?.parcel_number || '').toLowerCase().includes(s) ||
          (r.verification_code || '').toLowerCase().includes(s),
        );
      }
      setRows(list);
    } catch (e: any) {
      toast({ title: 'Erreur', description: e?.message || 'Chargement impossible', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  useEffect(() => { fetchRows(); }, [fetchRows]);

  const handleDownload = async (row: PlanVersionRow) => {
    setBusyId(row.id);
    try {
      if (row.is_current) {
        const { data, error } = await (supabase as any).rpc('get_signed_subdivision_plan', { p_request_id: row.subdivision_request_id });
        if (error) throw error;
        if (typeof data === 'string' && data) {
          window.open(data, '_blank', 'noopener,noreferrer');
          return;
        }
      }
      if (row.pdf_path) {
        const { data, error } = await supabase.storage.from('subdivision-plans').createSignedUrl(row.pdf_path, 300);
        if (error) throw error;
        if (data?.signedUrl) window.open(data.signedUrl, '_blank', 'noopener,noreferrer');
        else throw new Error('URL signée indisponible');
      } else {
        throw new Error('Aucun PDF associé');
      }
    } catch (e: any) {
      toast({ title: 'Téléchargement impossible', description: e?.message || 'Erreur', variant: 'destructive' });
    } finally {
      setBusyId(null);
    }
  };

  const handleSetCurrent = async (row: PlanVersionRow) => {
    setBusyId(row.id);
    try {
      const { error } = await (supabase as any)
        .from('subdivision_plan_versions')
        .update({ is_current: true })
        .eq('id', row.id);
      if (error) throw error;
      toast({ title: 'Version courante mise à jour', description: `v${row.official_version ?? row.version_number}` });
      await fetchRows();
    } catch (e: any) {
      toast({ title: 'Erreur', description: e?.message || 'Action impossible', variant: 'destructive' });
    } finally {
      setBusyId(null);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <CardTitle className="flex items-center gap-2"><FileText className="h-5 w-5 text-primary" /> Versions du plan officiel</CardTitle>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Réf, parcelle, code…" value={search} onChange={e => setSearch(e.target.value)} className="pl-9 w-full sm:w-[260px]" />
            </div>
            <Button variant="outline" size="sm" onClick={fetchRows} className="gap-1">
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Actualiser
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-12 text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin mr-2" /> Chargement…
          </div>
        ) : rows.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">Aucune version de plan générée.</p>
        ) : (
          <div className="space-y-2">
            {rows.map(r => (
              <div key={r.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border rounded-md p-3">
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-sm font-medium truncate">{r.request?.reference_number || r.subdivision_request_id.slice(0, 8)}</span>
                    <Badge variant="secondary">v{r.official_version ?? r.version_number}</Badge>
                    {r.is_current && <Badge className="bg-green-600 hover:bg-green-700">Courante</Badge>}
                    {r.verification_code && <Badge variant="outline" className="font-mono text-xs">{r.verification_code}</Badge>}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Parcelle <span className="font-mono">{r.request?.parcel_number || '—'}</span> · {format(new Date(r.created_at), 'PPp', { locale: fr })}
                    {r.reason && <> · <span className="italic">{r.reason}</span></>}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Button variant="outline" size="sm" onClick={() => handleDownload(r)} disabled={busyId === r.id || !r.pdf_path} className="gap-1">
                    {busyId === r.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />} PDF
                  </Button>
                  {!r.is_current && (
                    <Button variant="ghost" size="sm" onClick={() => handleSetCurrent(r)} disabled={busyId === r.id} className="gap-1">
                      <Star className="h-4 w-4" /> Définir courante
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

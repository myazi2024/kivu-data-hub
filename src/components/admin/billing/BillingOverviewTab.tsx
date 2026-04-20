import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Download, Search, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

type Row = {
  category: string;
  name: string;
  reference: string;
  price_usd: number;
  status: string;
  updated_at: string | null;
};

const CATEGORIES = [
  { key: 'all', label: 'Toutes catégories' },
  { key: 'Publications', label: 'Publications' },
  { key: 'Services cadastraux', label: 'Services cadastraux' },
  { key: 'Autorisation de bâtir', label: 'Autorisation de bâtir' },
  { key: 'Mutation foncière', label: 'Mutation foncière' },
  { key: 'Titre foncier', label: 'Titre foncier' },
  { key: 'Lotissement', label: 'Lotissement' },
  { key: 'Expertise', label: 'Expertise' },
];

export const BillingOverviewTab = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<Row[]>([]);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [pubs, services, permits, mutations, titles, subdivisions, expertise] = await Promise.all([
        supabase.from('publications').select('id, title, category, price_usd, status, updated_at').is('deleted_at', null),
        supabase.from('cadastral_services_config').select('id, name, service_id, price_usd, is_active, updated_at').is('deleted_at', null),
        supabase.from('permit_fees_config').select('id, fee_name, permit_type, amount_usd, is_active, updated_at'),
        (supabase as any).from('mutation_fees_config').select('id, fee_name, description, amount_usd, is_active, updated_at'),
        (supabase as any).from('land_title_fees_by_type').select('id, fee_name, title_type, base_amount_usd, is_active, updated_at'),
        (supabase as any).from('subdivision_rate_config').select('id, section_type, location_name, rate_per_sqm_usd, is_active, updated_at'),
        (supabase as any).from('expertise_fees_config').select('id, fee_name, description, amount_usd, is_active, updated_at'),
      ]);

      const all: Row[] = [];
      (pubs.data || []).forEach((p: any) => all.push({
        category: 'Publications', name: p.title, reference: p.category || '—',
        price_usd: Number(p.price_usd) || 0, status: p.status || '—', updated_at: p.updated_at,
      }));
      (services.data || []).forEach((s: any) => all.push({
        category: 'Services cadastraux', name: s.name, reference: s.service_id,
        price_usd: Number(s.price_usd) || 0, status: s.is_active ? 'actif' : 'inactif', updated_at: s.updated_at,
      }));
      (permits.data || []).forEach((f: any) => all.push({
        category: 'Autorisation de bâtir', name: f.fee_name, reference: f.permit_type || '—',
        price_usd: Number(f.amount_usd) || 0, status: f.is_active ? 'actif' : 'inactif', updated_at: f.updated_at,
      }));
      (mutations.data || []).forEach((f: any) => all.push({
        category: 'Mutation foncière', name: f.fee_name, reference: f.description ? String(f.description).slice(0, 30) : '—',
        price_usd: Number(f.amount_usd) || 0, status: f.is_active ? 'actif' : 'inactif', updated_at: f.updated_at,
      }));
      (titles.data || []).forEach((f: any) => all.push({
        category: 'Titre foncier', name: f.fee_name, reference: f.title_type || '—',
        price_usd: Number(f.base_amount_usd) || 0, status: f.is_active ? 'actif' : 'inactif', updated_at: f.updated_at,
      }));
      (subdivisions.data || []).forEach((f: any) => all.push({
        category: 'Lotissement', name: `${f.section_type || '—'} — ${f.location_name || '—'}`, reference: f.section_type || '—',
        price_usd: Number(f.rate_per_sqm_usd) || 0, status: f.is_active ? 'actif' : 'inactif', updated_at: f.updated_at,
      }));
      (expertise.data || []).forEach((f: any) => all.push({
        category: 'Expertise', name: f.fee_name, reference: f.description ? String(f.description).slice(0, 30) : '—',
        price_usd: Number(f.amount_usd) || 0, status: f.is_active ? 'actif' : 'inactif', updated_at: f.updated_at,
      }));

      setRows(all);
    } catch (e) {
      console.error('[BillingOverview] fetch error', e);
      toast({ title: 'Erreur', description: 'Impossible de charger la vue d\'ensemble', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAll(); }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter(r => {
      if (category !== 'all' && r.category !== category) return false;
      if (!q) return true;
      return r.name.toLowerCase().includes(q) || r.reference.toLowerCase().includes(q);
    });
  }, [rows, search, category]);

  const totals = useMemo(() => {
    const byCat = new Map<string, { count: number; sum: number }>();
    rows.forEach(r => {
      const cur = byCat.get(r.category) || { count: 0, sum: 0 };
      cur.count += 1;
      cur.sum += r.price_usd;
      byCat.set(r.category, cur);
    });
    return Array.from(byCat.entries()).map(([cat, v]) => ({ cat, ...v }));
  }, [rows]);

  const exportCSV = () => {
    const header = ['Catégorie', 'Nom', 'Référence', 'Prix USD', 'Statut', 'Dernière modification'];
    const lines = filtered.map(r => [
      r.category, r.name.replace(/"/g, '""'), r.reference, r.price_usd.toFixed(2),
      r.status, r.updated_at ? new Date(r.updated_at).toISOString() : '',
    ].map(v => `"${v}"`).join(','));
    const csv = [header.join(','), ...lines].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tarifs_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        {totals.map(t => (
          <Card key={t.cat}>
            <CardContent className="p-3">
              <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{t.cat}</div>
              <div className="text-lg font-bold">{t.count} <span className="text-xs font-normal text-muted-foreground">tarifs</span></div>
              <div className="text-xs text-muted-foreground">
                {t.cat === 'Lotissement' ? `${t.count} taux configurés (/m²)` : `Total $${t.sum.toFixed(2)}`}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader className="p-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div>
              <CardTitle className="text-base md:text-lg">Vue d'ensemble des tarifs ({filtered.length})</CardTitle>
              <CardDescription className="text-xs">Tous les services facturables actifs</CardDescription>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Rechercher…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-7 w-full sm:w-48 h-8 text-xs"
                />
              </div>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="w-full sm:w-[180px] h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map(c => <SelectItem key={c.key} value={c.key}>{c.label}</SelectItem>)}
                </SelectContent>
              </Select>
              <Button size="sm" variant="outline" onClick={fetchAll} disabled={loading}>
                <RefreshCw className={`h-3.5 w-3.5 mr-1 ${loading ? 'animate-spin' : ''}`} />
                Actualiser
              </Button>
              <Button size="sm" onClick={exportCSV} disabled={filtered.length === 0}>
                <Download className="h-3.5 w-3.5 mr-1" />
                CSV
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-2 md:p-4">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Catégorie</TableHead>
                  <TableHead className="text-xs">Service</TableHead>
                  <TableHead className="text-xs">Réf.</TableHead>
                  <TableHead className="text-xs text-right">Prix USD</TableHead>
                  <TableHead className="text-xs">Statut</TableHead>
                  <TableHead className="text-xs">Modifié</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((r, i) => (
                  <TableRow key={`${r.category}-${i}`}>
                    <TableCell className="text-xs"><Badge variant="outline" className="text-[10px]">{r.category}</Badge></TableCell>
                    <TableCell className="text-xs font-medium max-w-[200px] truncate">{r.name}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{r.reference}</TableCell>
                    <TableCell className="text-xs text-right font-semibold">${r.price_usd.toFixed(2)}</TableCell>
                    <TableCell>
                      <Badge variant={r.status === 'actif' || r.status === 'published' ? 'default' : 'secondary'} className="text-[10px]">{r.status}</Badge>
                    </TableCell>
                    <TableCell className="text-[10px] text-muted-foreground">
                      {r.updated_at ? new Date(r.updated_at).toLocaleDateString() : '—'}
                    </TableCell>
                  </TableRow>
                ))}
                {filtered.length === 0 && !loading && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-xs text-muted-foreground py-6">Aucun tarif trouvé</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default BillingOverviewTab;

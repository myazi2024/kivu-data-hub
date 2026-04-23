import React, { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import type { Json } from '@/integrations/supabase/types';
import { useAuth } from '@/hooks/useAuth';
import { Layers, Search, Loader2, RefreshCw, Pencil, Download } from 'lucide-react';
import { downloadCsv } from '@/utils/adminQueueUtils';
import { USAGE_LABELS } from '@/components/cadastral/subdivision/types';

interface LotRow {
  id: string;
  subdivision_request_id: string;
  parcel_number: string;
  lot_number: string;
  lot_label: string | null;
  area_sqm: number;
  perimeter_m: number;
  intended_use: string | null;
  owner_name: string | null;
  notes: string | null;
  color: string | null;
  created_at: string;
}

const USE_FILTERS = ['_all', 'residential', 'commercial', 'industrial', 'agricultural', 'mixed'] as const;

const AdminSubdivisionLots: React.FC = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [lots, setLots] = useState<LotRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [useFilter, setUseFilter] = useState<string>('_all');
  const [editing, setEditing] = useState<LotRow | null>(null);
  const [editForm, setEditForm] = useState<{ owner_name: string; notes: string; intended_use: string }>({
    owner_name: '',
    notes: '',
    intended_use: 'residential',
  });
  const [saving, setSaving] = useState(false);

  const fetchLots = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('subdivision_lots')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1000);
    if (error) {
      toast({ title: 'Erreur de chargement', description: error.message, variant: 'destructive' });
    } else {
      setLots((data || []) as LotRow[]);
    }
    setLoading(false);
  };

  useEffect(() => { fetchLots(); }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return lots.filter(l => {
      if (useFilter !== '_all' && (l.intended_use || '') !== useFilter) return false;
      if (!q) return true;
      return (
        l.parcel_number?.toLowerCase().includes(q) ||
        l.lot_number?.toLowerCase().includes(q) ||
        (l.lot_label || '').toLowerCase().includes(q) ||
        (l.owner_name || '').toLowerCase().includes(q)
      );
    });
  }, [lots, search, useFilter]);

  const stats = useMemo(() => {
    const totalArea = filtered.reduce((s, l) => s + Number(l.area_sqm || 0), 0);
    return { count: filtered.length, totalArea };
  }, [filtered]);

  const openEdit = (lot: LotRow) => {
    setEditing(lot);
    setEditForm({
      owner_name: lot.owner_name || '',
      notes: lot.notes || '',
      intended_use: lot.intended_use || 'residential',
    });
  };

  const saveEdit = async () => {
    if (!editing) return;
    setSaving(true);
    const before = {
      owner_name: editing.owner_name,
      notes: editing.notes,
      intended_use: editing.intended_use,
    };
    const { error } = await supabase
      .from('subdivision_lots')
      .update({
        owner_name: editForm.owner_name || null,
        notes: editForm.notes || null,
        intended_use: editForm.intended_use,
      })
      .eq('id', editing.id);

    if (error) {
      toast({ title: 'Échec de la mise à jour', description: error.message, variant: 'destructive' });
      setSaving(false);
      return;
    }

    // Generic audit log
    await supabase.from('audit_logs').insert({
      action: 'subdivision_lot_admin_update',
      table_name: 'subdivision_lots',
      record_id: editing.id,
      user_id: user?.id ?? null,
      old_values: before as unknown as Json,
      new_values: editForm as unknown as Json,
    });

    toast({ title: 'Lot mis à jour', description: `Lot ${editing.lot_number} (${editing.parcel_number})` });
    setEditing(null);
    setSaving(false);
    fetchLots();
  };

  const handleExport = () => {
    downloadCsv(
      `subdivision-lots-${new Date().toISOString().slice(0, 10)}.csv`,
      filtered.map(l => ({
        parcel_number: l.parcel_number,
        lot_number: l.lot_number,
        lot_label: l.lot_label || '',
        area_sqm: l.area_sqm,
        perimeter_m: l.perimeter_m,
        intended_use: l.intended_use || '',
        owner_name: l.owner_name || '',
        notes: l.notes || '',
        created_at: l.created_at,
      })),
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Layers className="h-6 w-6 text-primary" />
            Lots & voies créés
          </h2>
          <p className="text-muted-foreground">Vue cadastrale globale des lots issus de lotissements approuvés</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline">{stats.count} lots</Badge>
          <Badge variant="outline">{stats.totalArea.toLocaleString()} m²</Badge>
          <Button variant="outline" size="sm" onClick={handleExport} className="gap-1">
            <Download className="h-4 w-4" /> CSV
          </Button>
          <Button variant="outline" size="sm" onClick={fetchLots} className="gap-1">
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Actualiser
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col lg:flex-row gap-3">
            <div className="flex-1 relative min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher par parcelle, lot, propriétaire..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={useFilter} onValueChange={setUseFilter}>
              <SelectTrigger className="w-full lg:w-[200px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                {USE_FILTERS.map(v => (
                  <SelectItem key={v} value={v}>
                    {v === '_all' ? 'Tous usages' : USAGE_LABELS[v as keyof typeof USAGE_LABELS]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Lots</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">Aucun lot trouvé</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Parcelle mère</TableHead>
                    <TableHead>Lot</TableHead>
                    <TableHead>Surface</TableHead>
                    <TableHead>Usage</TableHead>
                    <TableHead>Propriétaire</TableHead>
                    <TableHead>Créé le</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map(l => (
                    <TableRow key={l.id}>
                      <TableCell className="font-mono text-xs">{l.parcel_number}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span
                            className="h-3 w-3 rounded-sm border border-border"
                            style={{ backgroundColor: l.color || 'hsl(var(--muted))' }}
                          />
                          <span className="font-medium">{l.lot_label || `Lot ${l.lot_number}`}</span>
                        </div>
                      </TableCell>
                      <TableCell>{Number(l.area_sqm || 0).toLocaleString()} m²</TableCell>
                      <TableCell>
                        {l.intended_use ? (
                          <Badge variant="outline" className="text-xs">
                            {USAGE_LABELS[l.intended_use as keyof typeof USAGE_LABELS] || l.intended_use}
                          </Badge>
                        ) : '—'}
                      </TableCell>
                      <TableCell className="max-w-[180px] truncate">{l.owner_name || '—'}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {new Date(l.created_at).toLocaleDateString('fr-FR')}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" onClick={() => openEdit(l)} className="gap-1">
                          <Pencil className="h-3.5 w-3.5" /> Éditer
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit dialog */}
      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Éditer le lot {editing?.lot_label || editing?.lot_number}</DialogTitle>
            <DialogDescription>
              Parcelle mère <span className="font-mono">{editing?.parcel_number}</span> · {Number(editing?.area_sqm || 0).toLocaleString()} m²
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label htmlFor="owner">Propriétaire</Label>
              <Input
                id="owner"
                value={editForm.owner_name}
                onChange={e => setEditForm(f => ({ ...f, owner_name: e.target.value }))}
                placeholder="Nom du propriétaire"
              />
            </div>
            <div>
              <Label htmlFor="use">Usage prévu</Label>
              <Select value={editForm.intended_use} onValueChange={(v) => setEditForm(f => ({ ...f, intended_use: v }))}>
                <SelectTrigger id="use"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(USAGE_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="notes">Notes administratives</Label>
              <Textarea
                id="notes"
                rows={3}
                value={editForm.notes}
                onChange={e => setEditForm(f => ({ ...f, notes: e.target.value }))}
                placeholder="Ajouter une note (corrections, observations...)"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Géométrie et surface non modifiables ici (nécessite un nouveau dépôt). Toute modification est tracée dans l'audit log.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)} disabled={saving}>Annuler</Button>
            <Button onClick={saveEdit} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              Enregistrer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminSubdivisionLots;

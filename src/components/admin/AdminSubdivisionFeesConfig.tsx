import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, DollarSign, Loader2, Calculator } from 'lucide-react';

interface RateConfig {
  id: string;
  section_type: string;
  location_name: string;
  rate_per_sqm_usd: number;
  min_fee_per_lot_usd: number | null;
  max_fee_per_lot_usd: number | null;
  tier_threshold_sqm: number | null;
  tier_rate_per_sqm_usd: number | null;
  road_fee_per_linear_m_usd: number | null;
  common_space_fee_per_sqm_usd: number | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

const AdminSubdivisionFeesConfig: React.FC = () => {
  const [rates, setRates] = useState<RateConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'urban' | 'rural'>('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<RateConfig | null>(null);
  const [saving, setSaving] = useState(false);

  // Fee calculator
  const [calc, setCalc] = useState({ rateId: '', lotCount: '5', avgLotSqm: '200', roadLengthM: '0', commonSpaceSqm: '0' });

  const [form, setForm] = useState({
    section_type: 'urban',
    location_name: '',
    rate_per_sqm_usd: '0.5',
    min_fee_per_lot_usd: '5',
    max_fee_per_lot_usd: '',
    tier_threshold_sqm: '',
    tier_rate_per_sqm_usd: '',
    road_fee_per_linear_m_usd: '',
    common_space_fee_per_sqm_usd: '',
    is_active: true,
  });

  const fetchRates = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('subdivision_rate_config' as any)
      .select('*')
      .order('section_type')
      .order('location_name');
    
    if (error) {
      toast.error('Erreur de chargement des tarifs');
      console.error(error);
    } else {
      setRates((data as any[]) || []);
    }
    setLoading(false);
  };

  useEffect(() => { fetchRates(); }, []);

  const openAdd = () => {
    setEditing(null);
    setForm({ section_type: 'urban', location_name: '', rate_per_sqm_usd: '0.5', min_fee_per_lot_usd: '5', max_fee_per_lot_usd: '', tier_threshold_sqm: '', tier_rate_per_sqm_usd: '', road_fee_per_linear_m_usd: '', common_space_fee_per_sqm_usd: '', is_active: true });
    setDialogOpen(true);
  };

  const openEdit = (r: RateConfig) => {
    setEditing(r);
    setForm({
      section_type: r.section_type,
      location_name: r.location_name,
      rate_per_sqm_usd: String(r.rate_per_sqm_usd),
      min_fee_per_lot_usd: r.min_fee_per_lot_usd != null ? String(r.min_fee_per_lot_usd) : '',
      max_fee_per_lot_usd: r.max_fee_per_lot_usd != null ? String(r.max_fee_per_lot_usd) : '',
      tier_threshold_sqm: r.tier_threshold_sqm != null ? String(r.tier_threshold_sqm) : '',
      tier_rate_per_sqm_usd: r.tier_rate_per_sqm_usd != null ? String(r.tier_rate_per_sqm_usd) : '',
      road_fee_per_linear_m_usd: r.road_fee_per_linear_m_usd != null ? String(r.road_fee_per_linear_m_usd) : '',
      common_space_fee_per_sqm_usd: r.common_space_fee_per_sqm_usd != null ? String(r.common_space_fee_per_sqm_usd) : '',
      is_active: r.is_active,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.location_name.trim()) {
      toast.error('Le nom de l\'emplacement est requis');
      return;
    }
    setSaving(true);
    const payload = {
      section_type: form.section_type,
      location_name: form.location_name.trim(),
      rate_per_sqm_usd: parseFloat(form.rate_per_sqm_usd) || 0,
      min_fee_per_lot_usd: form.min_fee_per_lot_usd ? parseFloat(form.min_fee_per_lot_usd) : null,
      max_fee_per_lot_usd: form.max_fee_per_lot_usd ? parseFloat(form.max_fee_per_lot_usd) : null,
      tier_threshold_sqm: form.tier_threshold_sqm ? parseFloat(form.tier_threshold_sqm) : null,
      tier_rate_per_sqm_usd: form.tier_rate_per_sqm_usd ? parseFloat(form.tier_rate_per_sqm_usd) : null,
      road_fee_per_linear_m_usd: form.road_fee_per_linear_m_usd ? parseFloat(form.road_fee_per_linear_m_usd) : null,
      common_space_fee_per_sqm_usd: form.common_space_fee_per_sqm_usd ? parseFloat(form.common_space_fee_per_sqm_usd) : null,
      is_active: form.is_active,
      updated_at: new Date().toISOString(),
    };

    let error;
    if (editing) {
      ({ error } = await supabase.from('subdivision_rate_config' as any).update(payload as any).eq('id', editing.id));
    } else {
      ({ error } = await supabase.from('subdivision_rate_config' as any).insert(payload as any));
    }

    if (error) {
      toast.error(error.message.includes('duplicate') ? 'Un tarif existe déjà pour cet emplacement et type de section' : 'Erreur lors de la sauvegarde');
      console.error(error);
    } else {
      toast.success(editing ? 'Tarif mis à jour' : 'Tarif ajouté');
      setDialogOpen(false);
      fetchRates();
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer ce tarif ?')) return;
    const { error } = await supabase.from('subdivision_rate_config' as any).delete().eq('id', id);
    if (error) {
      toast.error('Erreur lors de la suppression');
    } else {
      toast.success('Tarif supprimé');
      fetchRates();
    }
  };

  const toggleActive = async (r: RateConfig) => {
    const { error } = await supabase.from('subdivision_rate_config' as any).update({ is_active: !r.is_active, updated_at: new Date().toISOString() } as any).eq('id', r.id);
    if (!error) {
      fetchRates();
    }
  };

  const filtered = filter === 'all' ? rates : rates.filter(r => r.section_type === filter);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <DollarSign className="h-4 w-4" />
            Configuration des Frais de Lotissement
          </CardTitle>
          <Button size="sm" onClick={openAdd}><Plus className="h-4 w-4 mr-1" /> Ajouter</Button>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground mb-3">
            Les frais sont calculés <strong>par lot</strong> : surface du lot × tarif/m². Utilisez <code>*</code> comme emplacement pour un tarif par défaut.
          </p>

          <div className="flex gap-2 mb-3">
            {(['all', 'urban', 'rural'] as const).map(f => (
              <Button key={f} variant={filter === f ? 'default' : 'outline'} size="sm" onClick={() => setFilter(f)}>
                {f === 'all' ? 'Tous' : f === 'urban' ? 'Urbain' : 'Rural'}
              </Button>
            ))}
          </div>

          {loading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Section</TableHead>
                    <TableHead>Emplacement</TableHead>
                    <TableHead className="text-right">Tarif/m² (USD)</TableHead>
                    <TableHead className="text-right">Palier dégressif</TableHead>
                    <TableHead className="text-right">Min/lot</TableHead>
                    <TableHead className="text-right">Max/lot</TableHead>
                    <TableHead className="text-right">Voirie ($/ml)</TableHead>
                    <TableHead className="text-right">Esp. communs ($/m²)</TableHead>
                    <TableHead>Actif</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map(r => (
                    <TableRow key={r.id}>
                      <TableCell>
                        <Badge variant={r.section_type === 'urban' ? 'default' : 'secondary'}>
                          {r.section_type === 'urban' ? 'Urbain' : 'Rural'}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium">
                        {r.location_name === '*' ? <span className="italic text-muted-foreground">Par défaut</span> : r.location_name}
                      </TableCell>
                      <TableCell className="text-right font-mono">{r.rate_per_sqm_usd}</TableCell>
                      <TableCell className="text-right font-mono text-xs">
                        {r.tier_threshold_sqm && r.tier_rate_per_sqm_usd
                          ? <>&gt; {r.tier_threshold_sqm} m² → {r.tier_rate_per_sqm_usd}$</>
                          : '—'}
                      </TableCell>
                      <TableCell className="text-right font-mono">{r.min_fee_per_lot_usd ?? '—'}</TableCell>
                      <TableCell className="text-right font-mono">{r.max_fee_per_lot_usd ?? '—'}</TableCell>
                      <TableCell className="text-right font-mono">{r.road_fee_per_linear_m_usd ?? '—'}</TableCell>
                      <TableCell className="text-right font-mono">{r.common_space_fee_per_sqm_usd ?? '—'}</TableCell>
                      <TableCell>
                        <Switch checked={r.is_active} onCheckedChange={() => toggleActive(r)} />
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(r)}><Pencil className="h-3 w-3" /></Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDelete(r.id)}><Trash2 className="h-3 w-3" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {filtered.length === 0 && (
                    <TableRow><TableCell colSpan={11} className="text-center text-muted-foreground py-6">Aucun tarif configuré</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Fee calculator preview */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Calculator className="h-4 w-4" />
            Aperçu de calcul
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2 mb-3">
            <div>
              <Label className="text-xs">Tarif</Label>
              <Select value={calc.rateId} onValueChange={v => setCalc(c => ({ ...c, rateId: v }))}>
                <SelectTrigger><SelectValue placeholder="Choisir..." /></SelectTrigger>
                <SelectContent>
                  {rates.filter(r => r.is_active).map(r => (
                    <SelectItem key={r.id} value={r.id}>{r.section_type === 'urban' ? '🏙️' : '🌾'} {r.location_name === '*' ? 'Défaut' : r.location_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Nb lots</Label>
              <Input type="number" min="1" value={calc.lotCount} onChange={e => setCalc(c => ({ ...c, lotCount: e.target.value }))} />
            </div>
            <div>
              <Label className="text-xs">Surface moy./lot (m²)</Label>
              <Input type="number" min="1" value={calc.avgLotSqm} onChange={e => setCalc(c => ({ ...c, avgLotSqm: e.target.value }))} />
            </div>
            <div>
              <Label className="text-xs">Voirie (m linéaire)</Label>
              <Input type="number" min="0" value={calc.roadLengthM} onChange={e => setCalc(c => ({ ...c, roadLengthM: e.target.value }))} />
            </div>
            <div>
              <Label className="text-xs">Esp. communs (m²)</Label>
              <Input type="number" min="0" value={calc.commonSpaceSqm} onChange={e => setCalc(c => ({ ...c, commonSpaceSqm: e.target.value }))} />
            </div>
          </div>
          {(() => {
            const r = rates.find(x => x.id === calc.rateId);
            if (!r) return <p className="text-xs text-muted-foreground">Sélectionnez un tarif pour voir l'aperçu.</p>;
            const lots = parseInt(calc.lotCount) || 0;
            const avg = parseFloat(calc.avgLotSqm) || 0;
            const roadM = parseFloat(calc.roadLengthM) || 0;
            const commonM2 = parseFloat(calc.commonSpaceSqm) || 0;
            // Per-lot fee with optional tier
            let feePerLot: number;
            if (r.tier_threshold_sqm && r.tier_rate_per_sqm_usd && avg > r.tier_threshold_sqm) {
              feePerLot = r.tier_threshold_sqm * r.rate_per_sqm_usd + (avg - r.tier_threshold_sqm) * r.tier_rate_per_sqm_usd;
            } else {
              feePerLot = avg * r.rate_per_sqm_usd;
            }
            if (r.min_fee_per_lot_usd != null) feePerLot = Math.max(feePerLot, r.min_fee_per_lot_usd);
            if (r.max_fee_per_lot_usd != null) feePerLot = Math.min(feePerLot, r.max_fee_per_lot_usd);
            const lotsTotal = feePerLot * lots;
            const roadTotal = roadM * (r.road_fee_per_linear_m_usd || 0);
            const commonTotal = commonM2 * (r.common_space_fee_per_sqm_usd || 0);
            const total = lotsTotal + roadTotal + commonTotal;
            return (
              <div className="rounded-md border bg-muted/30 p-3 space-y-1 text-sm">
                <div className="flex justify-between"><span>Frais par lot</span><span className="font-mono">${feePerLot.toFixed(2)}</span></div>
                <div className="flex justify-between"><span>{lots} lots</span><span className="font-mono">${lotsTotal.toFixed(2)}</span></div>
                {roadTotal > 0 && <div className="flex justify-between text-muted-foreground"><span>Voirie ({roadM} ml)</span><span className="font-mono">${roadTotal.toFixed(2)}</span></div>}
                {commonTotal > 0 && <div className="flex justify-between text-muted-foreground"><span>Espaces communs ({commonM2} m²)</span><span className="font-mono">${commonTotal.toFixed(2)}</span></div>}
                <div className="flex justify-between border-t pt-1 font-semibold"><span>Total estimé</span><span className="font-mono text-primary">${total.toFixed(2)}</span></div>
                <p className="text-[11px] text-muted-foreground italic mt-1">Calcul indicatif. Le calcul officiel reste exécuté côté serveur (edge function <code>subdivision-request</code>).</p>
              </div>
            );
          })()}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? 'Modifier le tarif' : 'Ajouter un tarif'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Type de section</Label>
              <Select value={form.section_type} onValueChange={v => setForm(f => ({ ...f, section_type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="urban">Urbain (Quartier)</SelectItem>
                  <SelectItem value="rural">Rural (Village)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Emplacement</Label>
              <Input value={form.location_name} onChange={e => setForm(f => ({ ...f, location_name: e.target.value }))} placeholder="Nom du quartier/village ou * pour défaut" />
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <Label>Tarif/m² (USD)</Label>
                <Input type="number" step="0.01" value={form.rate_per_sqm_usd} onChange={e => setForm(f => ({ ...f, rate_per_sqm_usd: e.target.value }))} />
              </div>
              <div>
                <Label>Min/lot (USD)</Label>
                <Input type="number" step="0.01" value={form.min_fee_per_lot_usd} onChange={e => setForm(f => ({ ...f, min_fee_per_lot_usd: e.target.value }))} placeholder="Optionnel" />
              </div>
              <div>
                <Label>Max/lot (USD)</Label>
                <Input type="number" step="0.01" value={form.max_fee_per_lot_usd} onChange={e => setForm(f => ({ ...f, max_fee_per_lot_usd: e.target.value }))} placeholder="Optionnel" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>Seuil dégressif (m²)</Label>
                <Input type="number" step="1" value={form.tier_threshold_sqm} onChange={e => setForm(f => ({ ...f, tier_threshold_sqm: e.target.value }))} placeholder="Ex: 500" />
              </div>
              <div>
                <Label>Tarif au-delà du seuil ($/m²)</Label>
                <Input type="number" step="0.01" value={form.tier_rate_per_sqm_usd} onChange={e => setForm(f => ({ ...f, tier_rate_per_sqm_usd: e.target.value }))} placeholder="Ex: 0.30" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>Voirie ($ / m linéaire)</Label>
                <Input type="number" step="0.01" value={form.road_fee_per_linear_m_usd} onChange={e => setForm(f => ({ ...f, road_fee_per_linear_m_usd: e.target.value }))} placeholder="Optionnel" />
              </div>
              <div>
                <Label>Espaces communs ($/m²)</Label>
                <Input type="number" step="0.01" value={form.common_space_fee_per_sqm_usd} onChange={e => setForm(f => ({ ...f, common_space_fee_per_sqm_usd: e.target.value }))} placeholder="Optionnel" />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={form.is_active} onCheckedChange={v => setForm(f => ({ ...f, is_active: v }))} />
              <Label>Actif</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Annuler</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              {editing ? 'Mettre à jour' : 'Ajouter'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminSubdivisionFeesConfig;

import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Pencil, Save } from 'lucide-react';
import { logBillingAudit } from '@/utils/billingAudit';

type Fee = {
  id: string;
  title_type: string;
  fee_category: string;
  fee_name: string;
  description: string | null;
  base_amount_usd: number;
  urban_surcharge_usd: number | null;
  is_mandatory: boolean;
  is_active: boolean;
  display_order: number | null;
  updated_at: string;
};

const TITLE_TYPES = [
  { key: 'all', label: 'Tous les titres' },
  { key: 'certificat_enregistrement', label: "Certificat d'enregistrement" },
  { key: 'concession_perpetuelle', label: 'Concession perpétuelle' },
  { key: 'bail_emphyteotique', label: 'Bail emphytéotique' },
  { key: 'concession_ordinaire', label: 'Concession ordinaire' },
];

const AdminLandTitleFeesConfig = () => {
  const { toast } = useToast();
  const [fees, setFees] = useState<Fee[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState('all');
  const [edit, setEdit] = useState<Fee | null>(null);
  const [editAmount, setEditAmount] = useState('');
  const [editSurcharge, setEditSurcharge] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('land_title_fees_by_type')
        .select('*')
        .order('title_type').order('display_order');
      if (error) throw error;
      setFees((data as unknown as Fee[]) || []);
    } catch (e) {
      console.error('[LandTitleFees] load', e);
      toast({ title: 'Erreur', description: 'Chargement impossible', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => filter === 'all' ? fees : fees.filter(f => f.title_type === filter), [fees, filter]);

  const save = async () => {
    if (!edit) return;
    try {
      const newAmount = parseFloat(editAmount);
      const newSurcharge = editSurcharge ? parseFloat(editSurcharge) : null;
      const { error } = await supabase
        .from('land_title_fees_by_type')
        .update({ base_amount_usd: newAmount, urban_surcharge_usd: newSurcharge })
        .eq('id', edit.id);
      if (error) throw error;
      await logBillingAudit({
        tableName: 'land_title_fees_by_type',
        recordId: edit.id,
        action: 'update',
        oldValues: { base_amount_usd: edit.base_amount_usd, urban_surcharge_usd: edit.urban_surcharge_usd },
        newValues: { base_amount_usd: newAmount, urban_surcharge_usd: newSurcharge },
      });
      toast({ title: 'Frais mis à jour' });
      setEdit(null);
      load();
    } catch (e: any) {
      console.error('[LandTitleFees] save', e);
      toast({ title: 'Erreur', description: e.message, variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="p-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
            <div>
              <CardTitle className="text-base md:text-lg">Frais de titre foncier ({filtered.length})</CardTitle>
              <CardDescription className="text-xs">Tarifs modulaires par type de titre</CardDescription>
            </div>
            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger className="w-full sm:w-[220px] h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {TITLE_TYPES.map(t => <SelectItem key={t.key} value={t.key}>{t.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="p-2 md:p-4">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Titre</TableHead>
                  <TableHead className="text-xs">Catégorie</TableHead>
                  <TableHead className="text-xs">Frais</TableHead>
                  <TableHead className="text-xs text-right">Montant USD</TableHead>
                  <TableHead className="text-xs text-right">Suppl. urbain</TableHead>
                  <TableHead className="text-xs">Statut</TableHead>
                  <TableHead className="text-xs text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(f => (
                  <TableRow key={f.id}>
                    <TableCell className="text-[10px]"><Badge variant="outline">{f.title_type}</Badge></TableCell>
                    <TableCell className="text-xs">{f.fee_category}</TableCell>
                    <TableCell className="text-xs font-medium">{f.fee_name}</TableCell>
                    <TableCell className="text-xs text-right font-semibold">${Number(f.base_amount_usd).toFixed(2)}</TableCell>
                    <TableCell className="text-xs text-right">{f.urban_surcharge_usd != null ? `+$${Number(f.urban_surcharge_usd).toFixed(2)}` : '—'}</TableCell>
                    <TableCell><Badge variant={f.is_active ? 'default' : 'secondary'} className="text-[10px]">{f.is_active ? 'actif' : 'inactif'}</Badge></TableCell>
                    <TableCell className="text-right">
                      <Dialog open={edit?.id === f.id} onOpenChange={(o) => !o && setEdit(null)}>
                        <DialogTrigger asChild>
                          <Button variant="ghost" size="sm" onClick={() => {
                            setEdit(f);
                            setEditAmount(String(f.base_amount_usd));
                            setEditSurcharge(f.urban_surcharge_usd != null ? String(f.urban_surcharge_usd) : '');
                          }}><Pencil className="h-3.5 w-3.5" /></Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-md">
                          <DialogHeader>
                            <DialogTitle className="text-base">Modifier les frais</DialogTitle>
                            <DialogDescription className="text-xs">{f.fee_name}</DialogDescription>
                          </DialogHeader>
                          <div className="space-y-3 py-2">
                            <div className="space-y-1">
                              <Label className="text-xs">Montant de base (USD)</Label>
                              <Input type="number" step="0.01" value={editAmount} onChange={(e) => setEditAmount(e.target.value)} />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs">Supplément urbain (USD, optionnel)</Label>
                              <Input type="number" step="0.01" value={editSurcharge} onChange={(e) => setEditSurcharge(e.target.value)} />
                            </div>
                          </div>
                          <DialogFooter>
                            <Button size="sm" onClick={save}><Save className="h-3.5 w-3.5 mr-1" />Enregistrer</Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    </TableCell>
                  </TableRow>
                ))}
                {filtered.length === 0 && !loading && (
                  <TableRow><TableCell colSpan={7} className="text-center text-xs text-muted-foreground py-6">Aucun frais</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminLandTitleFeesConfig;

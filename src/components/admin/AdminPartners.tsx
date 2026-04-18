import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Pencil, Trash2, GripVertical, ExternalLink, ArrowUp, ArrowDown } from 'lucide-react';
import { toast } from 'sonner';

interface Partner {
  id: string;
  name: string;
  logo_url: string | null;
  website_url: string | null;
  display_order: number;
  is_active: boolean;
  created_at: string;
}

const AdminPartners = () => {
  const [partners, setPartners] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Partner | null>(null);
  const [form, setForm] = useState({ name: '', website_url: '', display_order: 0, is_active: true });
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [dragId, setDragId] = useState<string | null>(null);
  const [reordering, setReordering] = useState(false);

  const fetchPartners = async () => {
    setLoading(true);
    const { data } = await (supabase as any).from('partners')
      .select('*')
      .is('deleted_at', null)
      .order('display_order', { ascending: true });
    setPartners(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchPartners(); }, []);

  const persistOrder = async (ordered: Partner[]) => {
    setReordering(true);
    setPartners(ordered);
    try {
      // Mise à jour séquentielle (5-50 lignes max attendues)
      const updates = ordered.map((p, idx) =>
        (supabase as any).from('partners').update({ display_order: idx }).eq('id', p.id)
      );
      const results = await Promise.all(updates);
      if (results.some(r => r.error)) throw new Error('Réordonnancement partiel');
      toast.success('Ordre mis à jour');
    } catch (e: any) {
      toast.error(e.message || 'Erreur réordonnancement');
      fetchPartners();
    } finally {
      setReordering(false);
    }
  };

  const moveBy = (id: string, delta: number) => {
    const idx = partners.findIndex(p => p.id === id);
    if (idx < 0) return;
    const target = idx + delta;
    if (target < 0 || target >= partners.length) return;
    const next = [...partners];
    [next[idx], next[target]] = [next[target], next[idx]];
    persistOrder(next);
  };

  const onDragStart = (id: string) => setDragId(id);
  const onDragOver = (e: React.DragEvent) => e.preventDefault();
  const onDrop = (targetId: string) => {
    if (!dragId || dragId === targetId) { setDragId(null); return; }
    const src = partners.findIndex(p => p.id === dragId);
    const tgt = partners.findIndex(p => p.id === targetId);
    if (src < 0 || tgt < 0) return;
    const next = [...partners];
    const [moved] = next.splice(src, 1);
    next.splice(tgt, 0, moved);
    setDragId(null);
    persistOrder(next);
  };

  const openCreate = () => {
    setEditing(null);
    setForm({ name: '', website_url: '', display_order: partners.length, is_active: true });
    setLogoFile(null);
    setDialogOpen(true);
  };

  const openEdit = (p: Partner) => {
    setEditing(p);
    setForm({ name: p.name, website_url: p.website_url || '', display_order: p.display_order, is_active: p.is_active });
    setLogoFile(null);
    setDialogOpen(true);
  };

  const uploadLogo = async (file: File): Promise<string> => {
    const ext = file.name.split('.').pop();
    const path = `${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from('partners').upload(path, file);
    if (error) throw error;
    const { data } = supabase.storage.from('partners').getPublicUrl(path);
    return data.publicUrl;
  };

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error('Le nom est requis'); return; }
    setSaving(true);
    try {
      let logo_url = editing?.logo_url || null;
      if (logoFile) {
        logo_url = await uploadLogo(logoFile);
      }

      const payload = {
        name: form.name.trim(),
        website_url: form.website_url.trim() || null,
        display_order: form.display_order,
        is_active: form.is_active,
        logo_url,
        updated_at: new Date().toISOString(),
      };

      if (editing) {
        const { error } = await (supabase as any).from('partners').update(payload).eq('id', editing.id);
        if (error) throw error;
        toast.success('Partenaire mis à jour');
      } else {
        const { error } = await (supabase as any).from('partners').insert(payload);
        if (error) throw error;
        toast.success('Partenaire ajouté');
      }
      setDialogOpen(false);
      fetchPartners();
    } catch (e: any) {
      toast.error(e.message || 'Erreur');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer ce partenaire ?')) return;
    const { error } = await (supabase as any).from('partners')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id);
    if (error) { toast.error(error.message); return; }
    toast.success('Partenaire supprimé (corbeille)');
    fetchPartners();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg md:text-xl font-bold">Partenaires</h2>
          <p className="text-sm text-muted-foreground">Gérez les partenaires affichés sur la page d'accueil</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" onClick={openCreate}><Plus className="h-4 w-4 mr-1" /> Ajouter</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editing ? 'Modifier le partenaire' : 'Nouveau partenaire'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Nom *</Label>
                <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
              </div>
              <div>
                <Label>Site web</Label>
                <Input value={form.website_url} onChange={e => setForm(f => ({ ...f, website_url: e.target.value }))} placeholder="https://..." />
              </div>
              <div>
                <Label>Logo</Label>
                {editing?.logo_url && !logoFile && (
                  <img src={editing.logo_url} alt="" className="h-12 mb-2 object-contain" />
                )}
                <Input type="file" accept="image/*" onChange={e => setLogoFile(e.target.files?.[0] || null)} />
              </div>
              <div>
                <Label>Ordre d'affichage</Label>
                <Input type="number" value={form.display_order} onChange={e => setForm(f => ({ ...f, display_order: parseInt(e.target.value) || 0 }))} />
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={form.is_active} onCheckedChange={v => setForm(f => ({ ...f, is_active: v }))} />
                <Label>Actif</Label>
              </div>
              <Button onClick={handleSave} disabled={saving} className="w-full">
                {saving ? 'Enregistrement...' : 'Enregistrer'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">#</TableHead>
                <TableHead>Logo</TableHead>
                <TableHead>Nom</TableHead>
                <TableHead className="hidden md:table-cell">Site web</TableHead>
                <TableHead>Actif</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Chargement...</TableCell></TableRow>
              ) : partners.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Aucun partenaire</TableCell></TableRow>
              ) : partners.map((p, idx) => (
                <TableRow
                  key={p.id}
                  draggable
                  onDragStart={() => onDragStart(p.id)}
                  onDragOver={onDragOver}
                  onDrop={() => onDrop(p.id)}
                  className={`${dragId === p.id ? 'opacity-50' : ''} ${reordering ? 'pointer-events-none' : ''}`}
                >
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
                      <span className="text-muted-foreground text-xs">{idx}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {p.logo_url ? (
                      <img src={p.logo_url} alt={p.name} className="h-8 w-auto object-contain" />
                    ) : (
                      <div className="h-8 w-8 rounded bg-muted flex items-center justify-center text-xs font-bold text-muted-foreground">
                        {p.name.charAt(0)}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="font-medium">{p.name}</TableCell>
                  <TableCell className="hidden md:table-cell">
                    {p.website_url && (
                      <a href={p.website_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline flex items-center gap-1 text-xs">
                        <ExternalLink className="h-3 w-3" /> Lien
                      </a>
                    )}
                  </TableCell>
                  <TableCell>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${p.is_active ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
                      {p.is_active ? 'Oui' : 'Non'}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" disabled={idx === 0 || reordering} onClick={() => moveBy(p.id, -1)} title="Monter">
                        <ArrowUp className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" disabled={idx === partners.length - 1 || reordering} onClick={() => moveBy(p.id, 1)} title="Descendre">
                        <ArrowDown className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => openEdit(p)}><Pencil className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(p.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminPartners;

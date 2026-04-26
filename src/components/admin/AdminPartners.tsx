import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { untypedTables } from '@/integrations/supabase/untyped';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Pencil, Trash2, GripVertical, ExternalLink, ArrowUp, ArrowDown, RotateCcw, Trash } from 'lucide-react';
import { toast } from 'sonner';
import {
  normalizeWebsiteUrl, validateLogoFile, extractPartnerStoragePath,
} from '@/lib/partnerValidation';

interface Partner {
  id: string;
  name: string;
  logo_url: string | null;
  website_url: string | null;
  display_order: number;
  is_active: boolean;
  created_at: string;
  deleted_at: string | null;
}

const AdminPartners = () => {
  const [partners, setPartners] = useState<Partner[]>([]);
  const [trashed, setTrashed] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Partner | null>(null);
  const [form, setForm] = useState({ name: '', website_url: '', is_active: true });
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [dragId, setDragId] = useState<string | null>(null);
  const [reordering, setReordering] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<Partner | null>(null);
  const [confirmHardDelete, setConfirmHardDelete] = useState<Partner | null>(null);

  const fetchAll = async () => {
    setLoading(true);
    const [activeRes, trashRes] = await Promise.all([
      untypedTables.partners().select('*').is('deleted_at', null).order('display_order', { ascending: true }),
      untypedTables.partners().select('*').not('deleted_at', 'is', null).order('deleted_at', { ascending: false }),
    ]);
    setPartners(activeRes.data || []);
    setTrashed(trashRes.data || []);
    setLoading(false);
  };

  useEffect(() => { fetchAll(); }, []);

  // Cleanup preview blob URL
  useEffect(() => {
    if (!logoFile) { setLogoPreview(null); return; }
    const url = URL.createObjectURL(logoFile);
    setLogoPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [logoFile]);

  const persistOrder = async (ordered: Partner[]) => {
    setReordering(true);
    setPartners(ordered);
    try {
      const updates = ordered.map((p, idx) =>
        untypedTables.partners().update({ display_order: idx }).eq('id', p.id)
      );
      const results = await Promise.all(updates);
      if (results.some(r => r.error)) throw new Error('Réordonnancement partiel');
      toast.success('Ordre mis à jour');
    } catch (e: any) {
      toast.error(e.message || 'Erreur réordonnancement');
      fetchAll();
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
    setForm({ name: '', website_url: '', is_active: true });
    setLogoFile(null);
    setDialogOpen(true);
  };

  const openEdit = (p: Partner) => {
    setEditing(p);
    setForm({ name: p.name, website_url: p.website_url || '', is_active: p.is_active });
    setLogoFile(null);
    setDialogOpen(true);
  };

  const onLogoChange = (file: File | null) => {
    if (!file) { setLogoFile(null); return; }
    try {
      validateLogoFile(file);
      setLogoFile(file);
    } catch (e: any) {
      toast.error(e.message);
      setLogoFile(null);
    }
  };

  const uploadLogo = async (file: File): Promise<string> => {
    const ext = file.name.split('.').pop();
    const path = `${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from('partners').upload(path, file);
    if (error) throw error;
    const { data } = supabase.storage.from('partners').getPublicUrl(path);
    return data.publicUrl;
  };

  const removeStorageLogo = async (publicUrl: string | null) => {
    const path = extractPartnerStoragePath(publicUrl);
    if (!path) return;
    await supabase.storage.from('partners').remove([path]);
  };

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error('Le nom est requis'); return; }
    let normalizedUrl: string | null;
    try {
      normalizedUrl = normalizeWebsiteUrl(form.website_url);
    } catch (e: any) {
      toast.error(e.message);
      return;
    }

    setSaving(true);
    try {
      let logo_url = editing?.logo_url || null;
      let oldLogoToRemove: string | null = null;
      if (logoFile) {
        oldLogoToRemove = editing?.logo_url ?? null;
        logo_url = await uploadLogo(logoFile);
      }

      const payload = {
        name: form.name.trim(),
        website_url: normalizedUrl,
        is_active: form.is_active,
        logo_url,
        updated_at: new Date().toISOString(),
      };

      if (editing) {
        const { error } = await untypedTables.partners().update(payload).eq('id', editing.id);
        if (error) throw error;
        toast.success('Partenaire mis à jour');
      } else {
        const { error } = await untypedTables.partners().insert({
          ...payload,
          display_order: partners.length,
        });
        if (error) throw error;
        toast.success('Partenaire ajouté');
      }

      // Purge ancien logo (best-effort, ne bloque pas la sauvegarde)
      if (oldLogoToRemove) {
        removeStorageLogo(oldLogoToRemove).catch(() => {/* silent */});
      }

      setDialogOpen(false);
      fetchAll();
    } catch (e: any) {
      toast.error(e.message || 'Erreur');
    } finally {
      setSaving(false);
    }
  };

  const handleSoftDelete = async () => {
    if (!confirmDelete) return;
    const id = confirmDelete.id;
    setConfirmDelete(null);
    const { error } = await untypedTables.partners()
      .update({ deleted_at: new Date().toISOString(), is_active: false })
      .eq('id', id);
    if (error) { toast.error(error.message); return; }
    toast.success('Partenaire envoyé dans la corbeille');
    fetchAll();
  };

  const handleRestore = async (id: string) => {
    const { error } = await untypedTables.partners()
      .update({ deleted_at: null }).eq('id', id);
    if (error) { toast.error(error.message); return; }
    toast.success('Partenaire restauré');
    fetchAll();
  };

  const handleHardDelete = async () => {
    if (!confirmHardDelete) return;
    const p = confirmHardDelete;
    setConfirmHardDelete(null);
    const { error } = await untypedTables.partners().delete().eq('id', p.id);
    if (error) { toast.error(error.message); return; }
    if (p.logo_url) removeStorageLogo(p.logo_url).catch(() => {/* silent */});
    toast.success('Partenaire supprimé définitivement');
    fetchAll();
  };

  const previewSrc = useMemo(() => logoPreview ?? editing?.logo_url ?? null, [logoPreview, editing]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
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
                <Label htmlFor="partner-name">Nom *</Label>
                <Input
                  id="partner-name"
                  value={form.name}
                  maxLength={120}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="partner-url">Site web</Label>
                <Input
                  id="partner-url"
                  value={form.website_url}
                  maxLength={500}
                  onChange={e => setForm(f => ({ ...f, website_url: e.target.value }))}
                  placeholder="https://exemple.org"
                />
                <p className="text-[11px] text-muted-foreground mt-1">
                  Le préfixe https:// sera ajouté automatiquement si absent.
                </p>
              </div>
              <div>
                <Label htmlFor="partner-logo">Logo</Label>
                {previewSrc && (
                  <img src={previewSrc} alt="" className="h-12 mb-2 object-contain bg-muted/30 rounded p-1" />
                )}
                <Input
                  id="partner-logo"
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/svg+xml"
                  onChange={e => onLogoChange(e.target.files?.[0] || null)}
                />
                <p className="text-[11px] text-muted-foreground mt-1">
                  PNG, JPEG, WebP ou SVG — max 2 Mo
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  id="partner-active"
                  checked={form.is_active}
                  onCheckedChange={v => setForm(f => ({ ...f, is_active: v }))}
                />
                <Label htmlFor="partner-active">Actif (visible sur la page d'accueil)</Label>
              </div>
              <Button onClick={handleSave} disabled={saving} className="w-full">
                {saving ? 'Enregistrement...' : 'Enregistrer'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue="active" className="w-full">
        <TabsList>
          <TabsTrigger value="active">Actifs ({partners.length})</TabsTrigger>
          <TabsTrigger value="trash">Corbeille ({trashed.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="mt-4">
          <Card>
            <CardContent className="p-0 overflow-x-auto">
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
                          <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" aria-hidden="true" />
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
                          <a
                            href={p.website_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary hover:underline flex items-center gap-1 text-xs"
                          >
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
                          <Button
                            variant="ghost" size="icon"
                            disabled={idx === 0 || reordering}
                            onClick={() => moveBy(p.id, -1)}
                            aria-label={`Monter ${p.name}`}
                          >
                            <ArrowUp className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost" size="icon"
                            disabled={idx === partners.length - 1 || reordering}
                            onClick={() => moveBy(p.id, 1)}
                            aria-label={`Descendre ${p.name}`}
                          >
                            <ArrowDown className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost" size="icon"
                            onClick={() => openEdit(p)}
                            aria-label={`Modifier ${p.name}`}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost" size="icon"
                            onClick={() => setConfirmDelete(p)}
                            aria-label={`Supprimer ${p.name}`}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="trash" className="mt-4">
          <Card>
            <CardContent className="p-0 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Logo</TableHead>
                    <TableHead>Nom</TableHead>
                    <TableHead className="hidden md:table-cell">Supprimé le</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {trashed.length === 0 ? (
                    <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">Corbeille vide</TableCell></TableRow>
                  ) : trashed.map(p => (
                    <TableRow key={p.id}>
                      <TableCell>
                        {p.logo_url ? (
                          <img src={p.logo_url} alt={p.name} className="h-8 w-auto object-contain opacity-60" />
                        ) : (
                          <div className="h-8 w-8 rounded bg-muted flex items-center justify-center text-xs font-bold text-muted-foreground">
                            {p.name.charAt(0)}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="font-medium text-muted-foreground">{p.name}</TableCell>
                      <TableCell className="hidden md:table-cell text-xs text-muted-foreground">
                        {p.deleted_at ? new Date(p.deleted_at).toLocaleDateString('fr-FR') : '—'}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost" size="icon"
                            onClick={() => handleRestore(p.id)}
                            aria-label={`Restaurer ${p.name}`}
                            title="Restaurer"
                          >
                            <RotateCcw className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost" size="icon"
                            onClick={() => setConfirmHardDelete(p)}
                            aria-label={`Supprimer définitivement ${p.name}`}
                            title="Supprimer définitivement"
                          >
                            <Trash className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <AlertDialog open={!!confirmDelete} onOpenChange={(o) => !o && setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Envoyer dans la corbeille ?</AlertDialogTitle>
            <AlertDialogDescription>
              « {confirmDelete?.name} » sera retiré de la page d'accueil. Vous pourrez le restaurer depuis l'onglet Corbeille.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleSoftDelete}>Envoyer à la corbeille</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!confirmHardDelete} onOpenChange={(o) => !o && setConfirmHardDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer définitivement ?</AlertDialogTitle>
            <AlertDialogDescription>
              « {confirmHardDelete?.name} » et son logo seront supprimés définitivement. Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleHardDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Supprimer définitivement
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AdminPartners;

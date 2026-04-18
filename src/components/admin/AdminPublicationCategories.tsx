import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Pencil, Loader2, Tags } from 'lucide-react';
import { toast } from 'sonner';

interface PublicationCategory {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  display_order: number;
  is_active: boolean;
}

const slugify = (s: string) =>
  s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

const AdminPublicationCategories: React.FC = () => {
  const [items, setItems] = useState<PublicationCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<PublicationCategory | null>(null);
  const [form, setForm] = useState({ slug: '', name: '', description: '', display_order: 0, is_active: true });
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from('publication_categories')
      .select('*')
      .order('display_order', { ascending: true });
    if (error) toast.error(error.message);
    else setItems(data || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const openCreate = () => {
    setEditing(null);
    setForm({ slug: '', name: '', description: '', display_order: items.length, is_active: true });
    setOpen(true);
  };

  const openEdit = (c: PublicationCategory) => {
    setEditing(c);
    setForm({
      slug: c.slug, name: c.name, description: c.description || '',
      display_order: c.display_order, is_active: c.is_active,
    });
    setOpen(true);
  };

  const save = async () => {
    if (!form.name.trim()) return toast.error('Nom requis');
    const slug = (form.slug.trim() || slugify(form.name)).slice(0, 60);
    if (!slug) return toast.error('Slug invalide');
    setSaving(true);
    const payload = {
      slug,
      name: form.name.trim(),
      description: form.description.trim() || null,
      display_order: form.display_order,
      is_active: form.is_active,
    };
    const { error } = editing
      ? await (supabase as any).from('publication_categories').update(payload).eq('id', editing.id)
      : await (supabase as any).from('publication_categories').insert(payload);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success(editing ? 'Catégorie mise à jour' : 'Catégorie créée');
    setOpen(false);
    load();
  };

  const toggle = async (c: PublicationCategory) => {
    const { error } = await (supabase as any)
      .from('publication_categories')
      .update({ is_active: !c.is_active })
      .eq('id', c.id);
    if (error) toast.error(error.message);
    else load();
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Tags className="h-5 w-5" /> Catégories de publications
            </CardTitle>
            <CardDescription>Gérez les catégories disponibles pour les publications.</CardDescription>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm" onClick={openCreate}>
                <Plus className="h-4 w-4 mr-1" /> Ajouter
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editing ? 'Modifier la catégorie' : 'Nouvelle catégorie'}</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <div>
                  <Label>Nom *</Label>
                  <Input
                    value={form.name}
                    onChange={(e) => setForm({
                      ...form, name: e.target.value,
                      slug: editing ? form.slug : slugify(e.target.value),
                    })}
                  />
                </div>
                <div>
                  <Label>Slug</Label>
                  <Input
                    value={form.slug}
                    onChange={(e) => setForm({ ...form, slug: slugify(e.target.value) })}
                    placeholder="auto-généré depuis le nom"
                  />
                </div>
                <div>
                  <Label>Description</Label>
                  <Textarea
                    rows={2}
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Ordre</Label>
                    <Input
                      type="number"
                      value={form.display_order}
                      onChange={(e) => setForm({ ...form, display_order: parseInt(e.target.value) || 0 })}
                    />
                  </div>
                  <div className="flex items-end gap-2 pb-2">
                    <Switch checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} />
                    <Label>Active</Label>
                  </div>
                </div>
                <Button onClick={save} disabled={saving} className="w-full">
                  {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                  {editing ? 'Mettre à jour' : 'Créer'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>#</TableHead>
              <TableHead>Nom</TableHead>
              <TableHead>Slug</TableHead>
              <TableHead className="hidden md:table-cell">Description</TableHead>
              <TableHead>Active</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={6} className="text-center py-6 text-muted-foreground">Chargement…</TableCell></TableRow>
            ) : items.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center py-6 text-muted-foreground">Aucune catégorie</TableCell></TableRow>
            ) : items.map((c) => (
              <TableRow key={c.id}>
                <TableCell className="text-muted-foreground">{c.display_order}</TableCell>
                <TableCell className="font-medium">{c.name}</TableCell>
                <TableCell className="font-mono text-xs">{c.slug}</TableCell>
                <TableCell className="hidden md:table-cell text-xs text-muted-foreground max-w-[280px] truncate">
                  {c.description || '—'}
                </TableCell>
                <TableCell>
                  <Switch checked={c.is_active} onCheckedChange={() => toggle(c)} />
                </TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="icon" onClick={() => openEdit(c)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};

export default AdminPublicationCategories;

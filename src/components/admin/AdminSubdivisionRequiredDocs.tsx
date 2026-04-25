import React, { useEffect, useState } from 'react';
import { untypedTables } from '@/integrations/supabase/untyped';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, Loader2, FileText, Info } from 'lucide-react';
import {
  invalidateSubdivisionRequiredDocsCache,
  useSubdivisionRequiredDocuments,
  type SubdivisionRequiredDocument,
} from '@/hooks/useSubdivisionRequiredDocuments';
import { useSubdivisionReferences } from '@/hooks/useSubdivisionReferences';

const ALL_MIME = [
  { value: 'image/jpeg', label: 'JPEG' },
  { value: 'image/png', label: 'PNG' },
  { value: 'image/webp', label: 'WebP' },
  { value: 'application/pdf', label: 'PDF' },
];

interface FormState {
  doc_key: string;
  label: string;
  help_text: string;
  is_required: boolean;
  requester_types: string[];
  accepted_mime_types: string[];
  max_size_mb: string;
  display_order: string;
  is_active: boolean;
}

const emptyForm: FormState = {
  doc_key: '',
  label: '',
  help_text: '',
  is_required: true,
  requester_types: [],
  accepted_mime_types: ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'],
  max_size_mb: '5',
  display_order: '0',
  is_active: true,
};

const AdminSubdivisionRequiredDocs: React.FC = () => {
  const [docs, setDocs] = useState<SubdivisionRequiredDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<SubdivisionRequiredDocument | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const { entries: requesterTypes } = useSubdivisionReferences('requester_type');
  // Used only to invalidate the public hook cache after edits
  useSubdivisionRequiredDocuments();

  const fetchDocs = async () => {
    setLoading(true);
    const { data, error } = await untypedTables
      .subdivision_required_documents()
      .select('*')
      .order('display_order');
    if (error) {
      toast.error('Erreur de chargement');
      console.error(error);
    } else {
      setDocs((data as SubdivisionRequiredDocument[]) || []);
    }
    setLoading(false);
  };

  useEffect(() => { fetchDocs(); }, []);

  const openAdd = () => {
    setEditing(null);
    setForm({ ...emptyForm, display_order: String((docs.length + 1) * 10) });
    setDialogOpen(true);
  };

  const openEdit = (d: SubdivisionRequiredDocument) => {
    setEditing(d);
    setForm({
      doc_key: d.doc_key,
      label: d.label,
      help_text: d.help_text ?? '',
      is_required: d.is_required,
      requester_types: d.requester_types ?? [],
      accepted_mime_types: d.accepted_mime_types ?? [],
      max_size_mb: String(d.max_size_mb),
      display_order: String(d.display_order),
      is_active: d.is_active,
    });
    setDialogOpen(true);
  };

  const toggleMime = (mime: string) => {
    setForm(f => ({
      ...f,
      accepted_mime_types: f.accepted_mime_types.includes(mime)
        ? f.accepted_mime_types.filter(m => m !== mime)
        : [...f.accepted_mime_types, mime],
    }));
  };

  const toggleRequesterType = (key: string) => {
    setForm(f => ({
      ...f,
      requester_types: f.requester_types.includes(key)
        ? f.requester_types.filter(k => k !== key)
        : [...f.requester_types, key],
    }));
  };

  const handleSave = async () => {
    const doc_key = form.doc_key.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_');
    if (!doc_key) return toast.error('Identifiant requis');
    if (!form.label.trim()) return toast.error('Libellé requis');
    if (form.accepted_mime_types.length === 0) return toast.error('Au moins un format de fichier requis');
    const maxSize = parseInt(form.max_size_mb);
    if (!maxSize || maxSize < 1 || maxSize > 50) return toast.error('Taille max entre 1 et 50 Mo');

    setSaving(true);
    const payload: Record<string, unknown> = {
      doc_key,
      label: form.label.trim(),
      help_text: form.help_text.trim() || null,
      is_required: form.is_required,
      requester_types: form.requester_types,
      accepted_mime_types: form.accepted_mime_types,
      max_size_mb: maxSize,
      display_order: parseInt(form.display_order) || 0,
      is_active: form.is_active,
    };

    const { error } = editing
      ? await untypedTables.subdivision_required_documents().update(payload).eq('id', editing.id)
      : await untypedTables.subdivision_required_documents().insert(payload);

    setSaving(false);
    if (error) {
      toast.error(error.message?.includes('unique') ? 'Cet identifiant existe déjà' : `Erreur: ${error.message}`);
      return;
    }
    toast.success(editing ? 'Document mis à jour' : 'Document ajouté');
    invalidateSubdivisionRequiredDocsCache();
    setDialogOpen(false);
    fetchDocs();
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    const { error } = await untypedTables.subdivision_required_documents().delete().eq('id', deleteId);
    if (error) {
      toast.error(`Suppression impossible: ${error.message}`);
    } else {
      toast.success('Document supprimé');
      invalidateSubdivisionRequiredDocsCache();
      fetchDocs();
    }
    setDeleteId(null);
  };

  const toggleActive = async (d: SubdivisionRequiredDocument) => {
    const { error } = await untypedTables.subdivision_required_documents()
      .update({ is_active: !d.is_active }).eq('id', d.id);
    if (error) toast.error(error.message);
    else {
      invalidateSubdivisionRequiredDocsCache();
      fetchDocs();
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-primary" />
          Pièces justificatives requises
        </CardTitle>
        <p className="text-xs text-muted-foreground flex items-start gap-1.5">
          <Info className="h-3.5 w-3.5 shrink-0 mt-0.5" />
          Configurez la liste des documents demandés à l'utilisateur lors d'une demande de lotissement (formats, taille max, obligatoire/optionnel).
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex justify-end">
          <Button size="sm" onClick={openAdd}><Plus className="h-4 w-4 mr-1" /> Ajouter un document</Button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin mr-2" /> Chargement…
          </div>
        ) : docs.length === 0 ? (
          <div className="text-center py-12 text-sm text-muted-foreground border rounded-md border-dashed">
            Aucun document configuré.
          </div>
        ) : (
          <div className="border rounded-md overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">Ordre</TableHead>
                  <TableHead>Identifiant</TableHead>
                  <TableHead>Libellé</TableHead>
                  <TableHead>Obligatoire</TableHead>
                  <TableHead>Formats</TableHead>
                  <TableHead className="text-right">Taille max</TableHead>
                  <TableHead>Demandeurs</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {docs.map(d => (
                  <TableRow key={d.id}>
                    <TableCell className="font-mono text-xs">{d.display_order}</TableCell>
                    <TableCell className="font-mono text-xs">{d.doc_key}</TableCell>
                    <TableCell className="font-medium">{d.label}</TableCell>
                    <TableCell>
                      {d.is_required
                        ? <Badge variant="destructive">Oui</Badge>
                        : <span className="text-xs text-muted-foreground">Non</span>}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-0.5">
                        {d.accepted_mime_types.map(m => (
                          <Badge key={m} variant="outline" className="text-[10px]">{m.split('/')[1]?.toUpperCase()}</Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell className="text-right text-xs font-mono">{d.max_size_mb} Mo</TableCell>
                    <TableCell className="text-xs">
                      {d.requester_types.length === 0
                        ? <span className="text-muted-foreground">Tous</span>
                        : d.requester_types.join(', ')}
                    </TableCell>
                    <TableCell>
                      <Switch checked={d.is_active} onCheckedChange={() => toggleActive(d)} />
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(d)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => setDeleteId(d.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? 'Modifier' : 'Ajouter'} — Pièce justificative</DialogTitle>
            <DialogDescription className="text-xs">
              Cette pièce sera demandée à l'utilisateur dans l'étape « Documents » du formulaire de lotissement.
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-1">
              <Label className="text-xs">Identifiant (clé)</Label>
              <Input
                value={form.doc_key}
                onChange={e => setForm(f => ({ ...f, doc_key: e.target.value }))}
                placeholder="ex: cadastral_plan"
                disabled={!!editing}
                className="font-mono text-xs"
              />
            </div>
            <div className="col-span-1">
              <Label className="text-xs">Libellé affiché</Label>
              <Input value={form.label} onChange={e => setForm(f => ({ ...f, label: e.target.value }))} placeholder="ex: Plan cadastral" />
            </div>

            <div className="col-span-2">
              <Label className="text-xs">Aide contextuelle (optionnel)</Label>
              <Textarea rows={2} value={form.help_text} onChange={e => setForm(f => ({ ...f, help_text: e.target.value }))} placeholder="Aide affichée sous le libellé" />
            </div>

            <div className="col-span-1">
              <Label className="text-xs">Ordre d'affichage</Label>
              <Input type="number" value={form.display_order} onChange={e => setForm(f => ({ ...f, display_order: e.target.value }))} />
            </div>
            <div className="col-span-1">
              <Label className="text-xs">Taille max (Mo)</Label>
              <Input type="number" min="1" max="50" value={form.max_size_mb} onChange={e => setForm(f => ({ ...f, max_size_mb: e.target.value }))} />
            </div>

            <div className="col-span-1 flex items-end gap-2">
              <Switch checked={form.is_required} onCheckedChange={v => setForm(f => ({ ...f, is_required: v }))} />
              <Label className="text-xs">Obligatoire</Label>
            </div>
            <div className="col-span-1 flex items-end gap-2">
              <Switch checked={form.is_active} onCheckedChange={v => setForm(f => ({ ...f, is_active: v }))} />
              <Label className="text-xs">Actif</Label>
            </div>

            <div className="col-span-2">
              <Label className="text-xs">Formats acceptés</Label>
              <div className="flex flex-wrap gap-2 mt-1">
                {ALL_MIME.map(m => (
                  <button
                    type="button"
                    key={m.value}
                    onClick={() => toggleMime(m.value)}
                    className={`px-2 py-1 text-xs rounded border transition ${
                      form.accepted_mime_types.includes(m.value)
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-background hover:bg-muted'
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="col-span-2">
              <Label className="text-xs">Restreindre à certains types de demandeur (optionnel)</Label>
              <div className="flex flex-wrap gap-2 mt-1">
                {requesterTypes.map(rt => (
                  <button
                    type="button"
                    key={rt.key}
                    onClick={() => toggleRequesterType(rt.key)}
                    className={`px-2 py-1 text-xs rounded border transition ${
                      form.requester_types.includes(rt.key)
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-background hover:bg-muted'
                    }`}
                  >
                    {rt.label}
                  </button>
                ))}
              </div>
              <p className="text-[10px] text-muted-foreground mt-1">
                Aucune sélection = document demandé à tous les demandeurs.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>Annuler</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              {editing ? 'Enregistrer' : 'Ajouter'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce document ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. Les utilisateurs ne pourront plus téléverser ce document.
              Préférez désactiver le document si vous souhaitez conserver sa configuration.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Supprimer</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
};

export default AdminSubdivisionRequiredDocs;

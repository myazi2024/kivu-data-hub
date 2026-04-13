import { useState, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, FileText, Search, Trash2, Download, Upload, Loader2 } from 'lucide-react';
import type { HREmployee } from '@/hooks/useHREmployees';
import type { HRDocument } from '@/hooks/useHRDocuments';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Props {
  hook: {
    documents: HRDocument[];
    addDocument: (d: Partial<HRDocument>) => Promise<any>;
    deleteDocument: (id: string) => Promise<void>;
    isAdding: boolean;
  };
  employees: HREmployee[];
}

const docTypes = [
  { value: 'contract', label: 'Contrat de travail' },
  { value: 'amendment', label: 'Avenant' },
  { value: 'payslip', label: 'Bulletin de paie' },
  { value: 'certificate', label: 'Attestation' },
  { value: 'warning', label: 'Avertissement' },
  { value: 'diploma', label: 'Diplôme' },
  { value: 'id_document', label: 'Pièce d\'identité' },
  { value: 'other', label: 'Autre' },
];

export default function AdminHRDocuments({ hook, employees }: Props) {
  const { documents, addDocument, deleteDocument, isAdding } = hook;
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ employee_id: '', document_type: 'contract', file_name: '', expires_at: '' });
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleAdd = async () => {
    if (!form.employee_id || !form.file_name) return;
    let file_url: string | null = null;

    if (file) {
      setUploading(true);
      try {
        const ext = file.name.split('.').pop();
        const path = `${form.employee_id}/${crypto.randomUUID()}.${ext}`;
        const { error: uploadError } = await supabase.storage.from('hr-documents').upload(path, file);
        if (uploadError) throw uploadError;
        file_url = path;
      } catch (err: any) {
        toast({ title: 'Erreur upload', description: err.message, variant: 'destructive' });
        setUploading(false);
        return;
      }
      setUploading(false);
    }

    await addDocument({
      employee_id: form.employee_id,
      document_type: form.document_type,
      file_name: form.file_name,
      file_url,
      file_size: file?.size || null,
      expires_at: form.expires_at || null,
    });
    setDialogOpen(false);
    setForm({ employee_id: '', document_type: 'contract', file_name: '', expires_at: '' });
    setFile(null);
  };

  const handleDownload = async (doc: HRDocument) => {
    if (!doc.file_url) {
      toast({ title: 'Aucun fichier attaché', variant: 'destructive' });
      return;
    }
    const { data, error } = await supabase.storage.from('hr-documents').createSignedUrl(doc.file_url, 60);
    if (error || !data?.signedUrl) {
      toast({ title: 'Erreur de téléchargement', description: error?.message, variant: 'destructive' });
      return;
    }
    window.open(data.signedUrl, '_blank');
  };

  const getEmployeeName = (id: string) => {
    const emp = employees.find(e => e.id === id);
    return emp ? `${emp.first_name} ${emp.last_name}` : 'Inconnu';
  };

  const filtered = documents.filter(d =>
    `${d.file_name} ${getEmployeeName(d.employee_id)}`.toLowerCase().includes(search.toLowerCase())
  );

  const today = new Date();
  const in30 = new Date(today.getTime() + 30 * 86400000);

  const getExpiryStatus = (date: string | null) => {
    if (!date) return null;
    const d = new Date(date);
    if (d < today) return 'expired';
    if (d <= in30) return 'soon';
    return null;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">Documents RH</h2>
          <p className="text-sm text-muted-foreground">{documents.length} document(s)</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1" /> Ajouter</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Nouveau document</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div>
                <Label>Employé</Label>
                <Select value={form.employee_id} onValueChange={v => setForm({ ...form, employee_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Sélectionner" /></SelectTrigger>
                  <SelectContent>{employees.map(e => <SelectItem key={e.id} value={e.id}>{e.first_name} {e.last_name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Type</Label>
                <Select value={form.document_type} onValueChange={v => setForm({ ...form, document_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{docTypes.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Nom du document</Label><Input value={form.file_name} onChange={e => setForm({ ...form, file_name: e.target.value })} /></div>
              <div>
                <Label>Fichier</Label>
                <div className="flex items-center gap-2">
                  <input ref={fileRef} type="file" className="hidden" onChange={e => setFile(e.target.files?.[0] || null)} accept=".pdf,.doc,.docx,.jpg,.jpeg,.png" />
                  <Button type="button" variant="outline" size="sm" onClick={() => fileRef.current?.click()}>
                    <Upload className="h-3.5 w-3.5 mr-1" /> {file ? file.name : 'Choisir un fichier'}
                  </Button>
                  {file && <span className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(0)} Ko</span>}
                </div>
              </div>
              <div><Label>Date d'expiration</Label><Input type="date" value={form.expires_at} onChange={e => setForm({ ...form, expires_at: e.target.value })} /></div>
              <Button onClick={handleAdd} disabled={isAdding || uploading}>
                {uploading ? <><Loader2 className="h-4 w-4 animate-spin mr-1" /> Upload...</> : isAdding ? 'Ajout...' : 'Enregistrer'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Rechercher..." className="pl-8" value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      <div className="grid gap-3">
        {filtered.map(doc => {
          const expiry = getExpiryStatus(doc.expires_at);
          return (
            <Card key={doc.id}>
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <FileText className={`h-5 w-5 ${expiry === 'expired' ? 'text-destructive' : expiry === 'soon' ? 'text-amber-500' : 'text-primary'}`} />
                  <div>
                    <p className="font-medium text-sm">{doc.file_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {getEmployeeName(doc.employee_id)} · {doc.created_at?.split('T')[0]}
                      {doc.file_url && ' · 📎'}
                      {doc.expires_at && (
                        <span className={expiry === 'expired' ? ' text-destructive font-medium' : expiry === 'soon' ? ' text-amber-500 font-medium' : ''}>
                          {' '}· {expiry === 'expired' ? '⚠ Expiré' : expiry === 'soon' ? '⏰ Expire bientôt' : `Expire : ${doc.expires_at}`}
                        </span>
                      )}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-[10px]">{docTypes.find(t => t.value === doc.document_type)?.label || doc.document_type}</Badge>
                  {doc.file_url && (
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleDownload(doc)}>
                      <Download className="h-3.5 w-3.5" />
                    </Button>
                  )}
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive"><Trash2 className="h-3.5 w-3.5" /></Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Supprimer ce document ?</AlertDialogTitle>
                        <AlertDialogDescription>Le document "{doc.file_name}" sera définitivement supprimé.</AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Annuler</AlertDialogCancel>
                        <AlertDialogAction onClick={() => deleteDocument(doc.id)}>Supprimer</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </CardContent>
            </Card>
          );
        })}
        {filtered.length === 0 && <p className="text-center text-sm text-muted-foreground py-8">Aucun document</p>}
      </div>
    </div>
  );
}

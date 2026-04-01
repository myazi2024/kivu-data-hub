import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, FileText, Search, Download } from 'lucide-react';
import type { Employee } from './hrData';
import { useToast } from '@/hooks/use-toast';

interface HRDocument {
  id: string;
  employeeId: string;
  employeeName: string;
  type: string;
  title: string;
  createdAt: string;
}

interface Props {
  employees: Employee[];
}

const docTypes = [
  { value: 'contract', label: 'Contrat de travail' },
  { value: 'amendment', label: 'Avenant' },
  { value: 'payslip', label: 'Bulletin de paie' },
  { value: 'certificate', label: 'Attestation' },
  { value: 'warning', label: 'Avertissement' },
  { value: 'other', label: 'Autre' },
];

export default function AdminHRDocuments({ employees }: Props) {
  const [documents, setDocuments] = useState<HRDocument[]>([]);
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ employeeId: '', type: 'contract', title: '' });
  const { toast } = useToast();

  const handleAdd = () => {
    if (!form.employeeId || !form.title) {
      toast({ title: 'Erreur', description: 'Remplissez tous les champs', variant: 'destructive' });
      return;
    }
    const emp = employees.find(e => e.id === form.employeeId);
    setDocuments([...documents, {
      id: crypto.randomUUID(),
      employeeId: form.employeeId,
      employeeName: emp ? `${emp.firstName} ${emp.lastName}` : 'Inconnu',
      type: form.type,
      title: form.title,
      createdAt: new Date().toISOString().split('T')[0],
    }]);
    setDialogOpen(false);
    setForm({ employeeId: '', type: 'contract', title: '' });
    toast({ title: 'Document ajouté' });
  };

  const filtered = documents.filter(d =>
    `${d.title} ${d.employeeName}`.toLowerCase().includes(search.toLowerCase())
  );

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
                <Select value={form.employeeId} onValueChange={v => setForm({ ...form, employeeId: v })}>
                  <SelectTrigger><SelectValue placeholder="Sélectionner" /></SelectTrigger>
                  <SelectContent>{employees.map(e => <SelectItem key={e.id} value={e.id}>{e.firstName} {e.lastName}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Type</Label>
                <Select value={form.type} onValueChange={v => setForm({ ...form, type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{docTypes.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Titre</Label><Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} /></div>
              <Button onClick={handleAdd}>Enregistrer</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Rechercher..." className="pl-8" value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      <div className="grid gap-3">
        {filtered.map(doc => (
          <Card key={doc.id}>
            <CardContent className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <FileText className="h-5 w-5 text-primary" />
                <div>
                  <p className="font-medium text-sm">{doc.title}</p>
                  <p className="text-xs text-muted-foreground">{doc.employeeName} · {doc.createdAt}</p>
                </div>
              </div>
              <Badge variant="outline" className="text-[10px]">{docTypes.find(t => t.value === doc.type)?.label}</Badge>
            </CardContent>
          </Card>
        ))}
        {filtered.length === 0 && <p className="text-center text-sm text-muted-foreground py-8">Aucun document</p>}
      </div>
    </div>
  );
}

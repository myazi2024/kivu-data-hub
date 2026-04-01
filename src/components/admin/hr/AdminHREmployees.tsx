import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Search, UserCheck, Clock, UserX } from 'lucide-react';
import { departments } from './hrData';
import type { Employee } from './hrData';
import { useToast } from '@/hooks/use-toast';

interface Props {
  employees: Employee[];
  setEmployees: (e: Employee[]) => void;
}

const statusConfig: Record<string, { label: string; icon: any; variant: 'default' | 'secondary' | 'destructive' }> = {
  active: { label: 'Actif', icon: UserCheck, variant: 'default' },
  leave: { label: 'En congé', icon: Clock, variant: 'secondary' },
  departed: { label: 'Parti', icon: UserX, variant: 'destructive' },
};

export default function AdminHREmployees({ employees, setEmployees }: Props) {
  const [search, setSearch] = useState('');
  const [filterDept, setFilterDept] = useState('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const { toast } = useToast();
  const [form, setForm] = useState<Partial<Employee>>({ status: 'active', hireDate: new Date().toISOString().split('T')[0] });

  const filtered = employees.filter(e => {
    const matchSearch = `${e.firstName} ${e.lastName} ${e.position}`.toLowerCase().includes(search.toLowerCase());
    const matchDept = filterDept === 'all' || e.department === filterDept;
    return matchSearch && matchDept;
  });

  const handleAdd = () => {
    if (!form.firstName || !form.lastName || !form.department || !form.position) {
      toast({ title: 'Erreur', description: 'Remplissez tous les champs obligatoires', variant: 'destructive' });
      return;
    }
    const newEmp: Employee = {
      id: crypto.randomUUID(),
      firstName: form.firstName!,
      lastName: form.lastName!,
      email: form.email || '',
      phone: form.phone || '',
      department: form.department!,
      position: form.position!,
      status: (form.status as Employee['status']) || 'active',
      hireDate: form.hireDate || new Date().toISOString().split('T')[0],
    };
    setEmployees([...employees, newEmp]);
    setDialogOpen(false);
    setForm({ status: 'active', hireDate: new Date().toISOString().split('T')[0] });
    toast({ title: 'Employé ajouté' });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">Employés</h2>
          <p className="text-sm text-muted-foreground">{employees.length} employé(s) enregistré(s)</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="h-4 w-4 mr-1" /> Ajouter</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Nouvel employé</DialogTitle></DialogHeader>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Prénom *</Label><Input value={form.firstName || ''} onChange={e => setForm({ ...form, firstName: e.target.value })} /></div>
              <div><Label>Nom *</Label><Input value={form.lastName || ''} onChange={e => setForm({ ...form, lastName: e.target.value })} /></div>
              <div><Label>Email</Label><Input type="email" value={form.email || ''} onChange={e => setForm({ ...form, email: e.target.value })} /></div>
              <div><Label>Téléphone</Label><Input value={form.phone || ''} onChange={e => setForm({ ...form, phone: e.target.value })} /></div>
              <div>
                <Label>Département *</Label>
                <Select value={form.department || ''} onValueChange={v => setForm({ ...form, department: v })}>
                  <SelectTrigger><SelectValue placeholder="Sélectionner" /></SelectTrigger>
                  <SelectContent>{departments.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Poste *</Label><Input value={form.position || ''} onChange={e => setForm({ ...form, position: e.target.value })} /></div>
              <div><Label>Date d'embauche</Label><Input type="date" value={form.hireDate || ''} onChange={e => setForm({ ...form, hireDate: e.target.value })} /></div>
              <div>
                <Label>Statut</Label>
                <Select value={form.status || 'active'} onValueChange={v => setForm({ ...form, status: v as Employee['status'] })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Actif</SelectItem>
                    <SelectItem value="leave">En congé</SelectItem>
                    <SelectItem value="departed">Parti</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button onClick={handleAdd} className="mt-2">Enregistrer</Button>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Rechercher..." className="pl-8" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={filterDept} onValueChange={setFilterDept}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les depts.</SelectItem>
            {departments.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-3">
        {filtered.map(emp => {
          const sc = statusConfig[emp.status];
          const dept = departments.find(d => d.id === emp.department);
          return (
            <Card key={emp.id}>
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">
                    {emp.firstName[0]}{emp.lastName[0]}
                  </div>
                  <div>
                    <p className="font-medium text-sm">{emp.firstName} {emp.lastName}</p>
                    <p className="text-xs text-muted-foreground">{emp.position} · {dept?.name}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={sc.variant} className="text-[10px]">{sc.label}</Badge>
                  <span className="text-xs text-muted-foreground">{emp.hireDate}</span>
                </div>
              </CardContent>
            </Card>
          );
        })}
        {filtered.length === 0 && <p className="text-center text-sm text-muted-foreground py-8">Aucun employé trouvé</p>}
      </div>
    </div>
  );
}

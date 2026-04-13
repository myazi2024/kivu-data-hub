import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Search, UserCheck, Clock, UserX, Pencil, Trash2, Eye, Download } from 'lucide-react';
import { exportRecordsToCSV } from '@/utils/csvExport';
import { departments } from './hrData';
import type { HREmployee, HREmployeeInsert } from '@/hooks/useHREmployees';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';

interface Props {
  hook: {
    employees: HREmployee[];
    addEmployee: (e: Partial<HREmployeeInsert>) => Promise<any>;
    updateEmployee: (e: Partial<HREmployee> & { id: string }) => Promise<void>;
    deleteEmployee: (id: string) => Promise<void>;
    isAdding: boolean;
    isUpdating: boolean;
    isDeleting: boolean;
  };
}

const statusConfig: Record<string, { label: string; icon: any; variant: 'default' | 'secondary' | 'destructive' }> = {
  active: { label: 'Actif', icon: UserCheck, variant: 'default' },
  leave: { label: 'En congé', icon: Clock, variant: 'secondary' },
  departed: { label: 'Parti', icon: UserX, variant: 'destructive' },
};

const emptyForm: Partial<HREmployeeInsert> = {
  first_name: '', last_name: '', email: '', phone: '', department: '', position: '',
  salary_usd: 0, birth_date: null, gender: null, emergency_contact_name: null,
  emergency_contact_phone: null, hire_date: new Date().toISOString().split('T')[0],
  status: 'active', notes: null,
};

export default function AdminHREmployees({ hook }: Props) {
  const { employees, addEmployee, updateEmployee, deleteEmployee, isAdding, isUpdating, isDeleting } = hook;
  const [search, setSearch] = useState('');
  const [filterDept, setFilterDept] = useState('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [detailEmployee, setDetailEmployee] = useState<HREmployee | null>(null);
  const [editEmployee, setEditEmployee] = useState<HREmployee | null>(null);
  const [form, setForm] = useState<Partial<HREmployeeInsert>>(emptyForm);

  const filtered = employees.filter(e => {
    const matchSearch = `${e.first_name} ${e.last_name} ${e.position} ${e.matricule}`.toLowerCase().includes(search.toLowerCase());
    const matchDept = filterDept === 'all' || e.department === filterDept;
    return matchSearch && matchDept;
  });

  const handleAdd = async () => {
    if (!form.first_name || !form.last_name || !form.department || !form.position) return;
    await addEmployee(form);
    setDialogOpen(false);
    setForm(emptyForm);
  };

  const handleEdit = async () => {
    if (!editEmployee) return;
    await updateEmployee({
      id: editEmployee.id,
      first_name: editEmployee.first_name,
      last_name: editEmployee.last_name,
      email: editEmployee.email,
      phone: editEmployee.phone,
      department: editEmployee.department,
      position: editEmployee.position,
      salary_usd: editEmployee.salary_usd,
      birth_date: editEmployee.birth_date,
      gender: editEmployee.gender,
      emergency_contact_name: editEmployee.emergency_contact_name,
      emergency_contact_phone: editEmployee.emergency_contact_phone,
      hire_date: editEmployee.hire_date,
      status: editEmployee.status,
      notes: editEmployee.notes,
    });
    setEditEmployee(null);
  };

  const renderFormFields = (data: any, setData: (d: any) => void) => (
    <div className="grid grid-cols-2 gap-3 max-h-[60vh] overflow-y-auto pr-1">
      <div><Label>Prénom *</Label><Input value={data.first_name || ''} onChange={e => setData({ ...data, first_name: e.target.value })} /></div>
      <div><Label>Nom *</Label><Input value={data.last_name || ''} onChange={e => setData({ ...data, last_name: e.target.value })} /></div>
      <div><Label>Email</Label><Input type="email" value={data.email || ''} onChange={e => setData({ ...data, email: e.target.value })} /></div>
      <div><Label>Téléphone</Label><Input value={data.phone || ''} onChange={e => setData({ ...data, phone: e.target.value })} /></div>
      <div>
        <Label>Département *</Label>
        <Select value={data.department || ''} onValueChange={v => setData({ ...data, department: v })}>
          <SelectTrigger><SelectValue placeholder="Sélectionner" /></SelectTrigger>
          <SelectContent>{departments.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <div><Label>Poste *</Label><Input value={data.position || ''} onChange={e => setData({ ...data, position: e.target.value })} /></div>
      <div><Label>Salaire (USD)</Label><Input type="number" value={data.salary_usd || 0} onChange={e => setData({ ...data, salary_usd: parseFloat(e.target.value) || 0 })} /></div>
      <div><Label>Date de naissance</Label><Input type="date" value={data.birth_date || ''} onChange={e => setData({ ...data, birth_date: e.target.value || null })} /></div>
      <div>
        <Label>Genre</Label>
        <Select value={data.gender || ''} onValueChange={v => setData({ ...data, gender: v })}>
          <SelectTrigger><SelectValue placeholder="Sélectionner" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="male">Homme</SelectItem>
            <SelectItem value="female">Femme</SelectItem>
            <SelectItem value="other">Autre</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div><Label>Date d'embauche</Label><Input type="date" value={data.hire_date || ''} onChange={e => setData({ ...data, hire_date: e.target.value })} /></div>
      <div><Label>Contact urgence (nom)</Label><Input value={data.emergency_contact_name || ''} onChange={e => setData({ ...data, emergency_contact_name: e.target.value || null })} /></div>
      <div><Label>Contact urgence (tél)</Label><Input value={data.emergency_contact_phone || ''} onChange={e => setData({ ...data, emergency_contact_phone: e.target.value || null })} /></div>
      <div>
        <Label>Statut</Label>
        <Select value={data.status || 'active'} onValueChange={v => setData({ ...data, status: v })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="active">Actif</SelectItem>
            <SelectItem value="leave">En congé</SelectItem>
            <SelectItem value="departed">Parti</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="col-span-2"><Label>Notes</Label><Textarea value={data.notes || ''} onChange={e => setData({ ...data, notes: e.target.value || null })} /></div>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">Employés</h2>
          <p className="text-sm text-muted-foreground">{employees.length} employé(s) enregistré(s)</p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => exportRecordsToCSV(employees, 'employes_rh', ['matricule', 'first_name', 'last_name', 'email', 'phone', 'department', 'position', 'status', 'salary_usd', 'hire_date', 'gender'])}>
            <Download className="h-4 w-4 mr-1" /> Export CSV
          </Button>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1" /> Ajouter</Button></DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader><DialogTitle>Nouvel employé</DialogTitle></DialogHeader>
            {renderFormFields(form, setForm)}
            <DialogFooter>
              <Button onClick={handleAdd} disabled={isAdding}>{isAdding ? 'Ajout...' : 'Enregistrer'}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Rechercher par nom, poste ou matricule..." className="pl-8" value={search} onChange={e => setSearch(e.target.value)} />
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
                    {emp.first_name[0]}{emp.last_name[0]}
                  </div>
                  <div>
                    <p className="font-medium text-sm">{emp.first_name} {emp.last_name}</p>
                    <p className="text-xs text-muted-foreground">{emp.position} · {dept?.name} · <span className="font-mono">{emp.matricule}</span></p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={sc.variant} className="text-[10px]">{sc.label}</Badge>
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setDetailEmployee(emp)}><Eye className="h-3.5 w-3.5" /></Button>
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditEmployee({ ...emp })}><Pencil className="h-3.5 w-3.5" /></Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive"><Trash2 className="h-3.5 w-3.5" /></Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Supprimer l'employé ?</AlertDialogTitle>
                        <AlertDialogDescription>Cette action supprimera définitivement {emp.first_name} {emp.last_name} et toutes ses données associées.</AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Annuler</AlertDialogCancel>
                        <AlertDialogAction onClick={() => deleteEmployee(emp.id)}>Supprimer</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </CardContent>
            </Card>
          );
        })}
        {filtered.length === 0 && <p className="text-center text-sm text-muted-foreground py-8">Aucun employé trouvé</p>}
      </div>

      {/* Detail dialog */}
      <Dialog open={!!detailEmployee} onOpenChange={() => setDetailEmployee(null)}>
        {detailEmployee && (
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>Fiche employé — {detailEmployee.matricule}</DialogTitle></DialogHeader>
            <div className="space-y-3 text-sm">
              <div className="flex items-center gap-3">
                <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center text-lg font-bold text-primary">
                  {detailEmployee.first_name[0]}{detailEmployee.last_name[0]}
                </div>
                <div>
                  <p className="text-lg font-bold">{detailEmployee.first_name} {detailEmployee.last_name}</p>
                  <p className="text-muted-foreground">{detailEmployee.position} · {departments.find(d => d.id === detailEmployee.department)?.name}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 pt-2 border-t">
                <div><span className="text-muted-foreground">Matricule :</span> <span className="font-mono">{detailEmployee.matricule}</span></div>
                <div><span className="text-muted-foreground">Statut :</span> <Badge variant={statusConfig[detailEmployee.status].variant} className="text-[10px] ml-1">{statusConfig[detailEmployee.status].label}</Badge></div>
                <div><span className="text-muted-foreground">Email :</span> {detailEmployee.email || '—'}</div>
                <div><span className="text-muted-foreground">Téléphone :</span> {detailEmployee.phone || '—'}</div>
                <div><span className="text-muted-foreground">Salaire :</span> {detailEmployee.salary_usd ? `${detailEmployee.salary_usd.toLocaleString()} USD` : '—'}</div>
                <div><span className="text-muted-foreground">Date embauche :</span> {detailEmployee.hire_date}</div>
                <div><span className="text-muted-foreground">Date naissance :</span> {detailEmployee.birth_date || '—'}</div>
                <div><span className="text-muted-foreground">Genre :</span> {detailEmployee.gender === 'male' ? 'Homme' : detailEmployee.gender === 'female' ? 'Femme' : detailEmployee.gender || '—'}</div>
              </div>
              {(detailEmployee.emergency_contact_name || detailEmployee.emergency_contact_phone) && (
                <div className="pt-2 border-t">
                  <p className="font-medium mb-1">Contact d'urgence</p>
                  <p>{detailEmployee.emergency_contact_name || '—'} · {detailEmployee.emergency_contact_phone || '—'}</p>
                </div>
              )}
              {detailEmployee.notes && (
                <div className="pt-2 border-t">
                  <p className="font-medium mb-1">Notes</p>
                  <p className="text-muted-foreground">{detailEmployee.notes}</p>
                </div>
              )}
            </div>
          </DialogContent>
        )}
      </Dialog>

      {/* Edit dialog */}
      <Dialog open={!!editEmployee} onOpenChange={() => setEditEmployee(null)}>
        {editEmployee && (
          <DialogContent className="max-w-2xl">
            <DialogHeader><DialogTitle>Modifier — {editEmployee.matricule}</DialogTitle></DialogHeader>
            {renderFormFields(editEmployee, setEditEmployee)}
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditEmployee(null)}>Annuler</Button>
              <Button onClick={handleEdit} disabled={isUpdating}>{isUpdating ? 'Mise à jour...' : 'Sauvegarder'}</Button>
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}

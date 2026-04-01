import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Check, X } from 'lucide-react';
import { leaveTypes } from './hrData';
import type { LeaveRequest, Employee } from './hrData';
import { useToast } from '@/hooks/use-toast';

interface Props {
  leaves: LeaveRequest[];
  setLeaves: (l: LeaveRequest[]) => void;
  employees: Employee[];
}

const statusBadge: Record<string, 'default' | 'secondary' | 'destructive'> = {
  pending: 'secondary',
  approved: 'default',
  rejected: 'destructive',
};

export default function AdminHRLeaves({ leaves, setLeaves, employees }: Props) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const { toast } = useToast();
  const [form, setForm] = useState<Partial<LeaveRequest>>({ type: 'annual', status: 'pending' });

  const handleAdd = () => {
    if (!form.employeeId || !form.startDate || !form.endDate) {
      toast({ title: 'Erreur', description: 'Remplissez tous les champs', variant: 'destructive' });
      return;
    }
    const emp = employees.find(e => e.id === form.employeeId);
    const newLeave: LeaveRequest = {
      id: crypto.randomUUID(),
      employeeId: form.employeeId!,
      employeeName: emp ? `${emp.firstName} ${emp.lastName}` : 'Inconnu',
      type: (form.type as LeaveRequest['type']) || 'annual',
      startDate: form.startDate!,
      endDate: form.endDate!,
      status: 'pending',
      reason: form.reason || '',
    };
    setLeaves([...leaves, newLeave]);
    setDialogOpen(false);
    setForm({ type: 'annual', status: 'pending' });
    toast({ title: 'Demande de congé ajoutée' });
  };

  const updateStatus = (id: string, status: 'approved' | 'rejected') => {
    setLeaves(leaves.map(l => l.id === id ? { ...l, status } : l));
    toast({ title: status === 'approved' ? 'Congé approuvé' : 'Congé refusé' });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">Congés & Présences</h2>
          <p className="text-sm text-muted-foreground">{leaves.filter(l => l.status === 'pending').length} demande(s) en attente</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1" /> Nouvelle demande</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Nouvelle demande de congé</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div>
                <Label>Employé</Label>
                <Select value={form.employeeId || ''} onValueChange={v => setForm({ ...form, employeeId: v })}>
                  <SelectTrigger><SelectValue placeholder="Sélectionner" /></SelectTrigger>
                  <SelectContent>{employees.filter(e => e.status === 'active').map(e => <SelectItem key={e.id} value={e.id}>{e.firstName} {e.lastName}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Type</Label>
                <Select value={form.type || 'annual'} onValueChange={v => setForm({ ...form, type: v as LeaveRequest['type'] })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{Object.entries(leaveTypes).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Du</Label><Input type="date" value={form.startDate || ''} onChange={e => setForm({ ...form, startDate: e.target.value })} /></div>
                <div><Label>Au</Label><Input type="date" value={form.endDate || ''} onChange={e => setForm({ ...form, endDate: e.target.value })} /></div>
              </div>
              <div><Label>Motif</Label><Textarea value={form.reason || ''} onChange={e => setForm({ ...form, reason: e.target.value })} /></div>
              <Button onClick={handleAdd}>Soumettre</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-3">
        {leaves.map(leave => (
          <Card key={leave.id}>
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="font-medium text-sm">{leave.employeeName}</p>
                <div className="flex gap-2 text-xs text-muted-foreground mt-0.5">
                  <Badge variant="outline" className="text-[10px]">{leaveTypes[leave.type]?.label}</Badge>
                  <span>{leave.startDate} → {leave.endDate}</span>
                </div>
                {leave.reason && <p className="text-xs text-muted-foreground mt-1">{leave.reason}</p>}
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={statusBadge[leave.status]} className="text-[10px]">
                  {leave.status === 'pending' ? 'En attente' : leave.status === 'approved' ? 'Approuvé' : 'Refusé'}
                </Badge>
                {leave.status === 'pending' && (
                  <div className="flex gap-1">
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => updateStatus(leave.id, 'approved')}><Check className="h-3.5 w-3.5 text-green-600" /></Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => updateStatus(leave.id, 'rejected')}><X className="h-3.5 w-3.5 text-destructive" /></Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
        {leaves.length === 0 && <p className="text-center text-sm text-muted-foreground py-8">Aucune demande de congé</p>}
      </div>
    </div>
  );
}

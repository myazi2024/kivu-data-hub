import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Check, X, Download } from 'lucide-react';
import { exportRecordsToCSV } from '@/utils/csvExport';
import { leaveTypes } from './hrData';
import type { HREmployee } from '@/hooks/useHREmployees';
import type { HRLeaveRequest, HRLeaveBalance } from '@/hooks/useHRLeaves';

interface Props {
  hook: {
    leaves: HRLeaveRequest[];
    addLeave: (l: Partial<HRLeaveRequest>) => Promise<any>;
    updateStatus: (p: { id: string; status: 'approved' | 'rejected' }) => Promise<void>;
    isAdding: boolean;
  };
  employees: HREmployee[];
  balances: HRLeaveBalance[];
}

const statusBadge: Record<string, 'default' | 'secondary' | 'destructive'> = {
  pending: 'secondary',
  approved: 'default',
  rejected: 'destructive',
};

export default function AdminHRLeaves({ hook, employees, balances }: Props) {
  const { leaves, addLeave, updateStatus, isAdding } = hook;
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ employee_id: '', leave_type: 'annual', start_date: '', end_date: '', reason: '' });

  const handleAdd = async () => {
    if (!form.employee_id || !form.start_date || !form.end_date) return;
    await addLeave(form);
    setDialogOpen(false);
    setForm({ employee_id: '', leave_type: 'annual', start_date: '', end_date: '', reason: '' });
  };

  const getEmployeeName = (id: string) => {
    const emp = employees.find(e => e.id === id);
    return emp ? `${emp.first_name} ${emp.last_name}` : 'Inconnu';
  };

  const getBalance = (empId: string, type: string) => {
    return balances.find(b => b.employee_id === empId && b.leave_type === type);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">Congés & Absences</h2>
          <p className="text-sm text-muted-foreground">{leaves.filter(l => l.status === 'pending').length} demande(s) en attente</p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => exportRecordsToCSV(leaves.map(l => ({ ...l, employee_name: getEmployeeName(l.employee_id) })), 'conges_rh', ['employee_name', 'leave_type', 'start_date', 'end_date', 'days_count', 'status', 'reason'])}>
            <Download className="h-4 w-4 mr-1" /> Export CSV
          </Button>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1" /> Nouvelle demande</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Nouvelle demande de congé</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div>
                <Label>Employé</Label>
                <Select value={form.employee_id} onValueChange={v => setForm({ ...form, employee_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Sélectionner" /></SelectTrigger>
                  <SelectContent>{employees.filter(e => e.status === 'active').map(e => <SelectItem key={e.id} value={e.id}>{e.first_name} {e.last_name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              {form.employee_id && (
                <div className="p-2 bg-muted rounded text-xs">
                  {(() => {
                    const bal = getBalance(form.employee_id, form.leave_type);
                    return bal ? `Solde ${leaveTypes[form.leave_type]?.label || form.leave_type} : ${bal.days_remaining} jour(s) restant(s) sur ${bal.days_entitled}` : 'Aucun solde enregistré pour ce type';
                  })()}
                </div>
              )}
              <div>
                <Label>Type</Label>
                <Select value={form.leave_type} onValueChange={v => setForm({ ...form, leave_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{Object.entries(leaveTypes).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Du</Label><Input type="date" value={form.start_date} onChange={e => setForm({ ...form, start_date: e.target.value })} /></div>
                <div><Label>Au</Label><Input type="date" value={form.end_date} onChange={e => setForm({ ...form, end_date: e.target.value })} /></div>
              </div>
              {form.start_date && form.end_date && (
                <p className="text-xs text-muted-foreground">
                  Durée : {Math.max(1, Math.ceil((new Date(form.end_date).getTime() - new Date(form.start_date).getTime()) / 86400000) + 1)} jour(s)
                </p>
              )}
              <div><Label>Motif</Label><Textarea value={form.reason} onChange={e => setForm({ ...form, reason: e.target.value })} /></div>
              <Button onClick={handleAdd} disabled={isAdding}>{isAdding ? 'Ajout...' : 'Soumettre'}</Button>
            </div>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      <div className="grid gap-3">
        {leaves.map(leave => (
          <Card key={leave.id}>
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="font-medium text-sm">{getEmployeeName(leave.employee_id)}</p>
                <div className="flex gap-2 text-xs text-muted-foreground mt-0.5">
                  <Badge variant="outline" className="text-[10px]">{leaveTypes[leave.leave_type]?.label || leave.leave_type}</Badge>
                  <span>{leave.start_date} → {leave.end_date}</span>
                  {leave.days_count && <span>({leave.days_count}j)</span>}
                </div>
                {leave.reason && <p className="text-xs text-muted-foreground mt-1">{leave.reason}</p>}
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={statusBadge[leave.status]} className="text-[10px]">
                  {leave.status === 'pending' ? 'En attente' : leave.status === 'approved' ? 'Approuvé' : 'Refusé'}
                </Badge>
                {leave.status === 'pending' && (
                  <div className="flex gap-1">
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => updateStatus({ id: leave.id, status: 'approved' })}><Check className="h-3.5 w-3.5 text-green-600" /></Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => updateStatus({ id: leave.id, status: 'rejected' })}><X className="h-3.5 w-3.5 text-destructive" /></Button>
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

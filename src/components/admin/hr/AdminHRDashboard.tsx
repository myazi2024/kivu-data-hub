import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, Briefcase, CalendarDays, UserCheck, Clock, DollarSign } from 'lucide-react';
import { departments } from './hrData';
import type { HREmployee } from '@/hooks/useHREmployees';
import type { HRLeaveRequest } from '@/hooks/useHRLeaves';
import type { HRJobPosition } from '@/hooks/useHRJobPositions';

interface Props {
  employees: HREmployee[];
  leaves: HRLeaveRequest[];
  positions: HRJobPosition[];
}

export default function AdminHRDashboard({ employees, leaves, positions }: Props) {
  const activeEmployees = employees.filter(e => e.status === 'active').length;
  const onLeave = employees.filter(e => e.status === 'leave').length;
  const openPositions = positions.filter(j => j.status === 'open').length;
  const pendingLeaves = leaves.filter(l => l.status === 'pending').length;
  const totalSalary = employees.filter(e => e.status === 'active').reduce((sum, e) => sum + (e.salary_usd || 0), 0);

  const avgTenure = (() => {
    const actives = employees.filter(e => e.status === 'active' && e.hire_date);
    if (actives.length === 0) return 0;
    const now = new Date();
    const totalMonths = actives.reduce((sum, e) => {
      const hire = new Date(e.hire_date);
      return sum + (now.getFullYear() - hire.getFullYear()) * 12 + (now.getMonth() - hire.getMonth());
    }, 0);
    return Math.round(totalMonths / actives.length);
  })();

  const stats = [
    { label: 'Effectif actif', value: activeEmployees, icon: UserCheck, color: 'text-green-600' },
    { label: 'En congé', value: onLeave, icon: CalendarDays, color: 'text-amber-600' },
    { label: 'Postes ouverts', value: openPositions, icon: Briefcase, color: 'text-primary' },
    { label: 'Congés en attente', value: pendingLeaves, icon: Clock, color: 'text-orange-600' },
    { label: 'Masse salariale', value: `${totalSalary.toLocaleString()} $`, icon: DollarSign, color: 'text-emerald-600' },
    { label: 'Ancienneté moy.', value: `${avgTenure} mois`, icon: Users, color: 'text-blue-600' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold">Dashboard RH</h2>
        <p className="text-sm text-muted-foreground">Vue d'ensemble des ressources humaines</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {stats.map(s => (
          <Card key={s.label}>
            <CardContent className="p-4 flex flex-col items-center text-center gap-1">
              <s.icon className={`h-6 w-6 ${s.color}`} />
              <p className="text-lg font-bold">{s.value}</p>
              <p className="text-[10px] text-muted-foreground">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-sm">Répartition par département</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {departments.map(dept => {
              const count = employees.filter(e => e.department === dept.id && e.status !== 'departed').length;
              const deptSalary = employees.filter(e => e.department === dept.id && e.status === 'active').reduce((s, e) => s + (e.salary_usd || 0), 0);
              return (
                <div key={dept.id} className="flex items-center justify-between">
                  <span className="text-sm">{dept.name}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">{deptSalary > 0 ? `${deptSalary.toLocaleString()} $` : ''}</span>
                    <span className="text-sm font-medium">{count}/{dept.headcount}</span>
                    <Badge variant={count >= dept.headcount ? 'default' : 'secondary'} className="text-[10px]">
                      {count >= dept.headcount ? 'Complet' : `${dept.headcount - count} à pourvoir`}
                    </Badge>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-sm">Postes ouverts</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {positions.filter(j => j.status === 'open').slice(0, 5).map(job => (
              <div key={job.id} className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">{job.title}</p>
                  <p className="text-xs text-muted-foreground">{job.contract_type} · {job.location || '—'}</p>
                </div>
                <Badge variant="outline" className="text-[10px]">Ouvert</Badge>
              </div>
            ))}
            {positions.filter(j => j.status === 'open').length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-4">Aucun poste ouvert</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

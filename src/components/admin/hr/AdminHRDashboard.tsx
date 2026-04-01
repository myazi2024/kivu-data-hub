import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, Briefcase, CalendarDays, TrendingUp, UserCheck, UserX, Clock } from 'lucide-react';
import { departments, defaultJobOffers } from './hrData';
import type { Employee, LeaveRequest } from './hrData';

interface Props {
  employees: Employee[];
  leaves: LeaveRequest[];
}

export default function AdminHRDashboard({ employees, leaves }: Props) {
  const activeEmployees = employees.filter(e => e.status === 'active').length;
  const onLeave = employees.filter(e => e.status === 'leave').length;
  const departed = employees.filter(e => e.status === 'departed').length;
  const openPositions = defaultJobOffers.filter(j => j.status === 'open').length;
  const pendingLeaves = leaves.filter(l => l.status === 'pending').length;

  const stats = [
    { label: 'Effectif actif', value: activeEmployees, icon: UserCheck, color: 'text-green-600' },
    { label: 'En congé', value: onLeave, icon: CalendarDays, color: 'text-amber-600' },
    { label: 'Postes ouverts', value: openPositions, icon: Briefcase, color: 'text-primary' },
    { label: 'Congés en attente', value: pendingLeaves, icon: Clock, color: 'text-orange-600' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold">Dashboard RH</h2>
        <p className="text-sm text-muted-foreground">Vue d'ensemble des ressources humaines</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {stats.map(s => (
          <Card key={s.label}>
            <CardContent className="p-4 flex items-center gap-3">
              <s.icon className={`h-8 w-8 ${s.color}`} />
              <div>
                <p className="text-2xl font-bold">{s.value}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </div>
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
              return (
                <div key={dept.id} className="flex items-center justify-between">
                  <span className="text-sm">{dept.name}</span>
                  <div className="flex items-center gap-2">
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
          <CardHeader><CardTitle className="text-sm">Recrutements récents</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {defaultJobOffers.filter(j => j.status === 'open').slice(0, 5).map(job => (
              <div key={job.id} className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">{job.title}</p>
                  <p className="text-xs text-muted-foreground">{job.contractType} · {job.location}</p>
                </div>
                <Badge variant="outline" className="text-[10px]">Ouvert</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

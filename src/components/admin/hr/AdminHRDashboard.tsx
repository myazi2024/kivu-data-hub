import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, Briefcase, CalendarDays, UserCheck, Clock, DollarSign, AlertTriangle, TrendingDown } from 'lucide-react';
import { departments } from './hrData';
import type { HREmployee } from '@/hooks/useHREmployees';
import type { HRLeaveRequest } from '@/hooks/useHRLeaves';
import type { HRJobPosition } from '@/hooks/useHRJobPositions';
import type { HRDocument } from '@/hooks/useHRDocuments';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from 'recharts';

interface Props {
  employees: HREmployee[];
  leaves: HRLeaveRequest[];
  positions: HRJobPosition[];
  documents: HRDocument[];
}

const DEPT_COLORS = ['hsl(var(--primary))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))'];

export default function AdminHRDashboard({ employees, leaves, positions, documents }: Props) {
  const activeEmployees = employees.filter(e => e.status === 'active').length;
  const onLeave = employees.filter(e => e.status === 'leave').length;
  const departed = employees.filter(e => e.status === 'departed').length;
  const openPositions = positions.filter(j => j.status === 'open').length;
  const pendingLeaves = leaves.filter(l => l.status === 'pending').length;
  const totalSalary = employees.filter(e => e.status === 'active').reduce((sum, e) => sum + (e.salary_usd || 0), 0);

  // Average tenure
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

  // Turnover rate
  const turnoverRate = employees.length > 0 ? Math.round((departed / employees.length) * 100) : 0;

  // Gender ratio
  const males = employees.filter(e => e.gender === 'male' && e.status !== 'departed').length;
  const females = employees.filter(e => e.gender === 'female' && e.status !== 'departed').length;
  const activeTotal = employees.filter(e => e.status !== 'departed').length;

  // Dept pie chart data
  const deptPieData = departments.map(dept => ({
    name: dept.name,
    value: employees.filter(e => e.department === dept.id && e.status !== 'departed').length,
  })).filter(d => d.value > 0);

  // Salary bar chart data
  const salaryBarData = departments.map(dept => ({
    name: dept.name.slice(0, 8),
    salaire: employees.filter(e => e.department === dept.id && e.status === 'active').reduce((s, e) => s + (e.salary_usd || 0), 0),
  })).filter(d => d.salaire > 0);

  // Alerts
  const alerts: { type: 'warning' | 'danger'; text: string }[] = [];
  const today = new Date();
  const in30 = new Date(today.getTime() + 30 * 86400000);
  
  // Expired documents
  const expiredDocs = documents.filter(d => d.expires_at && new Date(d.expires_at) < today);
  if (expiredDocs.length > 0) alerts.push({ type: 'danger', text: `${expiredDocs.length} document(s) expiré(s)` });
  
  const soonExpDocs = documents.filter(d => d.expires_at && new Date(d.expires_at) >= today && new Date(d.expires_at) <= in30);
  if (soonExpDocs.length > 0) alerts.push({ type: 'warning', text: `${soonExpDocs.length} document(s) expirant dans 30 jours` });

  // Probation (< 3 months)
  const probationEmps = employees.filter(e => {
    if (e.status !== 'active' || !e.hire_date) return false;
    const hire = new Date(e.hire_date);
    const diff = (today.getFullYear() - hire.getFullYear()) * 12 + (today.getMonth() - hire.getMonth());
    return diff < 3;
  });
  if (probationEmps.length > 0) alerts.push({ type: 'warning', text: `${probationEmps.length} employé(s) en période d'essai` });

  if (pendingLeaves > 0) alerts.push({ type: 'warning', text: `${pendingLeaves} demande(s) de congé en attente` });

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

      {/* Stats */}
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

      {/* Additional KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-3 text-center">
            <TrendingDown className="h-4 w-4 mx-auto text-destructive mb-1" />
            <p className="text-lg font-bold">{turnoverRate}%</p>
            <p className="text-[10px] text-muted-foreground">Taux de turnover</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <Users className="h-4 w-4 mx-auto text-primary mb-1" />
            <p className="text-lg font-bold">{activeTotal}</p>
            <p className="text-[10px] text-muted-foreground">Total en poste</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <p className="text-lg font-bold">{males}H / {females}F</p>
            <p className="text-[10px] text-muted-foreground">Ratio H/F</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <p className="text-lg font-bold">{departed}</p>
            <p className="text-[10px] text-muted-foreground">Départs enregistrés</p>
          </CardContent>
        </Card>
      </div>

      {/* Alerts */}
      {alerts.length > 0 && (
        <Card className="border-amber-200 dark:border-amber-800">
          <CardHeader className="py-2 px-4"><CardTitle className="text-sm flex items-center gap-1"><AlertTriangle className="h-4 w-4 text-amber-500" /> Alertes</CardTitle></CardHeader>
          <CardContent className="px-4 pb-3 space-y-1">
            {alerts.map((a, i) => (
              <p key={i} className={`text-xs ${a.type === 'danger' ? 'text-destructive' : 'text-amber-600 dark:text-amber-400'}`}>• {a.text}</p>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Charts */}
      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-sm">Répartition par département</CardTitle></CardHeader>
          <CardContent>
            {deptPieData.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={deptPieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, value }) => `${name} (${value})`}>
                    {deptPieData.map((_, i) => <Cell key={i} fill={DEPT_COLORS[i % DEPT_COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-xs text-muted-foreground text-center py-8">Aucune donnée</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-sm">Masse salariale par département</CardTitle></CardHeader>
          <CardContent>
            {salaryBarData.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={salaryBarData}>
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip formatter={(val: number) => `${val.toLocaleString()} $`} />
                  <Bar dataKey="salaire" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-xs text-muted-foreground text-center py-8">Aucune donnée</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Department table + open positions */}
      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-sm">Détail par département</CardTitle></CardHeader>
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

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { departments } from './hrData';
import type { HREmployee } from '@/hooks/useHREmployees';
import { Users, Crown, Code, ClipboardList, TrendingUp, Headphones } from 'lucide-react';

interface Props {
  employees: HREmployee[];
}

const iconMap: Record<string, any> = {
  Crown, Code, ClipboardList, TrendingUp, Headphones,
};

export default function AdminHROrgChart({ employees }: Props) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold">Organigramme</h2>
        <p className="text-sm text-muted-foreground">Structure organisationnelle de l'équipe</p>
      </div>

      <div className="flex justify-center">
        <Card className="w-64 border-2 border-primary/30">
          <CardContent className="p-4 text-center">
            <Crown className="h-8 w-8 mx-auto text-primary mb-2" />
            <p className="font-bold text-sm">Direction Générale</p>
            <p className="text-xs text-muted-foreground">Pilotage stratégique</p>
            {employees.filter(e => e.department === 'direction' && e.status !== 'departed').map(e => (
              <Badge key={e.id} variant="outline" className="mt-2 text-[10px]">{e.first_name} {e.last_name}</Badge>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-center"><div className="w-px h-8 bg-border" /></div>
      <div className="flex justify-center"><div className="w-3/4 h-px bg-border" /></div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {departments.filter(d => d.id !== 'direction').map(dept => {
          const Icon = iconMap[dept.icon] || Users;
          const deptEmployees = employees.filter(e => e.department === dept.id && e.status !== 'departed');
          return (
            <Card key={dept.id}>
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <Icon className="h-5 w-5 text-primary" />
                  <CardTitle className="text-sm">{dept.name}</CardTitle>
                </div>
                <p className="text-xs text-muted-foreground">{dept.description}</p>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Effectif</span>
                  <Badge variant={deptEmployees.length >= dept.headcount ? 'default' : 'secondary'} className="text-[10px]">
                    {deptEmployees.length}/{dept.headcount}
                  </Badge>
                </div>
                {deptEmployees.length > 0 ? (
                  <div className="space-y-1">
                    {deptEmployees.map(e => (
                      <div key={e.id} className="flex items-center gap-2 text-xs">
                        <div className="h-5 w-5 rounded-full bg-primary/10 flex items-center justify-center text-[8px] font-bold text-primary">
                          {e.first_name[0]}{e.last_name[0]}
                        </div>
                        <div>
                          <span className="font-medium">{e.first_name} {e.last_name}</span>
                          <span className="text-muted-foreground ml-1">· {e.position}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground italic">Aucun employé</p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

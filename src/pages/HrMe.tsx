import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, User, Mail, Phone, Calendar, Briefcase } from 'lucide-react';
import { Navigate } from 'react-router-dom';

const HrMe = () => {
  const { user, loading: authLoading } = useAuth();
  const [employee, setEmployee] = useState<any>(null);
  const [leaves, setLeaves] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      setLoading(true);
      const { data: emp } = await supabase.from('hr_employees').select('*').eq('user_id', user.id).maybeSingle();
      setEmployee(emp);
      if (emp) {
        const { data: lv } = await supabase.from('hr_leave_requests').select('*').eq('employee_id', emp.id).order('start_date', { ascending: false }).limit(10);
        setLeaves(lv || []);
      }
      setLoading(false);
    })();
  }, [user]);

  if (authLoading || loading) return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  if (!user) return <Navigate to="/auth" replace />;

  if (!employee) {
    return (
      <div className="container max-w-2xl mx-auto py-12 px-4">
        <Card>
          <CardContent className="p-8 text-center">
            <User className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
            <h2 className="text-lg font-bold mb-2">Aucune fiche employé liée</h2>
            <p className="text-sm text-muted-foreground">Votre compte n'est pas encore associé à un dossier RH. Contactez l'administrateur.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container max-w-3xl mx-auto py-6 px-4 space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Mon espace RH</h1>
        <p className="text-sm text-muted-foreground">{employee.matricule}</p>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Informations</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          <div className="flex items-center gap-2"><User className="h-4 w-4 text-muted-foreground" /><span>{employee.first_name} {employee.last_name}</span></div>
          <div className="flex items-center gap-2"><Briefcase className="h-4 w-4 text-muted-foreground" /><span>{employee.position} — {employee.department}</span></div>
          <div className="flex items-center gap-2"><Mail className="h-4 w-4 text-muted-foreground" /><span>{employee.email}</span></div>
          <div className="flex items-center gap-2"><Phone className="h-4 w-4 text-muted-foreground" /><span>{employee.phone || '—'}</span></div>
          <div className="flex items-center gap-2"><Calendar className="h-4 w-4 text-muted-foreground" /><span>Embauche : {employee.hire_date}</span></div>
          <div><Badge>{employee.status}</Badge></div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Mes congés récents</CardTitle></CardHeader>
        <CardContent>
          {leaves.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">Aucune demande</p>
          ) : (
            <div className="space-y-2">
              {leaves.map(l => (
                <div key={l.id} className="flex items-center justify-between p-2 bg-muted/40 rounded text-xs">
                  <span>{l.start_date} → {l.end_date}</span>
                  <Badge variant={l.status === 'approved' ? 'default' : l.status === 'rejected' ? 'destructive' : 'secondary'}>{l.status}</Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default HrMe;

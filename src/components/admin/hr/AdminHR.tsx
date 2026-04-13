import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LayoutDashboard, Users, Briefcase, CalendarDays, Star, GitBranch, FileText, Loader2, UserPlus } from 'lucide-react';
import AdminHRDashboard from './AdminHRDashboard';
import AdminHREmployees from './AdminHREmployees';
import AdminHRRecruitment from './AdminHRRecruitment';
import AdminHRLeaves from './AdminHRLeaves';
import AdminHRPerformance from './AdminHRPerformance';
import AdminHROrgChart from './AdminHROrgChart';
import AdminHRDocuments from './AdminHRDocuments';
import { useHREmployees } from '@/hooks/useHREmployees';
import { useHRLeaves } from '@/hooks/useHRLeaves';
import { useHRReviews } from '@/hooks/useHRReviews';
import { useHRJobPositions } from '@/hooks/useHRJobPositions';
import { useHRDocuments } from '@/hooks/useHRDocuments';
import { useHRCandidates } from '@/hooks/useHRCandidates';
import type { HRCandidate } from '@/hooks/useHRCandidates';
import { useToast } from '@/hooks/use-toast';

export default function AdminHR() {
  const employeesHook = useHREmployees();
  const leavesHook = useHRLeaves();
  const reviewsHook = useHRReviews();
  const jobsHook = useHRJobPositions();
  const docsHook = useHRDocuments();
  const candidatesHook = useHRCandidates();
  const { toast } = useToast();

  const isLoading = employeesHook.isLoading || leavesHook.isLoading || reviewsHook.isLoading || jobsHook.isLoading || docsHook.isLoading || candidatesHook.isLoading;

  const handleConvertToEmployee = async (candidate: HRCandidate) => {
    const position = jobsHook.positions.find(p => p.id === candidate.position_id);
    try {
      await employeesHook.addEmployee({
        first_name: candidate.first_name,
        last_name: candidate.last_name,
        email: candidate.email,
        phone: candidate.phone,
        department: position?.department || '',
        position: position?.title || '',
        status: 'active',
        hire_date: new Date().toISOString().split('T')[0],
      });
      await candidatesHook.updateCandidate({ id: candidate.id, pipeline_stage: 'hired' });
      toast({ title: 'Candidat converti en employé' });
    } catch {
      toast({ title: 'Erreur lors de la conversion', variant: 'destructive' });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
        <span className="ml-2 text-sm text-muted-foreground">Chargement du module RH...</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Tabs defaultValue="dashboard">
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="dashboard"><LayoutDashboard className="h-3.5 w-3.5 mr-1" />Dashboard</TabsTrigger>
          <TabsTrigger value="employees"><Users className="h-3.5 w-3.5 mr-1" />Employés</TabsTrigger>
          <TabsTrigger value="recruitment"><Briefcase className="h-3.5 w-3.5 mr-1" />Recrutement</TabsTrigger>
          <TabsTrigger value="leaves"><CalendarDays className="h-3.5 w-3.5 mr-1" />Congés</TabsTrigger>
          <TabsTrigger value="performance"><Star className="h-3.5 w-3.5 mr-1" />Évaluations</TabsTrigger>
          <TabsTrigger value="orgchart"><GitBranch className="h-3.5 w-3.5 mr-1" />Organigramme</TabsTrigger>
          <TabsTrigger value="documents"><FileText className="h-3.5 w-3.5 mr-1" />Documents</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard">
          <AdminHRDashboard employees={employeesHook.employees} leaves={leavesHook.leaves} positions={jobsHook.positions} documents={docsHook.documents} />
        </TabsContent>
        <TabsContent value="employees">
          <AdminHREmployees hook={employeesHook} />
        </TabsContent>
        <TabsContent value="recruitment">
          <AdminHRRecruitment hook={jobsHook} candidatesHook={candidatesHook} onConvertToEmployee={handleConvertToEmployee} />
        </TabsContent>
        <TabsContent value="leaves">
          <AdminHRLeaves hook={leavesHook} employees={employeesHook.employees} balances={leavesHook.balances} />
        </TabsContent>
        <TabsContent value="performance">
          <AdminHRPerformance hook={reviewsHook} employees={employeesHook.employees} />
        </TabsContent>
        <TabsContent value="orgchart">
          <AdminHROrgChart employees={employeesHook.employees} />
        </TabsContent>
        <TabsContent value="documents">
          <AdminHRDocuments hook={docsHook} employees={employeesHook.employees} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LayoutDashboard, Users, Briefcase, CalendarDays, Star, GitBranch, FileText } from 'lucide-react';
import AdminHRDashboard from './AdminHRDashboard';
import AdminHREmployees from './AdminHREmployees';
import AdminHRRecruitment from './AdminHRRecruitment';
import AdminHRLeaves from './AdminHRLeaves';
import AdminHRPerformance from './AdminHRPerformance';
import AdminHROrgChart from './AdminHROrgChart';
import AdminHRDocuments from './AdminHRDocuments';
import type { Employee, LeaveRequest, PerformanceReview } from './hrData';

export default function AdminHR() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [reviews, setReviews] = useState<PerformanceReview[]>([]);

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

        <TabsContent value="dashboard"><AdminHRDashboard employees={employees} leaves={leaves} /></TabsContent>
        <TabsContent value="employees"><AdminHREmployees employees={employees} setEmployees={setEmployees} /></TabsContent>
        <TabsContent value="recruitment"><AdminHRRecruitment /></TabsContent>
        <TabsContent value="leaves"><AdminHRLeaves leaves={leaves} setLeaves={setLeaves} employees={employees} /></TabsContent>
        <TabsContent value="performance"><AdminHRPerformance reviews={reviews} setReviews={setReviews} employees={employees} /></TabsContent>
        <TabsContent value="orgchart"><AdminHROrgChart employees={employees} /></TabsContent>
        <TabsContent value="documents"><AdminHRDocuments employees={employees} /></TabsContent>
      </Tabs>
    </div>
  );
}

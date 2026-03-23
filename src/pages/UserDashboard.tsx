import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import Navigation from '@/components/ui/navigation';
import Footer from '@/components/Footer';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { UserPreferences } from '@/components/user/UserPreferences';
import { UserContributions } from '@/components/user/UserContributions';
import CadastralDashboardTabs from '@/components/cadastral/CadastralDashboardTabs';
import { UserBuildingPermits } from '@/components/user/UserBuildingPermits';
import { UserAccountSecurity } from '@/components/user/UserAccountSecurity';
import UserProfileSection from '@/components/user/UserProfileSection';
import { UserLandTitleRequests } from '@/components/user/UserLandTitleRequests';
import { NotificationBell } from '@/components/user/NotificationBell';
import { UserLandDisputes } from '@/components/user/UserLandDisputes';
import { UserExpertiseRequests } from '@/components/user/UserExpertiseRequests';
import { UserMutationRequests } from '@/components/user/UserMutationRequests';
import { UserMortgageRequests } from '@/components/user/UserMortgageRequests';
import { User, FileText, Building, CreditCard, Settings, ScrollText, Scale, FileSearch, FileEdit, Landmark } from 'lucide-react';

const UserDashboard = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return (
    <div className="min-h-dvh flex flex-col bg-muted/30">
      <Navigation />
      
      <main className="flex-grow px-3 py-4">
        <div className="max-w-[360px] sm:max-w-md lg:max-w-2xl mx-auto">
          {/* Header with notification bell */}
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-lg font-semibold">Mon compte</h1>
            <NotificationBell />
          </div>

          <Tabs defaultValue="profile" className="w-full">
            {/* Navigation compacte - scrollable horizontally */}
            <div className="overflow-x-auto -mx-1 px-1 pb-1">
              <TabsList className="w-max min-w-full h-auto p-1 flex gap-1 bg-background shadow-sm rounded-2xl border">
                <TabsTrigger 
                  value="profile" 
                  className="flex flex-col items-center gap-0.5 py-2 px-3 text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-xl transition-all"
                >
                  <User className="h-4 w-4" />
                  <span className="text-[10px] font-medium">Profil</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="contributions" 
                  className="flex flex-col items-center gap-0.5 py-2 px-3 text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-xl transition-all"
                >
                  <FileText className="h-4 w-4" />
                  <span className="text-[10px] font-medium">Données</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="titles" 
                  className="flex flex-col items-center gap-0.5 py-2 px-3 text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-xl transition-all"
                >
                  <ScrollText className="h-4 w-4" />
                  <span className="text-[10px] font-medium">Titres</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="permits" 
                  className="flex flex-col items-center gap-0.5 py-2 px-3 text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-xl transition-all"
                >
                  <Building className="h-4 w-4" />
                  <span className="text-[10px] font-medium">Autorisations</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="expertise" 
                  className="flex flex-col items-center gap-0.5 py-2 px-3 text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-xl transition-all"
                >
                  <FileSearch className="h-4 w-4" />
                  <span className="text-[10px] font-medium">Expertises</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="mutations" 
                  className="flex flex-col items-center gap-0.5 py-2 px-3 text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-xl transition-all"
                >
                  <FileEdit className="h-4 w-4" />
                  <span className="text-[10px] font-medium">Mutations</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="mortgages" 
                  className="flex flex-col items-center gap-0.5 py-2 px-3 text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-xl transition-all"
                >
                  <Landmark className="h-4 w-4" />
                  <span className="text-[10px] font-medium">Hypothèques</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="disputes" 
                  className="flex flex-col items-center gap-0.5 py-2 px-3 text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-xl transition-all"
                >
                  <Scale className="h-4 w-4" />
                  <span className="text-[10px] font-medium">Litiges</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="invoices" 
                  className="flex flex-col items-center gap-0.5 py-2 px-3 text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-xl transition-all"
                >
                  <CreditCard className="h-4 w-4" />
                  <span className="text-[10px] font-medium">Factures</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="settings" 
                  className="flex flex-col items-center gap-0.5 py-2 px-3 text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-xl transition-all"
                >
                  <Settings className="h-4 w-4" />
                  <span className="text-[10px] font-medium">Réglages</span>
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="profile" className="mt-4">
              <UserProfileSection />
            </TabsContent>

            <TabsContent value="contributions" className="mt-4 space-y-4">
              <UserContributions />
            </TabsContent>

            <TabsContent value="titles" className="mt-4">
              <UserLandTitleRequests />
            </TabsContent>

            <TabsContent value="permits" className="mt-4">
              <UserBuildingPermits />
            </TabsContent>

            <TabsContent value="expertise" className="mt-4">
              <UserExpertiseRequests />
            </TabsContent>

            <TabsContent value="mortgages" className="mt-4">
              <UserMortgageRequests />
            </TabsContent>

            <TabsContent value="disputes" className="mt-4">
              <UserLandDisputes />
            </TabsContent>

            <TabsContent value="mutations" className="mt-4">
              <UserMutationRequests />
            </TabsContent>

            <TabsContent value="invoices" className="mt-4">
              <CadastralDashboardTabs />
            </TabsContent>

            <TabsContent value="settings" className="mt-4 space-y-4">
              <UserPreferences />
              <UserAccountSecurity />
            </TabsContent>
          </Tabs>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default UserDashboard;

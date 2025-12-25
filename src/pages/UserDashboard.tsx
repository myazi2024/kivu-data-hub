import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import Navigation from '@/components/ui/navigation';
import Footer from '@/components/Footer';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { UserPreferences } from '@/components/user/UserPreferences';
import { UserCCCCodes } from '@/components/user/UserCCCCodes';
import { UserContributions } from '@/components/user/UserContributions';
import CadastralDashboardTabs from '@/components/cadastral/CadastralDashboardTabs';
import { UserBuildingPermits } from '@/components/user/UserBuildingPermits';
import { UserAccountSecurity } from '@/components/user/UserAccountSecurity';
import UserProfileSection from '@/components/user/UserProfileSection';
import { User, FileText, Building, CreditCard, Settings } from 'lucide-react';

const UserDashboard = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navigation />
      
      <main className="flex-grow px-2 sm:px-4 py-3">
        <div className="max-w-[400px] sm:max-w-2xl lg:max-w-4xl mx-auto space-y-3">
          <Tabs defaultValue="profile" className="w-full">
            {/* 5 onglets principaux fusionnés */}
            <TabsList className="w-full h-auto p-0.5 grid grid-cols-5 gap-0.5 bg-muted/50 rounded-xl">
              <TabsTrigger value="profile" className="flex flex-col items-center gap-0.5 px-1 py-1.5 text-xs data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-lg">
                <User className="h-3.5 w-3.5" />
                <span className="text-[9px] sm:text-[10px]">Profil</span>
              </TabsTrigger>
              <TabsTrigger value="contributions" className="flex flex-col items-center gap-0.5 px-1 py-1.5 text-xs data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-lg">
                <FileText className="h-3.5 w-3.5" />
                <span className="text-[9px] sm:text-[10px]">Données</span>
              </TabsTrigger>
              <TabsTrigger value="permits" className="flex flex-col items-center gap-0.5 px-1 py-1.5 text-xs data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-lg">
                <Building className="h-3.5 w-3.5" />
                <span className="text-[9px] sm:text-[10px]">Permis</span>
              </TabsTrigger>
              <TabsTrigger value="invoices" className="flex flex-col items-center gap-0.5 px-1 py-1.5 text-xs data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-lg">
                <CreditCard className="h-3.5 w-3.5" />
                <span className="text-[9px] sm:text-[10px]">Factures</span>
              </TabsTrigger>
              <TabsTrigger value="settings" className="flex flex-col items-center gap-0.5 px-1 py-1.5 text-xs data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-lg">
                <Settings className="h-3.5 w-3.5" />
                <span className="text-[9px] sm:text-[10px]">Réglages</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="profile" className="mt-3">
              <UserProfileSection />
            </TabsContent>

            <TabsContent value="contributions" className="mt-3 space-y-3">
              <UserContributions />
              <UserCCCCodes />
            </TabsContent>

            <TabsContent value="permits" className="mt-3">
              <UserBuildingPermits />
            </TabsContent>

            <TabsContent value="invoices" className="mt-3">
              <CadastralDashboardTabs />
            </TabsContent>

            <TabsContent value="settings" className="mt-3 space-y-3">
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

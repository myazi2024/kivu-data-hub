import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import Navigation from '@/components/ui/navigation';
import Footer from '@/components/Footer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import UserProfileHeader from '@/components/user/UserProfileHeader';
import { UserPreferences } from '@/components/user/UserPreferences';
import UserStatisticsCharts from '@/components/statistics/UserStatisticsCharts';
import { UserCCCCodes } from '@/components/user/UserCCCCodes';
import { UserContributions } from '@/components/user/UserContributions';
import CadastralDashboardTabs from '@/components/cadastral/CadastralDashboardTabs';
import { User, Gift, FileText, BarChart3, Settings, CreditCard } from 'lucide-react';

const UserDashboard = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navigation />
      
      <main className="flex-grow container-padding py-2 md:py-6">
        <div className="max-w-7xl mx-auto space-y-2 md:space-y-6">
          <UserProfileHeader />

          <Tabs defaultValue="profile" className="w-full">
            <TabsList className="w-full h-auto p-0.5 flex lg:grid lg:grid-cols-6 overflow-x-auto gap-0.5">
              <TabsTrigger value="profile" className="flex items-center gap-1 px-2 py-1.5 lg:px-3 lg:py-2">
                <User className="h-4 w-4 lg:h-4 lg:w-4" />
                <span className="hidden lg:inline text-xs">Profil</span>
              </TabsTrigger>
              <TabsTrigger value="contributions" className="flex items-center gap-1 px-2 py-1.5 lg:px-3 lg:py-2">
                <FileText className="h-4 w-4 lg:h-4 lg:w-4" />
                <span className="hidden lg:inline text-xs">Contributions</span>
              </TabsTrigger>
              <TabsTrigger value="ccc-codes" className="flex items-center gap-1 px-2 py-1.5 lg:px-3 lg:py-2">
                <Gift className="h-4 w-4 lg:h-4 lg:w-4" />
                <span className="hidden lg:inline text-xs">Codes CCC</span>
              </TabsTrigger>
              <TabsTrigger value="invoices" className="flex items-center gap-1 px-2 py-1.5 lg:px-3 lg:py-2">
                <CreditCard className="h-4 w-4 lg:h-4 lg:w-4" />
                <span className="hidden lg:inline text-xs">Factures</span>
              </TabsTrigger>
              <TabsTrigger value="statistics" className="flex items-center gap-1 px-2 py-1.5 lg:px-3 lg:py-2">
                <BarChart3 className="h-4 w-4 lg:h-4 lg:w-4" />
                <span className="hidden lg:inline text-xs">Stats</span>
              </TabsTrigger>
              <TabsTrigger value="preferences" className="flex items-center gap-1 px-2 py-1.5 lg:px-3 lg:py-2">
                <Settings className="h-4 w-4 lg:h-4 lg:w-4" />
                <span className="hidden lg:inline text-xs">Réglages</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="profile" className="mt-2 md:mt-6">
              <Card>
                <CardHeader className="pb-3 md:pb-6">
                  <CardTitle className="text-sm md:text-base">Informations personnelles</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 md:space-y-4">
                  <div>
                    <label className="text-xs md:text-sm font-medium text-muted-foreground">Email</label>
                    <p className="text-sm md:text-base mt-0.5">{user.email}</p>
                  </div>
                  <div>
                    <label className="text-xs md:text-sm font-medium text-muted-foreground">Compte créé le</label>
                    <p className="text-sm md:text-base mt-0.5">
                      {new Date(user.created_at).toLocaleDateString('fr-FR', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="contributions" className="mt-2 md:mt-6">
              <UserContributions />
            </TabsContent>

            <TabsContent value="ccc-codes" className="mt-2 md:mt-6">
              <UserCCCCodes />
            </TabsContent>

            <TabsContent value="invoices" className="mt-2 md:mt-6">
              <CadastralDashboardTabs />
            </TabsContent>

            <TabsContent value="statistics" className="mt-2 md:mt-6">
              <UserStatisticsCharts />
            </TabsContent>

            <TabsContent value="preferences" className="mt-2 md:mt-6">
              <UserPreferences />
            </TabsContent>
          </Tabs>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default UserDashboard;

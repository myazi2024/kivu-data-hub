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
      
      <main className="flex-grow container-padding py-4 md:py-8">
        <div className="max-w-7xl mx-auto space-y-4 md:space-y-6">
          <UserProfileHeader />

          <Tabs defaultValue="profile" className="w-full">
            <TabsList className="w-full h-auto p-1 flex lg:grid lg:grid-cols-6 overflow-x-auto gap-1">
              <TabsTrigger value="profile" className="flex items-center gap-1.5 px-3 py-2 text-xs whitespace-nowrap">
                <User className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                <span>Profil</span>
              </TabsTrigger>
              <TabsTrigger value="contributions" className="flex items-center gap-1.5 px-3 py-2 text-xs whitespace-nowrap">
                <FileText className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                <span>Contributions</span>
              </TabsTrigger>
              <TabsTrigger value="ccc-codes" className="flex items-center gap-1.5 px-3 py-2 text-xs whitespace-nowrap">
                <Gift className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                <span>Codes CCC</span>
              </TabsTrigger>
              <TabsTrigger value="invoices" className="flex items-center gap-1.5 px-3 py-2 text-xs whitespace-nowrap">
                <CreditCard className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                <span>Factures</span>
              </TabsTrigger>
              <TabsTrigger value="statistics" className="flex items-center gap-1.5 px-3 py-2 text-xs whitespace-nowrap">
                <BarChart3 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                <span>Stats</span>
              </TabsTrigger>
              <TabsTrigger value="preferences" className="flex items-center gap-1.5 px-3 py-2 text-xs whitespace-nowrap">
                <Settings className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                <span>Réglages</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="profile" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Informations personnelles</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Email</label>
                      <p className="text-base">{user.email}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Compte créé le</label>
                      <p className="text-base">
                        {new Date(user.created_at).toLocaleDateString('fr-FR', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="contributions" className="mt-6">
              <UserContributions />
            </TabsContent>

            <TabsContent value="ccc-codes" className="mt-6">
              <UserCCCCodes />
            </TabsContent>

            <TabsContent value="invoices" className="mt-6">
              <CadastralDashboardTabs />
            </TabsContent>

            <TabsContent value="statistics" className="mt-6">
              <UserStatisticsCharts />
            </TabsContent>

            <TabsContent value="preferences" className="mt-6">
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

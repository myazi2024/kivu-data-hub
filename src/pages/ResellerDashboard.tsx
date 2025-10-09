import React from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LogIn } from 'lucide-react';
import { Link } from 'react-router-dom';
import ResellerDashboard from '@/components/reseller/ResellerDashboard';
import ResellerStatisticsCharts from '@/components/statistics/ResellerStatisticsCharts';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const ResellerDashboardPage: React.FC = () => {
  const { user } = useAuth();

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-md mx-auto">
          <Card>
            <CardContent className="p-8 text-center">
              <LogIn className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h2 className="text-xl font-semibold mb-2">Connexion requise</h2>
              <p className="text-muted-foreground mb-4">
                Vous devez être connecté pour accéder à votre tableau de bord revendeur.
              </p>
              <Button asChild>
                <Link to="/auth">Se connecter</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Tableau de bord revendeur</h1>
        <p className="text-muted-foreground">
          Gérez vos codes de remise et suivez vos commissions
        </p>
      </div>
      
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Vue d'ensemble</TabsTrigger>
          <TabsTrigger value="statistics">Statistiques détaillées</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <ResellerDashboard />
        </TabsContent>

        <TabsContent value="statistics">
          <ResellerStatisticsCharts />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ResellerDashboardPage;

import React from 'react';
import CadastralDashboardTabs from '@/components/cadastral/CadastralDashboardTabs';
import UserProfileHeader from '@/components/user/UserProfileHeader';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LogIn } from 'lucide-react';
import { Link } from 'react-router-dom';

const BillingDashboard: React.FC = () => {
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
                Vous devez être connecté pour accéder à votre tableau de bord de facturation.
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
    <div className="container mx-auto px-4 py-8 space-y-6">
      <UserProfileHeader />
      
      <CadastralDashboardTabs />
    </div>
  );
};

export default BillingDashboard;
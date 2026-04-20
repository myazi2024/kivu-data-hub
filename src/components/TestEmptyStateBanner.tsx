import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTestEnvironment } from '@/hooks/useTestEnvironment';
import { useTestDataStats } from '@/components/admin/test-mode/useTestDataStats';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Settings } from 'lucide-react';

/**
 * Shown on /test/* routes when no TEST-% data exists.
 * Routes are already admin-only, so no role check needed here.
 */
const TestEmptyStateBanner = () => {
  const { isTestRoute } = useTestEnvironment();
  const { total, loading, refresh } = useTestDataStats();

  useEffect(() => {
    if (isTestRoute) refresh();
  }, [isTestRoute, refresh]);

  if (!isTestRoute || loading || total > 0) return null;

  return (
    <div className="container mx-auto px-4 pt-4">
      <Alert variant="default" className="border-warning/50 bg-warning/5">
        <AlertTriangle className="h-4 w-4 text-warning" />
        <AlertTitle>Aucune donnée de test</AlertTitle>
        <AlertDescription className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mt-1">
          <span className="text-sm">
            Les analytics affichent 0 car aucun enregistrement <code>TEST-</code> n'existe.
            Activez le mode test et générez un jeu de données depuis l'administration.
          </span>
          <Button asChild size="sm" variant="outline" className="shrink-0">
            <Link to="/admin?tab=test-mode">
              <Settings className="h-3.5 w-3.5 mr-1.5" />
              Ouvrir le Mode Test
            </Link>
          </Button>
        </AlertDescription>
      </Alert>
    </div>
  );
};

export default TestEmptyStateBanner;

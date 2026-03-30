import { useTestEnvironment } from '@/hooks/useTestEnvironment';
import { AlertTriangle } from 'lucide-react';

const TestEnvironmentBanner = () => {
  const { isTestRoute } = useTestEnvironment();

  if (!isTestRoute) return null;

  return (
    <div className="sticky top-0 z-[9999] bg-amber-500 text-amber-950 text-center text-sm font-medium py-1.5 px-4 flex items-center justify-center gap-2">
      <AlertTriangle className="h-4 w-4 shrink-0" />
      <span>Environnement de test — les données affichées sont fictives</span>
    </div>
  );
};

export default TestEnvironmentBanner;

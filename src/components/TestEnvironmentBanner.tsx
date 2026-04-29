import { useTestEnvironment } from '@/hooks/useTestEnvironment';

const TestEnvironmentBanner = () => {
  const { isTestRoute } = useTestEnvironment();

  if (!isTestRoute) return null;

  return (
    <div
      role="status"
      aria-label="Environnement de test actif"
      className="fixed top-2 right-2 z-50 px-3 py-1 rounded-full bg-warning/15 text-warning border border-warning/40 text-xs font-medium shadow-sm select-none pointer-events-none flex items-center gap-1.5"
    >
      <span className="h-1.5 w-1.5 rounded-full bg-warning animate-pulse" aria-hidden="true" />
      Environnement test
    </div>
  );
};

export default TestEnvironmentBanner;

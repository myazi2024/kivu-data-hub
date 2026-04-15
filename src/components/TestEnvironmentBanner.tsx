import { useTestEnvironment } from '@/hooks/useTestEnvironment';

const TestEnvironmentBanner = () => {
  const { isTestRoute } = useTestEnvironment();

  if (!isTestRoute) return null;

  return (
    <div className="fixed bottom-2 right-2 z-40 px-2 py-0.5 rounded-full bg-muted/30 text-muted-foreground/60 border border-border/30 text-[10px] select-none pointer-events-none">
      Environnement test
    </div>
  );
};

export default TestEnvironmentBanner;

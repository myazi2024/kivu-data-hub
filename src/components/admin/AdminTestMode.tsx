import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, TestTube } from 'lucide-react';
import { useTestMode, TestModeConfig } from '@/hooks/useTestMode';
import { useAuth } from '@/hooks/useAuth';
import { upsertSearchConfig, logAuditAction } from '@/utils/supabaseConfigUtils';
import { toast } from 'sonner';
import { toRecord } from './test-mode/types';
import { useTestDataStats } from './test-mode/useTestDataStats';
import { useTestDataActions } from './test-mode/useTestDataActions';
import TestModeConfigCard from './test-mode/TestModeConfigCard';
import TestDataStatsCard from './test-mode/TestDataStatsCard';
import TestModeGuide from './test-mode/TestModeGuide';

const AdminTestMode: React.FC = () => {
  const [saving, setSaving] = useState(false);
  const { testMode: savedConfig, loading, isTestModeActive, refreshConfiguration } = useTestMode();
  const { user } = useAuth();

  const [config, setConfig] = useState<TestModeConfig>(savedConfig);

  useEffect(() => {
    setConfig(savedConfig);
  }, [savedConfig]);

  const { stats, total, loading: statsLoading, refresh: refreshStats } = useTestDataStats();

  useEffect(() => {
    if (!loading) {
      refreshStats();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading]);

  const {
    cleaningUp,
    generatingData,
    generationSteps,
    currentStep,
    cleanupTestData,
    generateTestData,
  } = useTestDataActions({
    userId: user?.id,
    onComplete: refreshStats,
  });

  // Dirty-check: only enable save when config differs from server state
  const isDirty = useMemo(
    () =>
      config.enabled !== savedConfig.enabled ||
      config.auto_cleanup !== savedConfig.auto_cleanup ||
      config.test_data_retention_days !== savedConfig.test_data_retention_days,
    [config, savedConfig]
  );

  const handleConfigChange = (update: Partial<TestModeConfig>) => {
    setConfig((prev) => ({ ...prev, ...update }));
  };

  const saveConfiguration = async () => {
    if (!isDirty) return;

    const validatedConfig = {
      ...config,
      auto_cleanup: config.enabled ? config.auto_cleanup : false,
      test_data_retention_days: Math.min(30, Math.max(1, config.test_data_retention_days)),
    };

    try {
      setSaving(true);

      const oldConfig = { ...savedConfig };

      await upsertSearchConfig(
        'test_mode',
        toRecord(validatedConfig),
        "Configuration du mode test global pour l'admin"
      );

      await logAuditAction(
        validatedConfig.enabled ? 'TEST_MODE_ENABLED' : 'TEST_MODE_DISABLED',
        'cadastral_search_config',
        undefined,
        toRecord(oldConfig),
        toRecord(validatedConfig)
      );

      toast.success('Configuration enregistrée', {
        description: 'Le mode test a été mis à jour',
      });

      await refreshConfiguration();
      await refreshStats();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Veuillez réessayer';
      console.error("Erreur lors de l'enregistrement:", error);
      toast.error("Erreur lors de l'enregistrement", { description: message });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl md:text-3xl font-bold tracking-tight">Mode Test</h2>
        <p className="text-muted-foreground mt-1">
          Testez les flux critiques sans affecter les données réelles
        </p>
      </div>

      {/* État du mode test */}
      <Card className="border-2">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <TestTube className="h-6 w-6 text-primary" />
              </div>
              <div>
                <CardTitle className="text-lg">Mode Test Global</CardTitle>
                <CardDescription>
                  Activez pour tester les flux sans impact sur les données
                </CardDescription>
              </div>
            </div>
            <Badge
              variant={isTestModeActive ? 'default' : 'secondary'}
              className="text-sm px-3 py-1"
            >
              {isTestModeActive ? 'Actif' : 'Inactif'}
            </Badge>
          </div>
        </CardHeader>
      </Card>

      {/* Configuration */}
      <TestModeConfigCard
        config={config}
        savedConfig={savedConfig}
        saving={saving}
        isDirty={isDirty}
        onConfigChange={handleConfigChange}
        onSave={saveConfiguration}
      />

      {/* Statistiques */}
      <TestDataStatsCard
        stats={stats}
        total={total}
        isTestModeActive={isTestModeActive}
        cleaningUp={cleaningUp}
        generatingData={generatingData}
        statsLoading={statsLoading}
        generationSteps={generationSteps}
        currentStep={currentStep}
        onGenerate={generateTestData}
        onCleanup={cleanupTestData}
        onRefresh={refreshStats}
      />

      {/* Guide */}
      <TestModeGuide />
    </div>
  );
};

export default AdminTestMode;

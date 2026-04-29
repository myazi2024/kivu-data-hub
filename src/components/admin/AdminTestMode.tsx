import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, TestTube, AlertTriangle, BarChart3, Map as MapIcon } from 'lucide-react';
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
import GenerationProgress from './test-mode/GenerationProgress';
import CleanupProgress from './test-mode/CleanupProgress';
import TestCleanupHistoryCard from './test-mode/TestCleanupHistoryCard';
import TestCronStatusCard from './test-mode/TestCronStatusCard';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from '@/components/ui/alert-dialog';

const AdminTestMode: React.FC = () => {
  const [saving, setSaving] = useState(false);
  const [showCleanupDialog, setShowCleanupDialog] = useState(false);
  const [showDisableConfirmDialog, setShowDisableConfirmDialog] = useState(false);
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
    regenerating,
    generationSteps,
    currentStep,
    cleanupPerStep,
    cleanupFailedStep,
    cleanupTruncatedSteps,
    cleanupTestData,
    generateTestData,
    regenerateTestData,
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

  const saveConfiguration = async (skipCleanupCheck = false) => {
    if (!isDirty) return;

    // Intercept: disabling test mode
    if (!skipCleanupCheck && savedConfig.enabled && !config.enabled) {
      if (total > 0) {
        setShowCleanupDialog(true);
      } else {
        setShowDisableConfirmDialog(true);
      }
      return;
    }

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

      const wasJustEnabled = !savedConfig.enabled && validatedConfig.enabled;

      await refreshConfiguration();
      await refreshStats();

      if (wasJustEnabled && total === 0) {
        generateTestData();
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Veuillez réessayer';
      console.error("Erreur lors de l'enregistrement:", error);
      toast.error("Erreur lors de l'enregistrement", { description: message });
    } finally {
      setSaving(false);
    }
  };

  const handleDisableWithCleanup = async () => {
    setShowCleanupDialog(false);
    const validatedConfig = {
      ...config,
      auto_cleanup: false,
      test_data_retention_days: Math.min(30, Math.max(1, config.test_data_retention_days)),
    };
    try {
      setSaving(true);
      // Delegate purge to the hook so progress streams via cleanupPerStep /
      // cleanupFailedStep / cleanupTruncatedSteps + CleanupProgress.
      await cleanupTestData();

      const oldConfig = { ...savedConfig };
      await upsertSearchConfig('test_mode', toRecord(validatedConfig), "Configuration du mode test global pour l'admin");
      await logAuditAction('TEST_MODE_DISABLED', 'cadastral_search_config', undefined, toRecord(oldConfig), toRecord(validatedConfig));
      toast.success('Configuration enregistrée', { description: 'Mode test désactivé et données supprimées' });
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

  const handleDisableWithoutCleanup = () => {
    setShowCleanupDialog(false);
    saveConfiguration(true);
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
          {isTestModeActive && (
            <div className="mt-3 flex flex-wrap gap-3">
              <a
                href="/test/map"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Ouvrir Analytics test dans un nouvel onglet"
                className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
              >
                <BarChart3 className="h-4 w-4" aria-hidden="true" />
                Analytics / Données foncières (test)
              </a>
              <a
                href="/test/cadastral-map"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Ouvrir Carte cadastrale test dans un nouvel onglet"
                className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
              >
                <MapIcon className="h-4 w-4" aria-hidden="true" />
                Carte cadastrale (test)
              </a>
            </div>
          )}
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

      {/* Progression de génération automatique */}
      <GenerationProgress
        steps={generationSteps}
        currentStep={currentStep}
        visible={generatingData}
      />

      {/* Progression de la purge serveur — visible sur les 3 chemins */}
      <CleanupProgress
        visible={cleaningUp || regenerating || cleanupPerStep !== null}
        perStep={cleanupPerStep}
        failedStep={cleanupFailedStep}
        truncatedSteps={cleanupTruncatedSteps}
      />

      {/* Statistiques */}
      <TestDataStatsCard
        stats={stats}
        total={total}
        cleaningUp={cleaningUp}
        statsLoading={statsLoading}
        regenerating={regenerating}
        generatingData={generatingData}
        isTestModeActive={isTestModeActive}
        onCleanup={cleanupTestData}
        onRefresh={refreshStats}
        onRegenerate={regenerateTestData}
        onGenerate={generateTestData}
      />

      {/* Guide */}
      <TestModeGuide />

      {/* Visibilité opérationnelle */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <TestCleanupHistoryCard />
        <TestCronStatusCard />
      </div>

      {/* Dialogue de confirmation nettoyage à la désactivation */}
      <AlertDialog open={showCleanupDialog} onOpenChange={setShowCleanupDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Données test détectées
            </AlertDialogTitle>
            <AlertDialogDescription>
              Il reste <strong>{total}</strong> enregistrement(s) de test dans la base de données.
              Si vous désactivez le mode test sans les supprimer, ces données resteront visibles
              dans l'application.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
            <AlertDialogCancel onClick={() => {
              setShowCleanupDialog(false);
              setConfig(prev => ({ ...prev, enabled: true }));
            }}>
              Annuler
            </AlertDialogCancel>
            <AlertDialogAction
              className="border border-input bg-background hover:bg-accent hover:text-accent-foreground"
              onClick={handleDisableWithoutCleanup}
            >
              Désactiver uniquement
            </AlertDialogAction>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDisableWithCleanup}
            >
              Désactiver et supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialogue de confirmation simple (total === 0) */}
      <AlertDialog open={showDisableConfirmDialog} onOpenChange={setShowDisableConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Désactiver le mode test ?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Vous êtes sur le point de <strong>désactiver le mode test</strong>.
              Toutes les opérations affecteront les <strong>données de production</strong>.
              Cette action nécessite votre confirmation explicite.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setShowDisableConfirmDialog(false);
              setConfig(prev => ({ ...prev, enabled: true }));
            }}>
              Annuler
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                setShowDisableConfirmDialog(false);
                saveConfiguration(true);
              }}
            >
              Confirmer la désactivation
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AdminTestMode;

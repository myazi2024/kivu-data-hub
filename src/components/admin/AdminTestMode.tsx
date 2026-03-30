import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, TestTube, AlertTriangle } from 'lucide-react';
import { useTestMode, TestModeConfig } from '@/hooks/useTestMode';
import { useAuth } from '@/hooks/useAuth';
import { upsertSearchConfig, logAuditAction } from '@/utils/supabaseConfigUtils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { toRecord } from './test-mode/types';
import { useTestDataStats } from './test-mode/useTestDataStats';
import { useTestDataActions } from './test-mode/useTestDataActions';
import TestModeConfigCard from './test-mode/TestModeConfigCard';
import TestDataStatsCard from './test-mode/TestDataStatsCard';
import TestModeGuide from './test-mode/TestModeGuide';
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

  const handleDisableWithCleanup = async () => {
    setShowCleanupDialog(false);
    // Small delay to let state update, then save
    const validatedConfig = {
      ...config,
      auto_cleanup: false,
      test_data_retention_days: Math.min(30, Math.max(1, config.test_data_retention_days)),
    };
    try {
      setSaving(true);
      toast.info('Suppression des données test en cours…');
      const { error: rpcError } = await supabase.rpc('cleanup_all_test_data');
      if (rpcError) throw rpcError;
      toast.success('Données test supprimées');

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
      setCleanupOnDisable(false);
    }
  };

  const handleDisableWithoutCleanup = () => {
    setShowCleanupDialog(false);
    setCleanupOnDisable(false);
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

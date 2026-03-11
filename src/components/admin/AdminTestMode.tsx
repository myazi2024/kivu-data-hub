import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
  Loader2, 
  TestTube, 
  AlertTriangle, 
  CheckCircle2, 
  Info,
  Database,
  Trash2,
  Upload,
  RefreshCw
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useTestMode, TestModeConfig } from '@/hooks/useTestMode';
import { useAuth } from '@/hooks/useAuth';
import { upsertSearchConfig, logAuditAction } from '@/utils/supabaseConfigUtils';
import { toast } from 'sonner';

const AdminTestMode: React.FC = () => {
  const [saving, setSaving] = useState(false);
  const [cleaningUp, setCleaningUp] = useState(false);
  const [generatingData, setGeneratingData] = useState(false);
  const { testMode: loadedConfig, loading, refreshConfiguration } = useTestMode();
  const { user } = useAuth();
  const [config, setConfig] = useState<TestModeConfig>({
    enabled: false,
    auto_cleanup: false,
    test_data_retention_days: 7
  });
  const [testDataStats, setTestDataStats] = useState({
    contributions: 0,
    invoices: 0,
    payments: 0,
    cccCodes: 0
  });

  useEffect(() => {
    if (loadedConfig) {
      setConfig(loadedConfig);
    }
  }, [loadedConfig]);

  useEffect(() => {
    if (!loading) {
      loadTestDataStats();
    }
  }, [loading]);

  const loadTestDataStats = useCallback(async () => {
    try {
      // Fix #16: Promise.allSettled pour stats partielles
      const results = await Promise.allSettled([
        supabase.from('cadastral_contributions').select('id', { count: 'exact', head: true }).ilike('parcel_number', 'TEST-%'),
        supabase.from('cadastral_invoices').select('id', { count: 'exact', head: true }).ilike('parcel_number', 'TEST-%'),
        supabase.from('payment_transactions').select('id', { count: 'exact', head: true }).eq('metadata->>test_mode', 'true'),
        supabase.from('cadastral_contributor_codes').select('id', { count: 'exact', head: true }).ilike('parcel_number', 'TEST-%')
      ]);

      setTestDataStats({
        contributions: results[0].status === 'fulfilled' ? (results[0].value.count || 0) : 0,
        invoices: results[1].status === 'fulfilled' ? (results[1].value.count || 0) : 0,
        payments: results[2].status === 'fulfilled' ? (results[2].value.count || 0) : 0,
        cccCodes: results[3].status === 'fulfilled' ? (results[3].value.count || 0) : 0
      });
    } catch (error) {
      console.error('Error loading test data stats:', error);
    }
  }, []);

  const saveConfiguration = async () => {
    // Fix #8: Validation côté sauvegarde
    const validatedConfig = {
      ...config,
      test_data_retention_days: Math.min(30, Math.max(1, config.test_data_retention_days))
    };

    // Fix #10: Confirmation renforcée pour désactivation du mode test
    if (loadedConfig.enabled && !validatedConfig.enabled) {
      if (!confirm('⚠️ Vous êtes sur le point de DÉSACTIVER le mode test. Toutes les opérations affecteront les données de production. Confirmer ?')) {
        return;
      }
    }

    try {
      setSaving(true);

      const oldConfig = { ...loadedConfig };

      // Fix #14: Utilisation de l'utilitaire partagé
      await upsertSearchConfig(
        'test_mode',
        validatedConfig as unknown as Record<string, unknown>,
        'Configuration du mode test global pour l\'admin'
      );

      // Fix #9: Journal d'audit
      await logAuditAction(
        validatedConfig.enabled ? 'TEST_MODE_ENABLED' : 'TEST_MODE_DISABLED',
        'cadastral_search_config',
        undefined,
        oldConfig as unknown as Record<string, unknown>,
        validatedConfig as unknown as Record<string, unknown>
      );

      toast.success('Configuration enregistrée', {
        description: 'Le mode test a été mis à jour'
      });

      setConfig(validatedConfig);
      await refreshConfiguration();
    } catch (error: any) {
      console.error('Erreur lors de l\'enregistrement:', error);
      toast.error('Erreur lors de l\'enregistrement', {
        description: error.message || 'Veuillez réessayer'
      });
    } finally {
      setSaving(false);
    }
  };

  const cleanupTestData = async () => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer toutes les données de test ? Cette action est irréversible.')) {
      return;
    }

    try {
      setCleaningUp(true);

      // Fix #5: Ordre respectant les FK — d'abord les tables enfants
      // 1. Codes CCC (référence contributions)
      const { error: cccError } = await supabase
        .from('cadastral_contributor_codes')
        .delete()
        .ilike('parcel_number', 'TEST-%');
      if (cccError) console.error('Erreur suppression codes CCC:', cccError);

      // 2. Service access (référence invoices)
      const { error: accessError } = await supabase
        .from('cadastral_service_access')
        .delete()
        .ilike('parcel_number', 'TEST-%');
      if (accessError) console.error('Erreur suppression accès services:', accessError);

      // 3. Factures
      const { error: invoiceError } = await supabase
        .from('cadastral_invoices')
        .delete()
        .ilike('parcel_number', 'TEST-%');
      if (invoiceError) console.error('Erreur suppression factures:', invoiceError);

      // 4. Contributions (table parent)
      const { error: contribError } = await supabase
        .from('cadastral_contributions')
        .delete()
        .ilike('parcel_number', 'TEST-%');
      if (contribError) console.error('Erreur suppression contributions:', contribError);

      // Fix #4: Supprimer aussi les payment_transactions de test
      const { error: paymentError } = await supabase
        .from('payment_transactions')
        .delete()
        .eq('metadata->>test_mode', 'true');
      if (paymentError) console.error('Erreur suppression paiements:', paymentError);

      // Fix #9: Audit de l'action de nettoyage
      await logAuditAction(
        'TEST_DATA_CLEANUP',
        'cadastral_contributions',
        undefined,
        { stats_before: testDataStats } as unknown as Record<string, unknown>,
        { cleaned: true } as unknown as Record<string, unknown>
      );

      toast.success('Données de test supprimées', {
        description: 'Toutes les données de test ont été nettoyées'
      });

      await loadTestDataStats();
    } catch (error: any) {
      console.error('Erreur lors du nettoyage:', error);
      toast.error('Erreur lors du nettoyage', {
        description: error.message || 'Veuillez réessayer'
      });
    } finally {
      setCleaningUp(false);
    }
  };

  const generateTestData = async () => {
    // Fix #3: Vérification user_id
    if (!user?.id) {
      toast.error('Erreur', { description: 'Vous devez être connecté pour générer des données de test' });
      return;
    }

    try {
      setGeneratingData(true);

      // Fix #11: Données de test plus complètes
      const testContributions = [
        {
          parcel_number: 'TEST-001',
          property_title_type: 'Titre foncier',
          current_owner_name: 'Test User 1',
          area_sqm: 500,
          province: 'Kinshasa',
          ville: 'Kinshasa',
          commune: 'Gombe',
          status: 'approved',
          contribution_type: 'creation',
          user_id: user.id
        },
        {
          parcel_number: 'TEST-002',
          property_title_type: 'Concession',
          current_owner_name: 'Test User 2',
          area_sqm: 1000,
          province: 'Nord-Kivu',
          ville: 'Goma',
          status: 'pending',
          contribution_type: 'creation',
          user_id: user.id
        },
        {
          parcel_number: 'TEST-003',
          property_title_type: 'Titre foncier',
          current_owner_name: 'Test User 3',
          area_sqm: 750,
          province: 'Sud-Kivu',
          ville: 'Bukavu',
          status: 'rejected',
          contribution_type: 'update',
          user_id: user.id
        }
      ];

      const { error: contribError } = await supabase
        .from('cadastral_contributions')
        .insert(testContributions);

      if (contribError) throw contribError;

      // Générer aussi des factures de test
      const testInvoices = [
        {
          parcel_number: 'TEST-001',
          selected_services: ['carte_cadastrale', 'fiche_identification'] as any,
          total_amount_usd: 10,
          client_email: 'test@example.com',
          client_name: 'Test User 1',
          status: 'paid',
          user_id: user.id
        },
        {
          parcel_number: 'TEST-002',
          selected_services: ['carte_cadastrale'] as any,
          total_amount_usd: 5,
          client_email: 'test2@example.com',
          client_name: 'Test User 2',
          status: 'pending',
          user_id: user.id
        }
      ];

      const { error: invoiceError } = await supabase
        .from('cadastral_invoices')
        .insert(testInvoices);

      if (invoiceError) console.error('Erreur génération factures test:', invoiceError);

      // Fix #9: Audit
      await logAuditAction(
        'TEST_DATA_GENERATED',
        'cadastral_contributions',
        undefined,
        undefined,
        { contributions: testContributions.length, invoices: testInvoices.length } as unknown as Record<string, unknown>
      );

      toast.success('Données de test générées', {
        description: `${testContributions.length} contributions et ${testInvoices.length} factures de test créées`
      });

      await loadTestDataStats();
    } catch (error: any) {
      console.error('Erreur lors de la génération:', error);
      toast.error('Erreur lors de la génération', {
        description: error.message || 'Veuillez réessayer'
      });
    } finally {
      setGeneratingData(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const totalTestData = testDataStats.contributions + testDataStats.invoices + testDataStats.payments + testDataStats.cccCodes;

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
                <CardDescription>Activez pour tester les flux sans impact sur les données</CardDescription>
              </div>
            </div>
            <Badge variant={config.enabled ? 'default' : 'secondary'} className="text-sm px-3 py-1">
              {config.enabled ? 'Actif' : 'Inactif'}
            </Badge>
          </div>
        </CardHeader>
      </Card>

      {/* Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Configuration du mode test
          </CardTitle>
          <CardDescription>
            Paramètres de gestion des données de test
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Activer le mode test */}
          <div className="flex items-center justify-between p-4 rounded-lg border bg-card">
            <div className="space-y-1 flex-1">
              <Label htmlFor="test-mode-enabled" className="text-base font-medium">
                Mode test activé
              </Label>
              <p className="text-sm text-muted-foreground">
                Active le mode test pour tous les flux critiques (paiements, contributions, etc.)
              </p>
            </div>
            <Switch
              id="test-mode-enabled"
              checked={config.enabled}
              onCheckedChange={(checked) => 
                setConfig(prev => ({ ...prev, enabled: checked }))
              }
            />
          </div>

          {/* Nettoyage automatique */}
          <div className="flex items-center justify-between p-4 rounded-lg border bg-card">
            <div className="space-y-1 flex-1">
              <Label htmlFor="auto-cleanup" className="text-base font-medium">
                Nettoyage automatique
              </Label>
              <p className="text-sm text-muted-foreground">
                Supprime automatiquement les données de test après expiration
              </p>
            </div>
            <Switch
              id="auto-cleanup"
              checked={config.auto_cleanup}
              disabled={!config.enabled}
              onCheckedChange={(checked) => 
                setConfig(prev => ({ ...prev, auto_cleanup: checked }))
              }
            />
          </div>

          {/* Durée de rétention */}
          {config.auto_cleanup && (
            <div className="p-4 rounded-lg border bg-card space-y-2">
              <Label htmlFor="retention-days" className="text-base font-medium">
                Durée de rétention (jours)
              </Label>
              <Input
                id="retention-days"
                type="number"
                min={1}
                max={30}
                value={config.test_data_retention_days}
                onChange={(e) => {
                  // Fix #8: Validation stricte
                  const value = parseInt(e.target.value);
                  if (!isNaN(value)) {
                    setConfig(prev => ({ 
                      ...prev, 
                      test_data_retention_days: Math.min(30, Math.max(1, value))
                    }));
                  }
                }}
                className="w-32"
              />
              <p className="text-sm text-muted-foreground">
                Les données de test seront automatiquement supprimées après ce délai (1-30 jours)
              </p>
            </div>
          )}

          {/* Alertes */}
          {config.enabled && (
            <Alert>
              <CheckCircle2 className="h-4 w-4" />
              <AlertDescription>
                <strong>Mode test actif :</strong> Les données créées seront marquées comme données de test 
                (préfixe TEST-) et pourront être facilement nettoyées.
              </AlertDescription>
            </Alert>
          )}

          {!config.enabled && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>Mode test inactif :</strong> Toutes les opérations affecteront directement 
                les données de production. Activez le mode test pour les essais.
              </AlertDescription>
            </Alert>
          )}

          {/* Bouton d'enregistrement */}
          <div className="flex justify-end pt-4">
            <Button 
              onClick={saveConfiguration} 
              disabled={saving}
              size="lg"
            >
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Enregistrer la configuration
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Statistiques des données de test */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="h-5 w-5" />
            Données de test existantes
          </CardTitle>
          <CardDescription>
            Vue d'ensemble des données de test actuellement dans le système
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="p-3 rounded-lg border bg-card">
              <p className="text-sm text-muted-foreground">Contributions</p>
              <p className="text-2xl font-bold">{testDataStats.contributions}</p>
            </div>
            <div className="p-3 rounded-lg border bg-card">
              <p className="text-sm text-muted-foreground">Factures</p>
              <p className="text-2xl font-bold">{testDataStats.invoices}</p>
            </div>
            <div className="p-3 rounded-lg border bg-card">
              <p className="text-sm text-muted-foreground">Paiements</p>
              <p className="text-2xl font-bold">{testDataStats.payments}</p>
            </div>
            <div className="p-3 rounded-lg border bg-card">
              <p className="text-sm text-muted-foreground">Codes CCC</p>
              <p className="text-2xl font-bold">{testDataStats.cccCodes}</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              onClick={generateTestData}
              disabled={generatingData || !config.enabled}
            >
              {generatingData ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Upload className="mr-2 h-4 w-4" />
              )}
              Générer données de test
            </Button>

            <Button
              variant="outline"
              onClick={loadTestDataStats}
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Actualiser
            </Button>

            <Button
              variant="destructive"
              onClick={cleanupTestData}
              disabled={cleaningUp || totalTestData === 0}
            >
              {cleaningUp ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="mr-2 h-4 w-4" />
              )}
              Nettoyer tout
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Guide d'utilisation */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Guide d'utilisation</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <div className="flex gap-2">
            <div className="shrink-0 mt-0.5">•</div>
            <p>
              Activez le <strong>mode test</strong> avant de tester les flux critiques (paiements, contributions, etc.)
            </p>
          </div>
          <div className="flex gap-2">
            <div className="shrink-0 mt-0.5">•</div>
            <p>
              Toutes les données créées en mode test auront le préfixe <strong>TEST-</strong> dans leur numéro de parcelle
            </p>
          </div>
          <div className="flex gap-2">
            <div className="shrink-0 mt-0.5">•</div>
            <p>
              Utilisez <strong>"Générer données de test"</strong> pour créer rapidement des jeux de données de test
            </p>
          </div>
          <div className="flex gap-2">
            <div className="shrink-0 mt-0.5">•</div>
            <p>
              Le <strong>nettoyage automatique</strong> supprimera les données de test après le délai configuré
            </p>
          </div>
          <div className="flex gap-2">
            <div className="shrink-0 mt-0.5">•</div>
            <p>
              Utilisez <strong>"Nettoyer tout"</strong> pour supprimer manuellement toutes les données de test
            </p>
          </div>
          <div className="flex gap-2">
            <div className="shrink-0 mt-0.5">•</div>
            <p>
              <strong>Important :</strong> Désactivez le mode test en production pour éviter la pollution des données
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminTestMode;

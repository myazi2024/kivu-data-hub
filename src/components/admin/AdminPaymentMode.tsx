import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Loader2, CreditCard, ShieldAlert, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface PaymentModeConfig {
  enabled: boolean;
  bypass_payment: boolean;
  test_mode: boolean;
}

const AdminPaymentMode: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [config, setConfig] = useState<PaymentModeConfig>({
    enabled: false,
    bypass_payment: true,
    test_mode: true
  });

  useEffect(() => {
    loadConfiguration();
  }, []);

  const loadConfiguration = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('cadastral_search_config')
        .select('config_value')
        .eq('config_key', 'payment_mode')
        .eq('is_active', true)
        .maybeSingle();

      if (error) throw error;

      if (data?.config_value) {
        const value = data.config_value as any;
        setConfig({
          enabled: value.enabled ?? false,
          bypass_payment: value.bypass_payment ?? true,
          test_mode: value.test_mode ?? true
        });
      }
    } catch (error: any) {
      console.error('Erreur lors du chargement de la configuration:', error);
      toast.error('Erreur lors du chargement de la configuration');
    } finally {
      setLoading(false);
    }
  };

  const saveConfiguration = async () => {
    try {
      setSaving(true);

      // Vérifier d'abord si l'enregistrement existe
      const { data: existingConfig } = await supabase
        .from('cadastral_search_config')
        .select('id')
        .eq('config_key', 'payment_mode')
        .maybeSingle();

      let result;
      if (existingConfig) {
        // Mettre à jour l'enregistrement existant
        result = await supabase
          .from('cadastral_search_config')
          .update({
            config_value: config as any,
            updated_at: new Date().toISOString(),
            is_active: true
          })
          .eq('config_key', 'payment_mode');
      } else {
        // Créer un nouvel enregistrement si inexistant
        result = await supabase
          .from('cadastral_search_config')
          .insert({
            config_key: 'payment_mode',
            config_value: config as any,
            is_active: true,
            description: 'Configuration du mode de paiement pour les services cadastraux'
          });
      }

      if (result.error) throw result.error;

      toast.success('Configuration enregistrée avec succès', {
        description: 'Les changements sont effectifs immédiatement pour tous les utilisateurs'
      });

      // Recharger la configuration pour confirmer
      await loadConfiguration();
    } catch (error: any) {
      console.error('Erreur lors de l\'enregistrement:', error);
      toast.error('Erreur lors de l\'enregistrement de la configuration', {
        description: error.message || 'Veuillez réessayer'
      });
    } finally {
      setSaving(false);
    }
  };

  const getCurrentMode = () => {
    if (!config.enabled && config.bypass_payment) {
      return { label: 'Mode Développement', variant: 'secondary' as const, icon: AlertTriangle };
    }
    if (config.enabled && config.test_mode) {
      return { label: 'Mode Test', variant: 'default' as const, icon: ShieldAlert };
    }
    if (config.enabled && !config.test_mode) {
      return { label: 'Mode Production', variant: 'default' as const, icon: CheckCircle2 };
    }
    return { label: 'Mode Inconnu', variant: 'destructive' as const, icon: AlertTriangle };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const currentMode = getCurrentMode();
  const Icon = currentMode.icon;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl md:text-3xl font-bold tracking-tight">Mode de paiement</h2>
        <p className="text-muted-foreground mt-1">
          Configurez le mode de paiement pour le catalogue de services cadastraux
        </p>
      </div>

      {/* Indicateur de mode actuel */}
      <Card className="border-2">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Icon className="h-6 w-6 text-primary" />
              </div>
              <div>
                <CardTitle className="text-lg">État actuel</CardTitle>
                <CardDescription>Mode de fonctionnement du système de paiement</CardDescription>
              </div>
            </div>
            <Badge variant={currentMode.variant} className="text-sm px-3 py-1">
              {currentMode.label}
            </Badge>
          </div>
        </CardHeader>
      </Card>

      {/* Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Configuration du paiement
          </CardTitle>
          <CardDescription>
            Activez ou désactivez le système de paiement pour les services cadastraux
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Mode développement (bypass) */}
          <div className="flex items-center justify-between p-4 rounded-lg border bg-card">
            <div className="space-y-1 flex-1">
              <Label htmlFor="bypass-mode" className="text-base font-medium">
                Mode développement (Bypass)
              </Label>
              <p className="text-sm text-muted-foreground">
                En mode développement, les paiements sont bypassés et l'accès est accordé gratuitement
              </p>
            </div>
            <Switch
              id="bypass-mode"
              checked={config.bypass_payment}
              onCheckedChange={(checked) => 
                setConfig(prev => ({ 
                  ...prev, 
                  bypass_payment: checked,
                  enabled: checked ? false : prev.enabled
                }))
              }
            />
          </div>

          {/* Paiement activé */}
          <div className="flex items-center justify-between p-4 rounded-lg border bg-card">
            <div className="space-y-1 flex-1">
              <Label htmlFor="payment-enabled" className="text-base font-medium">
                Paiement activé
              </Label>
              <p className="text-sm text-muted-foreground">
                Active le système de paiement réel pour les services cadastraux
              </p>
            </div>
            <Switch
              id="payment-enabled"
              checked={config.enabled}
              disabled={config.bypass_payment}
              onCheckedChange={(checked) => 
                setConfig(prev => ({ 
                  ...prev, 
                  enabled: checked
                }))
              }
            />
          </div>

          {/* Mode test */}
          <div className="flex items-center justify-between p-4 rounded-lg border bg-card">
            <div className="space-y-1 flex-1">
              <Label htmlFor="test-mode" className="text-base font-medium">
                Mode test
              </Label>
              <p className="text-sm text-muted-foreground">
                Utilise des paiements de test (simulation sans transaction réelle)
              </p>
            </div>
            <Switch
              id="test-mode"
              checked={config.test_mode}
              disabled={!config.enabled || config.bypass_payment}
              onCheckedChange={(checked) => 
                setConfig(prev => ({ ...prev, test_mode: checked }))
              }
            />
          </div>

          {/* Alertes */}
          {config.bypass_payment && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>Mode développement actif :</strong> Tous les services sont accessibles gratuitement. 
                Aucun paiement n'est requis. Ce mode doit être désactivé en production.
              </AlertDescription>
            </Alert>
          )}

          {config.enabled && config.test_mode && !config.bypass_payment && (
            <Alert>
              <ShieldAlert className="h-4 w-4" />
              <AlertDescription>
                <strong>Mode test actif :</strong> Les paiements sont simulés. 
                Les transactions ne sont pas réelles. Idéal pour les tests avant la mise en production.
              </AlertDescription>
            </Alert>
          )}

          {config.enabled && !config.test_mode && !config.bypass_payment && (
            <Alert>
              <CheckCircle2 className="h-4 w-4" />
              <AlertDescription>
                <strong>Mode production actif :</strong> Les paiements réels sont activés. 
                Les utilisateurs devront payer pour accéder aux services.
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
              Enregistrer les modifications
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Informations complémentaires */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Informations importantes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <div className="flex gap-2">
            <div className="shrink-0 mt-0.5">•</div>
            <p>
              Le <strong>mode développement</strong> doit être utilisé uniquement pendant le développement et les tests internes.
            </p>
          </div>
          <div className="flex gap-2">
            <div className="shrink-0 mt-0.5">•</div>
            <p>
              Le <strong>mode test</strong> permet de tester le flux de paiement sans effectuer de vraies transactions.
            </p>
          </div>
          <div className="flex gap-2">
            <div className="shrink-0 mt-0.5">•</div>
            <p>
              Le <strong>mode production</strong> active les paiements réels. Assurez-vous que votre passerelle de paiement est correctement configurée.
            </p>
          </div>
          <div className="flex gap-2">
            <div className="shrink-0 mt-0.5">•</div>
            <p>
              Les changements sont appliqués immédiatement pour tous les nouveaux accès aux services.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminPaymentMode;

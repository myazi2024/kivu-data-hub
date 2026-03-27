import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Loader2, CreditCard, AlertTriangle, CheckCircle2, Info, TestTube2, History, Coins } from 'lucide-react';
import { usePaymentConfig } from '@/hooks/usePaymentConfig';
import { useTestMode } from '@/hooks/useTestMode';
import { upsertSearchConfig, logAuditAction } from '@/utils/supabaseConfigUtils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface AuditEntry {
  id: string;
  action: string;
  admin_name: string | null;
  created_at: string;
  old_values: any;
  new_values: any;
}

const AdminPaymentMode: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [auditHistory, setAuditHistory] = useState<AuditEntry[]>([]);
  const { paymentMode: loadedConfig, availableMethods, refreshConfiguration } = usePaymentConfig();
  const { isTestModeActive } = useTestMode();
  const [enabled, setEnabled] = useState(false);

  const isDirty = useMemo(() => enabled !== loadedConfig.enabled, [enabled, loadedConfig.enabled]);

  useEffect(() => {
    if (loadedConfig) {
      setEnabled(loadedConfig.enabled);
      setLoading(false);
    }
  }, [loadedConfig]);

  // Charger l'historique des changements
  useEffect(() => {
    const loadAuditHistory = async () => {
      const { data } = await supabase
        .from('audit_logs')
        .select('id, action, admin_name, created_at, old_values, new_values')
        .eq('action', 'PAYMENT_MODE_UPDATED')
        .order('created_at', { ascending: false })
        .limit(5);
      if (data) setAuditHistory(data);
    };
    loadAuditHistory();
  }, [saving]);

  const saveConfiguration = async () => {
    try {
      setSaving(true);

      const oldConfig = { enabled: loadedConfig.enabled };
      const newConfig = { enabled };

      await upsertSearchConfig(
        'payment_mode',
        newConfig as unknown as Record<string, unknown>,
        'Configuration du mode de paiement pour les services cadastraux'
      );

      await logAuditAction(
        'PAYMENT_MODE_UPDATED',
        'cadastral_search_config',
        undefined,
        oldConfig as unknown as Record<string, unknown>,
        newConfig as unknown as Record<string, unknown>
      );

      toast.success('Configuration enregistrée', {
        description: enabled ? 'Paiement activé pour tous les utilisateurs' : 'Accès gratuit pour tous les utilisateurs'
      });

      await refreshConfiguration();
    } catch (error: any) {
      console.error('Erreur lors de l\'enregistrement:', error);
      toast.error('Erreur lors de l\'enregistrement', { description: error.message || 'Veuillez réessayer' });
    } finally {
      setSaving(false);
    }
  };

  const handleSave = () => {
    // Confirmation si on active le paiement et le mode test est inactif (= production réelle)
    if (enabled && !isTestModeActive) {
      setShowConfirmDialog(true);
    } else {
      saveConfiguration();
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
                {loadedConfig.enabled ? (
                  <CheckCircle2 className="h-6 w-6 text-primary" />
                ) : (
                  <AlertTriangle className="h-6 w-6 text-primary" />
                )}
              </div>
              <div>
                <CardTitle className="text-lg">État actuel</CardTitle>
                <CardDescription>Mode de fonctionnement du système de paiement</CardDescription>
              </div>
            </div>
            <Badge variant={loadedConfig.enabled ? 'default' : 'outline'} className="text-sm px-3 py-1">
              {loadedConfig.enabled ? 'Paiement requis' : 'Accès gratuit'}
            </Badge>
          </div>
        </CardHeader>
      </Card>

      {/* Bandeau Mode Test global */}
      {isTestModeActive && (
        <Alert className="border-amber-300 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-700">
          <TestTube2 className="h-4 w-4 text-amber-600 dark:text-amber-400" />
          <AlertDescription className="text-amber-800 dark:text-amber-200">
            <strong>Mode Test global actif</strong> — Les paiements sont simulés automatiquement.
            Les transactions ne sont pas réelles. Gérez le mode test dans l'onglet <strong>Mode Test</strong>.
          </AlertDescription>
        </Alert>
      )}

      {/* Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Configuration du paiement
          </CardTitle>
          <CardDescription>
            Activez ou désactivez le paiement requis pour accéder aux services cadastraux
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Switch unique : Paiement requis */}
          <div className="flex items-center justify-between p-4 rounded-lg border bg-card">
            <div className="space-y-1 flex-1">
              <Label htmlFor="payment-required" className="text-base font-medium">
                Paiement requis
              </Label>
              <p className="text-sm text-muted-foreground">
                {enabled
                  ? 'Les utilisateurs doivent payer pour accéder aux services cadastraux'
                  : 'Les services cadastraux sont accessibles gratuitement'}
              </p>
            </div>
            <Switch
              id="payment-required"
              checked={enabled}
              onCheckedChange={setEnabled}
            />
          </div>

          {/* Alertes contextuelles */}
          {enabled && !isTestModeActive && (
            <Alert>
              <CheckCircle2 className="h-4 w-4" />
              <AlertDescription>
                <strong>Mode production :</strong> Les paiements réels sont activés.
                Les utilisateurs devront payer pour accéder aux services.
              </AlertDescription>
            </Alert>
          )}

          {enabled && isTestModeActive && (
            <Alert>
              <TestTube2 className="h-4 w-4" />
              <AlertDescription>
                <strong>Paiement activé en mode test :</strong> Les paiements sont simulés.
                Aucune transaction réelle n'est effectuée.
              </AlertDescription>
            </Alert>
          )}

          {!enabled && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>Accès gratuit :</strong> Tous les services sont accessibles sans paiement.
              </AlertDescription>
            </Alert>
          )}

          {/* Bouton d'enregistrement avec dirty-check */}
          <div className="flex justify-end pt-4">
            <Button
              onClick={handleSave}
              disabled={saving || !isDirty}
              size="lg"
            >
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Enregistrer les modifications
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* État des méthodes de paiement configurées */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Info className="h-5 w-5 text-primary" />
            <CardTitle className="text-base">Méthodes de paiement configurées</CardTitle>
          </div>
          <CardDescription>
            Vue d'ensemble des moyens de paiement disponibles sur la plateforme
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Mobile Money */}
          <div className="flex items-center justify-between p-3 rounded-lg border bg-card">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${availableMethods.hasMobileMoney ? 'bg-green-100 dark:bg-green-900/20' : 'bg-muted'}`}>
                <CreditCard className={`h-4 w-4 ${availableMethods.hasMobileMoney ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground'}`} />
              </div>
              <div>
                <p className="text-sm font-medium">Mobile Money</p>
                <p className="text-xs text-muted-foreground">
                  {availableMethods.enabledProviders.mobileMoneyProviders.length} fournisseur(s) actif(s)
                </p>
              </div>
            </div>
            <Badge variant={availableMethods.hasMobileMoney ? 'default' : 'secondary'}>
              {availableMethods.hasMobileMoney ? 'Actif' : 'Inactif'}
            </Badge>
          </div>

          {/* Carte Bancaire */}
          <div className="flex items-center justify-between p-3 rounded-lg border bg-card">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${availableMethods.hasBankCard ? 'bg-green-100 dark:bg-green-900/20' : 'bg-muted'}`}>
                <CreditCard className={`h-4 w-4 ${availableMethods.hasBankCard ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground'}`} />
              </div>
              <div>
                <p className="text-sm font-medium">Carte Bancaire</p>
                <p className="text-xs text-muted-foreground">
                  {availableMethods.enabledProviders.bankCardProvider ? `Via ${availableMethods.enabledProviders.bankCardProvider}` : 'Non configuré'}
                </p>
              </div>
            </div>
            <Badge variant={availableMethods.hasBankCard ? 'default' : 'secondary'}>
              {availableMethods.hasBankCard ? 'Actif' : 'Inactif'}
            </Badge>
          </div>

          {/* Devises supportées */}
          <div className="flex items-center justify-between p-3 rounded-lg border bg-card">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Coins className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium">Devises supportées</p>
                <p className="text-xs text-muted-foreground">Dollar américain et Franc congolais</p>
              </div>
            </div>
            <div className="flex gap-1">
              <Badge variant="outline">USD</Badge>
              <Badge variant="outline">CDF</Badge>
            </div>
          </div>

          {!availableMethods.hasAnyMethod && enabled && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>Attention :</strong> Le paiement est activé mais aucun moyen de paiement n'est configuré.
                Les utilisateurs ne pourront pas payer. Configurez au moins une méthode dans l'onglet "Moyens de paiement".
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Historique des changements */}
      {auditHistory.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <History className="h-5 w-5 text-primary" />
              <CardTitle className="text-base">Historique des modifications</CardTitle>
            </div>
            <CardDescription>Derniers changements de configuration du paiement</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {auditHistory.map((entry) => (
                <div key={entry.id} className="flex items-center justify-between p-2.5 rounded-lg border bg-card text-sm">
                  <div className="flex items-center gap-2 min-w-0">
                    <Badge variant="outline" className="text-xs shrink-0">
                      {entry.new_values?.enabled ? 'Activé' : 'Désactivé'}
                    </Badge>
                    <span className="text-muted-foreground text-xs truncate">
                      par {entry.admin_name || 'Admin'}
                    </span>
                  </div>
                  <span className="text-xs text-muted-foreground shrink-0 ml-2">
                    {new Date(entry.created_at).toLocaleDateString('fr-FR', {
                      day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
                    })}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Dialogue de confirmation production */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Activer le paiement en production ?</AlertDialogTitle>
            <AlertDialogDescription>
              Le mode test global est <strong>inactif</strong>. Activer le paiement signifie que les utilisateurs
              effectueront des <strong>transactions réelles</strong>. Assurez-vous que vos passerelles de paiement
              sont correctement configurées.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={saveConfiguration}>
              Confirmer l'activation
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AdminPaymentMode;

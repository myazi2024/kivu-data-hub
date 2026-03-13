import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Loader2, Database, AlertTriangle, CheckCircle2 } from 'lucide-react';
import type { TestModeConfig } from '@/hooks/useTestMode';

interface TestModeConfigCardProps {
  config: TestModeConfig;
  savedConfig: TestModeConfig;
  saving: boolean;
  isDirty: boolean;
  onConfigChange: (update: Partial<TestModeConfig>) => void;
  onSave: () => void;
}

const TestModeConfigCard: React.FC<TestModeConfigCardProps> = ({
  config,
  savedConfig,
  saving,
  isDirty,
  onConfigChange,
  onSave,
}) => {
  const isDisablingTestMode = savedConfig.enabled && !config.enabled;

  return (
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
              onConfigChange({
                enabled: checked,
                // Reset auto_cleanup when disabling test mode
                ...(checked ? {} : { auto_cleanup: false }),
              })
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
              Supprime automatiquement les données de test après expiration (via cron quotidien)
            </p>
          </div>
          <Switch
            id="auto-cleanup"
            checked={config.auto_cleanup}
            disabled={!config.enabled}
            onCheckedChange={(checked) => onConfigChange({ auto_cleanup: checked })}
          />
        </div>

        {/* Durée de rétention */}
        {config.auto_cleanup && config.enabled && (
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
                const value = parseInt(e.target.value);
                if (!isNaN(value)) {
                  onConfigChange({
                    test_data_retention_days: Math.min(30, Math.max(1, value)),
                  });
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

        {/* Save button with dirty-check */}
        <div className="flex justify-end pt-4">
          {isDisablingTestMode ? (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button size="lg" variant="destructive" disabled={saving || !isDirty}>
                  {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Désactiver le mode test
                </Button>
              </AlertDialogTrigger>
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
                  <AlertDialogCancel>Annuler</AlertDialogCancel>
                  <AlertDialogAction onClick={onSave} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                    Confirmer la désactivation
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          ) : (
            <Button onClick={onSave} disabled={saving || !isDirty} size="lg">
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Enregistrer la configuration
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default TestModeConfigCard;

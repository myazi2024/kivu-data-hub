import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Smartphone, AlertCircle, CheckCircle2, Loader2, Wifi, WifiOff } from 'lucide-react';
import { SecretInput } from './SecretInput';
import { LocalMobileMoney, TestResult } from './types';

interface Props {
  provider: LocalMobileMoney;
  revealedFields: Set<string>;
  onToggleReveal: (key: string) => void;
  onUpdate: (providerId: string, field: keyof LocalMobileMoney, value: any) => void;
  onTest: (providerId: string, configType: string) => void;
  testing: boolean;
  testResult?: TestResult;
}

export const MobileMoneyProviderCard: React.FC<Props> = ({
  provider, revealedFields, onToggleReveal, onUpdate, onTest, testing, testResult,
}) => {
  return (
    <Card>
      <CardHeader className="p-4 md:p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Smartphone className="h-5 w-5 text-primary" />
            <div>
              <CardTitle className="text-base md:text-lg">{provider.provider_name}</CardTitle>
              <CardDescription className="text-xs md:text-sm">
                Configuration API {provider.provider_name}
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={provider.is_enabled ? 'default' : 'secondary'} className="text-xs">
              {provider.is_enabled ? (<><CheckCircle2 className="h-3 w-3 mr-1" />Actif</>) : 'Inactif'}
            </Badge>
            <Switch
              checked={provider.is_enabled}
              onCheckedChange={(checked) => onUpdate(provider.provider_id, 'is_enabled', checked)}
            />
          </div>
        </div>
      </CardHeader>

      {provider.is_enabled && (
        <CardContent className="p-4 pt-0 md:p-6 md:pt-0 space-y-3 md:space-y-4">
          <Separator />
          <div className="grid gap-3 md:gap-4">
            <SecretInput
              id={`${provider.provider_id}-merchant`}
              label="Code Marchand"
              value={provider.merchantCode}
              onChange={(v) => onUpdate(provider.provider_id, 'merchantCode', v)}
              placeholder="Entrez le code marchand"
              revealed={revealedFields.has(`${provider.provider_id}-merchant`)}
              onToggleReveal={() => onToggleReveal(`${provider.provider_id}-merchant`)}
            />
            <SecretInput
              id={`${provider.provider_id}-api`}
              label="Clé API"
              value={provider.apiKey}
              onChange={(v) => onUpdate(provider.provider_id, 'apiKey', v)}
              placeholder="Entrez la clé API"
              revealed={revealedFields.has(`${provider.provider_id}-api`)}
              onToggleReveal={() => onToggleReveal(`${provider.provider_id}-api`)}
            />
            <SecretInput
              id={`${provider.provider_id}-secret`}
              label="Clé Secrète"
              value={provider.secretKey}
              onChange={(v) => onUpdate(provider.provider_id, 'secretKey', v)}
              placeholder="Entrez la clé secrète"
              revealed={revealedFields.has(`${provider.provider_id}-secret`)}
              onToggleReveal={() => onToggleReveal(`${provider.provider_id}-secret`)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3 pt-2 border-t">
            <div className="space-y-1.5">
              <Label htmlFor={`${provider.provider_id}-fee-pct`} className="text-xs md:text-sm">Frais (%)</Label>
              <Input
                id={`${provider.provider_id}-fee-pct`}
                type="number" step="0.01" min="0"
                value={provider.fee_percent}
                onChange={(e) => onUpdate(provider.provider_id, 'fee_percent', parseFloat(e.target.value) || 0)}
                className="text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={`${provider.provider_id}-fee-fix`} className="text-xs md:text-sm">Frais fixe (USD)</Label>
              <Input
                id={`${provider.provider_id}-fee-fix`}
                type="number" step="0.01" min="0"
                value={provider.fee_fixed_usd}
                onChange={(e) => onUpdate(provider.provider_id, 'fee_fixed_usd', parseFloat(e.target.value) || 0)}
                className="text-sm"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline" size="sm"
              onClick={() => onTest(provider.provider_id, 'mobile_money')}
              disabled={testing}
            >
              {testing ? (
                <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
              ) : testResult?.success ? (
                <Wifi className="h-3.5 w-3.5 mr-1.5 text-green-600" />
              ) : testResult ? (
                <WifiOff className="h-3.5 w-3.5 mr-1.5 text-destructive" />
              ) : (
                <Wifi className="h-3.5 w-3.5 mr-1.5" />
              )}
              Tester la connexion
            </Button>
            {testResult && (
              <span className={`text-xs ${testResult.success ? 'text-green-600' : 'text-destructive'}`}>
                {testResult.message}
              </span>
            )}
          </div>

          <div className="flex items-start gap-2 p-3 bg-muted rounded-lg">
            <AlertCircle className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
            <p className="text-xs text-muted-foreground">
              Ces informations sont sensibles. Assurez-vous de les obtenir depuis le portail marchand officiel
              de {provider.provider_name}.
            </p>
          </div>
        </CardContent>
      )}
    </Card>
  );
};

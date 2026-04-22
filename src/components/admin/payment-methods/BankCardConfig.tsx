import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CreditCard, AlertCircle, CheckCircle2, Loader2, Wifi, WifiOff } from 'lucide-react';
import { SecretInput } from './SecretInput';
import { LocalBankCard, TestResult } from './types';

interface Props {
  bankCard: LocalBankCard;
  revealedFields: Set<string>;
  onToggleReveal: (key: string) => void;
  onUpdate: (field: keyof LocalBankCard, value: any) => void;
  onTest: (providerId: string, configType: string) => void;
  testing: boolean;
  testResult?: TestResult;
  isTestModeActive: boolean;
}

export const BankCardConfig: React.FC<Props> = ({
  bankCard, revealedFields, onToggleReveal, onUpdate, onTest, testing, testResult, isTestModeActive,
}) => {
  return (
    <Card>
      <CardHeader className="p-4 md:p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CreditCard className="h-5 w-5 text-primary" />
            <div>
              <CardTitle className="text-base md:text-lg">Paiement par Carte Bancaire</CardTitle>
              <CardDescription className="text-xs md:text-sm">
                Configuration du processeur de paiement
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={bankCard.is_enabled ? 'default' : 'secondary'} className="text-xs">
              {bankCard.is_enabled ? (<><CheckCircle2 className="h-3 w-3 mr-1" />Actif</>) : 'Inactif'}
            </Badge>
            <Switch
              checked={bankCard.is_enabled}
              onCheckedChange={(checked) => onUpdate('is_enabled', checked)}
            />
          </div>
        </div>
      </CardHeader>

      {bankCard.is_enabled && (
        <CardContent className="p-4 pt-0 md:p-6 md:pt-0 space-y-3 md:space-y-4">
          <Separator />
          <div className="grid gap-3 md:gap-4">
            <div className="space-y-2">
              <Label className="text-xs md:text-sm">Fournisseur de Paiement</Label>
              <Select
                value={bankCard.provider}
                onValueChange={(value) => onUpdate('provider', value as LocalBankCard['provider'])}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choisir un fournisseur" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="stripe">Stripe</SelectItem>
                  <SelectItem value="flutterwave">Flutterwave</SelectItem>
                  <SelectItem value="paypal">PayPal</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <SecretInput
              id="bc-public-key"
              label="Clé Publique"
              value={bankCard.publicKey}
              onChange={(v) => onUpdate('publicKey', v)}
              placeholder={`Entrez votre clé publique ${bankCard.provider}`}
              revealed={revealedFields.has('bc-public-key')}
              onToggleReveal={() => onToggleReveal('bc-public-key')}
            />
            <SecretInput
              id="bc-secret-key"
              label="Clé Secrète"
              value={bankCard.secretKey}
              onChange={(v) => onUpdate('secretKey', v)}
              placeholder={`Entrez votre clé secrète ${bankCard.provider}`}
              revealed={revealedFields.has('bc-secret-key')}
              onToggleReveal={() => onToggleReveal('bc-secret-key')}
            />
            {bankCard.provider === 'stripe' && (
              <SecretInput
                id="bc-webhook-secret"
                label="Webhook Secret"
                value={bankCard.webhookSecret}
                onChange={(v) => onUpdate('webhookSecret', v)}
                placeholder="Entrez le secret webhook Stripe"
                revealed={revealedFields.has('bc-webhook-secret')}
                onToggleReveal={() => onToggleReveal('bc-webhook-secret')}
              />
            )}
          </div>

          <div className="grid grid-cols-2 gap-3 pt-2 border-t">
            <div className="space-y-1.5">
              <Label htmlFor="bc-fee-pct" className="text-xs md:text-sm">Frais (%)</Label>
              <Input
                id="bc-fee-pct" type="number" step="0.01" min="0"
                value={bankCard.fee_percent}
                onChange={(e) => onUpdate('fee_percent', parseFloat(e.target.value) || 0)}
                className="text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="bc-fee-fix" className="text-xs md:text-sm">Frais fixe (USD)</Label>
              <Input
                id="bc-fee-fix" type="number" step="0.01" min="0"
                value={bankCard.fee_fixed_usd}
                onChange={(e) => onUpdate('fee_fixed_usd', parseFloat(e.target.value) || 0)}
                className="text-sm"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline" size="sm"
              onClick={() => onTest(bankCard.provider, 'bank_card')}
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
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">
                {isTestModeActive
                  ? 'Le mode test est actif — utilisez les clés de test du fournisseur.'
                  : 'Utilisez les clés de test en mode développement. Ne passez en mode production qu\'après avoir testé l\'intégration.'}
              </p>
              <p className="text-xs text-muted-foreground font-medium">
                Documentation :{' '}
                <a
                  href={`https://${bankCard.provider}.com/docs`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  {bankCard.provider}.com/docs
                </a>
              </p>
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  );
};

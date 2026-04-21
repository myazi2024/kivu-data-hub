import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
import {
  CreditCard,
  Smartphone,
  Save,
  AlertCircle,
  CheckCircle2,
  Settings2,
  Loader2,
  Eye,
  EyeOff,
  Wifi,
  WifiOff,
  TestTube,
  DollarSign,
  History,
} from 'lucide-react';
import { toast } from 'sonner';
import { usePaymentMethods, PaymentProvider, maskApiKey } from '@/hooks/usePaymentMethods';
import { useTestMode } from '@/hooks/useTestMode';
import { usePaymentConfig } from '@/hooks/usePaymentConfig';
import { logAuditAction } from '@/utils/supabaseConfigUtils';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

// ─── Types ───────────────────────────────────────────────────────────────────

interface LocalMobileMoney {
  provider_id: string;
  provider_name: string;
  is_enabled: boolean;
  merchantCode: string;
  apiKey: string;
  secretKey: string;
  fee_percent: number;
  fee_fixed_usd: number;
}

interface LocalBankCard {
  is_enabled: boolean;
  provider: 'stripe' | 'flutterwave' | 'paypal';
  publicKey: string;
  secretKey: string;
  webhookSecret: string;
  fee_percent: number;
  fee_fixed_usd: number;
}

interface AuditEntry {
  id: string;
  action: string;
  created_at: string;
  admin_name: string | null;
  old_values: any;
  new_values: any;
}

// ─── Validation helpers ──────────────────────────────────────────────────────

const STRIPE_KEY_PATTERNS: Record<string, RegExp> = {
  publicKey: /^pk_(test|live)_/,
  secretKey: /^sk_(test|live)_/,
  webhookSecret: /^whsec_/,
};

const validateCredentials = (
  provider: string,
  credentials: Record<string, string | undefined>,
  isEnabled: boolean
): string[] => {
  if (!isEnabled) return [];
  const errors: string[] = [];

  if (provider === 'stripe') {
    for (const [field, pattern] of Object.entries(STRIPE_KEY_PATTERNS)) {
      const val = credentials[field];
      if (val && !val.includes('••••') && !pattern.test(val)) {
        errors.push(`${field}: format Stripe invalide (attendu: ${pattern.source})`);
      }
    }
  }

  // Generic: at least one credential must be filled when enabled
  const hasAnyKey = Object.values(credentials).some((v) => v && v.length > 0 && !v.includes('••••'));
  const hasOriginalKeys = Object.values(credentials).some((v) => v?.includes('••••'));
  if (!hasAnyKey && !hasOriginalKeys) {
    errors.push('Au moins une clé API doit être renseignée');
  }

  return errors;
};

// ─── Mask credentials for display ────────────────────────────────────────────

const maskMobileMoneyFromProvider = (p: PaymentProvider): LocalMobileMoney => ({
  provider_id: p.provider_id,
  provider_name: p.provider_name,
  is_enabled: p.is_enabled,
  merchantCode: maskApiKey(p.api_credentials.merchantCode),
  apiKey: maskApiKey(p.api_credentials.apiKey),
  secretKey: maskApiKey(p.api_credentials.secretKey),
  fee_percent: Number(p.fee_percent ?? 0),
  fee_fixed_usd: Number(p.fee_fixed_usd ?? 0),
});

const maskBankCardFromProvider = (p: PaymentProvider): LocalBankCard => ({
  is_enabled: p.is_enabled,
  provider: (p.api_credentials.provider || p.provider_id || 'stripe') as LocalBankCard['provider'],
  publicKey: maskApiKey(p.api_credentials.publicKey),
  secretKey: maskApiKey(p.api_credentials.secretKey),
  webhookSecret: maskApiKey(p.api_credentials.webhookSecret),
  fee_percent: Number(p.fee_percent ?? 0),
  fee_fixed_usd: Number(p.fee_fixed_usd ?? 0),
});

const DEFAULT_MOBILE_MONEY: LocalMobileMoney[] = [
  { provider_id: 'airtel_money', provider_name: 'Airtel Money', is_enabled: true, apiKey: '', merchantCode: '', secretKey: '', fee_percent: 1.5, fee_fixed_usd: 0 },
  { provider_id: 'orange_money', provider_name: 'Orange Money', is_enabled: true, apiKey: '', merchantCode: '', secretKey: '', fee_percent: 1.5, fee_fixed_usd: 0 },
  { provider_id: 'mpesa', provider_name: 'M-Pesa', is_enabled: true, apiKey: '', merchantCode: '', secretKey: '', fee_percent: 1.5, fee_fixed_usd: 0 },
];

const DEFAULT_BANK_CARD: LocalBankCard = {
  is_enabled: false,
  provider: 'stripe',
  publicKey: '',
  secretKey: '',
  webhookSecret: '',
  fee_percent: 2.9,
  fee_fixed_usd: 0.30,
};

// ─── Component ───────────────────────────────────────────────────────────────

const AdminPaymentMethods: React.FC = () => {
  const { user } = useAuth();
  const {
    mobileMoneyProviders: serverMM,
    bankCardProviders: serverBC,
    loading,
    saveAll,
    testProviderConnection,
    refreshPaymentMethods,
  } = usePaymentMethods();
  const { isTestModeActive } = useTestMode();
  const { paymentMode } = usePaymentConfig();

  // Local editable state
  const [mobileMoney, setMobileMoney] = useState<LocalMobileMoney[]>(DEFAULT_MOBILE_MONEY);
  const [bankCard, setBankCard] = useState<LocalBankCard>(DEFAULT_BANK_CARD);
  const [saving, setSaving] = useState(false);
  const [revealedFields, setRevealedFields] = useState<Set<string>>(new Set());
  const [testingProvider, setTestingProvider] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<Record<string, { success: boolean; message: string }>>({});
  const [auditHistory, setAuditHistory] = useState<AuditEntry[]>([]);

  // Snapshot for dirty-check
  const [snapshot, setSnapshot] = useState('');

  // Sync server → local state
  useEffect(() => {
    if (loading) return;
    const mm =
      serverMM.length > 0 ? serverMM.map(maskMobileMoneyFromProvider) : DEFAULT_MOBILE_MONEY;
    const bc = serverBC.length > 0 ? maskBankCardFromProvider(serverBC[0]) : DEFAULT_BANK_CARD;
    setMobileMoney(mm);
    setBankCard(bc);
    setRevealedFields(new Set());
    const snap = JSON.stringify({ mm, bc });
    setSnapshot(snap);
  }, [serverMM, serverBC, loading]);

  // Load audit history
  useEffect(() => {
    const loadAudit = async () => {
      const { data } = await supabase
        .from('audit_logs')
        .select('id, action, created_at, admin_name, old_values, new_values')
        .in('action', ['PAYMENT_METHODS_UPDATED'])
        .order('created_at', { ascending: false })
        .limit(5);
      if (data) setAuditHistory(data);
    };
    loadAudit();
  }, [saving]);

  // Dirty check
  const isDirty = useMemo(() => {
    const current = JSON.stringify({ mm: mobileMoney, bc: bankCard });
    return current !== snapshot;
  }, [mobileMoney, bankCard, snapshot]);

  // ─── Handlers ────────────────────────────────────────────────────────────

  const updateMM = useCallback((providerId: string, field: keyof LocalMobileMoney, value: any) => {
    setMobileMoney((prev) =>
      prev.map((p) => (p.provider_id === providerId ? { ...p, [field]: value } : p))
    );
  }, []);

  const updateBC = useCallback((field: keyof LocalBankCard, value: any) => {
    setBankCard((prev) => ({ ...prev, [field]: value }));
  }, []);

  const toggleReveal = (fieldKey: string) => {
    setRevealedFields((prev) => {
      const next = new Set(prev);
      if (next.has(fieldKey)) next.delete(fieldKey);
      else next.add(fieldKey);
      return next;
    });
  };

  // ─── Validation ──────────────────────────────────────────────────────────

  const validationErrors = useMemo(() => {
    const errors: string[] = [];

    // Validate bank card
    if (bankCard.is_enabled) {
      errors.push(
        ...validateCredentials(bankCard.provider, {
          publicKey: bankCard.publicKey,
          secretKey: bankCard.secretKey,
          webhookSecret: bankCard.webhookSecret,
        }, true)
      );
    }

    return errors;
  }, [bankCard]);

  // ─── Save ────────────────────────────────────────────────────────────────

  const handleSave = async () => {
    if (!isDirty) return;

    if (validationErrors.length > 0) {
      toast.error('Erreurs de validation', { description: validationErrors.join('. ') });
      return;
    }

    try {
      setSaving(true);

      // Build PaymentProvider arrays from local state
      const mmProviders: PaymentProvider[] = mobileMoney.map((p, i) => ({
        id: '',
        config_type: 'mobile_money' as const,
        provider_id: p.provider_id,
        provider_name: p.provider_name,
        is_enabled: p.is_enabled,
        api_credentials: {
          apiKey: p.apiKey,
          merchantCode: p.merchantCode,
          secretKey: p.secretKey,
        },
        display_order: i,
        fee_percent: Number(p.fee_percent) || 0,
        fee_fixed_usd: Number(p.fee_fixed_usd) || 0,
      }));

      const bcProviders: PaymentProvider[] = [
        {
          id: '',
          config_type: 'bank_card' as const,
          provider_id: bankCard.provider,
          provider_name: bankCard.provider.charAt(0).toUpperCase() + bankCard.provider.slice(1),
          is_enabled: bankCard.is_enabled,
          api_credentials: {
            provider: bankCard.provider,
            publicKey: bankCard.publicKey,
            secretKey: bankCard.secretKey,
            webhookSecret: bankCard.webhookSecret,
          },
          display_order: 0,
          fee_percent: Number(bankCard.fee_percent) || 0,
          fee_fixed_usd: Number(bankCard.fee_fixed_usd) || 0,
        },
      ];

      await saveAll(mmProviders, bcProviders, serverMM, serverBC);

      // Audit log (mask sensitive keys)
      const maskedNew = {
        mobileMoney: mobileMoney.map((p) => ({
          id: p.provider_id,
          enabled: p.is_enabled,
        })),
        bankCard: { provider: bankCard.provider, enabled: bankCard.is_enabled },
      };

      await logAuditAction('PAYMENT_METHODS_UPDATED', 'payment_methods_config', undefined, undefined, maskedNew as any);

      toast.success('Configuration sauvegardée', {
        description: 'Les moyens de paiement ont été mis à jour',
      });
    } catch (error: any) {
      console.error('Error saving:', error);
      toast.error('Erreur de sauvegarde', { description: error.message || 'Veuillez réessayer' });
    } finally {
      setSaving(false);
    }
  };

  // ─── Test connection ─────────────────────────────────────────────────────

  const handleTestConnection = async (providerId: string, configType: string) => {
    setTestingProvider(providerId);
    const result = await testProviderConnection(providerId, configType);
    setTestResults((prev) => ({ ...prev, [providerId]: result }));
    setTestingProvider(null);

    if (result.success) {
      toast.success('Connexion réussie', { description: result.message });
    } else {
      toast.error('Échec de connexion', { description: result.message });
    }
  };

  // ─── Render helpers ──────────────────────────────────────────────────────

  const renderSecretInput = (
    id: string,
    label: string,
    value: string,
    onChange: (val: string) => void,
    placeholder: string
  ) => {
    const fieldKey = id;
    const isRevealed = revealedFields.has(fieldKey);
    const isMaskedValue = value?.includes('••••');

    return (
      <div className="space-y-2">
        <Label htmlFor={id} className="text-xs md:text-sm">
          {label}
        </Label>
        <div className="relative">
          <Input
            id={id}
            type={isRevealed ? 'text' : 'password'}
            placeholder={placeholder}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onFocus={() => {
              if (isMaskedValue) onChange('');
            }}
            className="text-sm pr-10"
          />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
            onClick={() => toggleReveal(fieldKey)}
          >
            {isRevealed ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
          </Button>
        </div>
      </div>
    );
  };

  // ─── Loading state ───────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight">Moyens de Paiement</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Configuration des méthodes de paiement acceptées
          </p>
        </div>
        <Button onClick={handleSave} disabled={saving || !isDirty} className="w-full md:w-auto">
          {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
          {saving ? 'Sauvegarde...' : isDirty ? 'Sauvegarder les modifications' : 'Aucune modification'}
        </Button>
      </div>

      {/* Test mode banner */}
      {isTestModeActive && (
        <Card className="border-amber-500/50 bg-amber-50 dark:bg-amber-950/20">
          <CardContent className="flex items-center gap-3 p-4">
            <TestTube className="h-5 w-5 text-amber-600 shrink-0" />
            <div className="text-sm">
              <span className="font-medium text-amber-700 dark:text-amber-400">Mode Test actif</span>
              <span className="text-amber-600 dark:text-amber-500">
                {' — '}Les paiements sont simulés. Les clés de test sont recommandées.
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Validation errors */}
      {validationErrors.length > 0 && (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardContent className="flex items-start gap-3 p-4">
            <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
            <div className="text-sm space-y-1">
              {validationErrors.map((err, i) => (
                <p key={i} className="text-destructive">{err}</p>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabs */}
      <Tabs defaultValue="mobile-money" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="mobile-money" className="text-xs md:text-sm">
            <Smartphone className="h-3 w-3 md:h-4 md:w-4 mr-1 md:mr-2" />
            Mobile Money
          </TabsTrigger>
          <TabsTrigger value="bank-card" className="text-xs md:text-sm">
            <CreditCard className="h-3 w-3 md:h-4 md:w-4 mr-1 md:mr-2" />
            Carte Bancaire
          </TabsTrigger>
        </TabsList>

        {/* Mobile Money Tab */}
        <TabsContent value="mobile-money" className="space-y-3 md:space-y-4">
          {mobileMoney.map((provider) => (
            <Card key={provider.provider_id}>
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
                      {provider.is_enabled ? (
                        <>
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Actif
                        </>
                      ) : (
                        'Inactif'
                      )}
                    </Badge>
                    <Switch
                      checked={provider.is_enabled}
                      onCheckedChange={(checked) => updateMM(provider.provider_id, 'is_enabled', checked)}
                    />
                  </div>
                </div>
              </CardHeader>

              {provider.is_enabled && (
                <CardContent className="p-4 pt-0 md:p-6 md:pt-0 space-y-3 md:space-y-4">
                  <Separator />
                  <div className="grid gap-3 md:gap-4">
                    {renderSecretInput(
                      `${provider.provider_id}-merchant`,
                      'Code Marchand',
                      provider.merchantCode,
                      (val) => updateMM(provider.provider_id, 'merchantCode', val),
                      'Entrez le code marchand'
                    )}
                    {renderSecretInput(
                      `${provider.provider_id}-api`,
                      'Clé API',
                      provider.apiKey,
                      (val) => updateMM(provider.provider_id, 'apiKey', val),
                      'Entrez la clé API'
                    )}
                    {renderSecretInput(
                      `${provider.provider_id}-secret`,
                      'Clé Secrète',
                      provider.secretKey,
                      (val) => updateMM(provider.provider_id, 'secretKey', val),
                      'Entrez la clé secrète'
                    )}
                  </div>

                  {/* Test connection button */}
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleTestConnection(provider.provider_id, 'mobile_money')}
                      disabled={testingProvider === provider.provider_id}
                    >
                      {testingProvider === provider.provider_id ? (
                        <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                      ) : testResults[provider.provider_id]?.success ? (
                        <Wifi className="h-3.5 w-3.5 mr-1.5 text-green-600" />
                      ) : testResults[provider.provider_id] ? (
                        <WifiOff className="h-3.5 w-3.5 mr-1.5 text-destructive" />
                      ) : (
                        <Wifi className="h-3.5 w-3.5 mr-1.5" />
                      )}
                      Tester la connexion
                    </Button>
                    {testResults[provider.provider_id] && (
                      <span
                        className={`text-xs ${
                          testResults[provider.provider_id].success ? 'text-green-600' : 'text-destructive'
                        }`}
                      >
                        {testResults[provider.provider_id].message}
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
          ))}
        </TabsContent>

        {/* Bank Card Tab */}
        <TabsContent value="bank-card" className="space-y-3 md:space-y-4">
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
                    {bankCard.is_enabled ? (
                      <>
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        Actif
                      </>
                    ) : (
                      'Inactif'
                    )}
                  </Badge>
                  <Switch
                    checked={bankCard.is_enabled}
                    onCheckedChange={(checked) => updateBC('is_enabled', checked)}
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
                      onValueChange={(value) => updateBC('provider', value as LocalBankCard['provider'])}
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

                  {renderSecretInput(
                    'bc-public-key',
                    'Clé Publique',
                    bankCard.publicKey,
                    (val) => updateBC('publicKey', val),
                    `Entrez votre clé publique ${bankCard.provider}`
                  )}

                  {renderSecretInput(
                    'bc-secret-key',
                    'Clé Secrète',
                    bankCard.secretKey,
                    (val) => updateBC('secretKey', val),
                    `Entrez votre clé secrète ${bankCard.provider}`
                  )}

                  {bankCard.provider === 'stripe' &&
                    renderSecretInput(
                      'bc-webhook-secret',
                      'Webhook Secret',
                      bankCard.webhookSecret,
                      (val) => updateBC('webhookSecret', val),
                      'Entrez le secret webhook Stripe'
                    )}
                </div>

                {/* Test connection */}
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleTestConnection(bankCard.provider, 'bank_card')}
                    disabled={testingProvider === bankCard.provider}
                  >
                    {testingProvider === bankCard.provider ? (
                      <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                    ) : testResults[bankCard.provider]?.success ? (
                      <Wifi className="h-3.5 w-3.5 mr-1.5 text-green-600" />
                    ) : testResults[bankCard.provider] ? (
                      <WifiOff className="h-3.5 w-3.5 mr-1.5 text-destructive" />
                    ) : (
                      <Wifi className="h-3.5 w-3.5 mr-1.5" />
                    )}
                    Tester la connexion
                  </Button>
                  {testResults[bankCard.provider] && (
                    <span
                      className={`text-xs ${
                        testResults[bankCard.provider].success ? 'text-green-600' : 'text-destructive'
                      }`}
                    >
                      {testResults[bankCard.provider].message}
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
        </TabsContent>
      </Tabs>

      {/* Summary Card */}
      <Card>
        <CardHeader className="p-4 md:p-6">
          <div className="flex items-center gap-2">
            <Settings2 className="h-5 w-5 text-primary" />
            <CardTitle className="text-base md:text-lg">Résumé de la Configuration</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-4 pt-0 md:p-6 md:pt-0">
          <div className="grid gap-3 text-sm">
            <div className="flex items-center justify-between py-2 border-b">
              <span className="text-muted-foreground">Mobile Money actif</span>
              <span className="font-medium">
                {mobileMoney.filter((p) => p.is_enabled).length} / {mobileMoney.length}
              </span>
            </div>
            <div className="flex items-center justify-between py-2 border-b">
              <span className="text-muted-foreground">Carte bancaire</span>
              <Badge variant={bankCard.is_enabled ? 'default' : 'secondary'}>
                {bankCard.is_enabled ? 'Activé' : 'Désactivé'}
              </Badge>
            </div>
            {bankCard.is_enabled && (
              <div className="flex items-center justify-between py-2 border-b">
                <span className="text-muted-foreground">Fournisseur</span>
                <span className="font-medium capitalize">{bankCard.provider}</span>
              </div>
            )}
            <div className="flex items-center justify-between py-2 border-b">
              <span className="text-muted-foreground">Devises supportées</span>
              <div className="flex gap-1.5">
                <Badge variant="outline" className="text-xs">
                  <DollarSign className="h-3 w-3 mr-0.5" />
                  USD
                </Badge>
                <Badge variant="outline" className="text-xs">CDF</Badge>
              </div>
            </div>
            <div className="flex items-center justify-between py-2 border-b">
              <span className="text-muted-foreground">Paiement requis</span>
              <Badge variant={paymentMode.enabled ? 'default' : 'secondary'}>
                {paymentMode.enabled ? 'Oui' : 'Non (accès gratuit)'}
              </Badge>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="text-muted-foreground">Mode test global</span>
              <Badge variant={isTestModeActive ? 'default' : 'secondary'}>
                {isTestModeActive ? 'Actif' : 'Inactif'}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Audit History */}
      {auditHistory.length > 0 && (
        <Card>
          <CardHeader className="p-4 md:p-6">
            <div className="flex items-center gap-2">
              <History className="h-5 w-5 text-primary" />
              <CardTitle className="text-base md:text-lg">Historique des modifications</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-0 md:p-6 md:pt-0">
            <div className="space-y-2">
              {auditHistory.map((entry) => (
                <div key={entry.id} className="flex items-center justify-between py-2 border-b last:border-0 text-sm">
                  <div>
                    <span className="font-medium">{entry.admin_name || 'Admin'}</span>
                    <span className="text-muted-foreground"> — Configuration mise à jour</span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {new Date(entry.created_at).toLocaleDateString('fr-FR', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AdminPaymentMethods;

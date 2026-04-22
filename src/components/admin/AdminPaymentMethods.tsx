import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  CreditCard,
  Smartphone,
  Save,
  AlertCircle,
  Loader2,
  TestTube,
} from 'lucide-react';
import { toast } from 'sonner';
import { usePaymentMethods, PaymentProvider, maskApiKey } from '@/hooks/usePaymentMethods';
import { useTestMode } from '@/hooks/useTestMode';
import { usePaymentConfig } from '@/hooks/usePaymentConfig';
import { logAuditAction } from '@/utils/supabaseConfigUtils';
import { supabase } from '@/integrations/supabase/client';
import {
  LocalMobileMoney,
  LocalBankCard,
  AuditEntry,
  TestResult,
  validateCredentials,
  DEFAULT_MOBILE_MONEY,
  DEFAULT_BANK_CARD,
} from './payment-methods/types';
import { MobileMoneyProviderCard } from './payment-methods/MobileMoneyProviderCard';
import { BankCardConfig } from './payment-methods/BankCardConfig';
import { PaymentSummaryCard } from './payment-methods/PaymentSummaryCard';

// ─── Mask helpers (kept here, single use) ────────────────────────────────────

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

const AdminPaymentMethods: React.FC = () => {
  const {
    mobileMoneyProviders: serverMM,
    bankCardProviders: serverBC,
    loading,
    saveAll,
    testProviderConnection,
  } = usePaymentMethods();
  const { isTestModeActive } = useTestMode();
  const { paymentMode } = usePaymentConfig();

  const [mobileMoney, setMobileMoney] = useState<LocalMobileMoney[]>(DEFAULT_MOBILE_MONEY);
  const [bankCard, setBankCard] = useState<LocalBankCard>(DEFAULT_BANK_CARD);
  const [saving, setSaving] = useState(false);
  const [revealedFields, setRevealedFields] = useState<Set<string>>(new Set());
  const [testingProvider, setTestingProvider] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<Record<string, TestResult>>({});
  const [auditHistory, setAuditHistory] = useState<AuditEntry[]>([]);
  const [snapshot, setSnapshot] = useState('');

  useEffect(() => {
    if (loading) return;
    const mm = serverMM.length > 0 ? serverMM.map(maskMobileMoneyFromProvider) : DEFAULT_MOBILE_MONEY;
    const bc = serverBC.length > 0 ? maskBankCardFromProvider(serverBC[0]) : DEFAULT_BANK_CARD;
    setMobileMoney(mm);
    setBankCard(bc);
    setRevealedFields(new Set());
    setSnapshot(JSON.stringify({ mm, bc }));
  }, [serverMM, serverBC, loading]);

  useEffect(() => {
    const loadAudit = async () => {
      const { data } = await supabase
        .from('audit_logs')
        .select('id, action, created_at, admin_name, old_values, new_values')
        .in('action', ['PAYMENT_METHODS_UPDATED'])
        .order('created_at', { ascending: false })
        .limit(5);
      if (data) setAuditHistory(data as AuditEntry[]);
    };
    loadAudit();
  }, [saving]);

  const isDirty = useMemo(() => {
    return JSON.stringify({ mm: mobileMoney, bc: bankCard }) !== snapshot;
  }, [mobileMoney, bankCard, snapshot]);

  const updateMM = useCallback((providerId: string, field: keyof LocalMobileMoney, value: any) => {
    setMobileMoney((prev) =>
      prev.map((p) => (p.provider_id === providerId ? { ...p, [field]: value } : p))
    );
  }, []);

  const updateBC = useCallback((field: keyof LocalBankCard, value: any) => {
    setBankCard((prev) => ({ ...prev, [field]: value }));
  }, []);

  const toggleReveal = useCallback((fieldKey: string) => {
    setRevealedFields((prev) => {
      const next = new Set(prev);
      if (next.has(fieldKey)) next.delete(fieldKey);
      else next.add(fieldKey);
      return next;
    });
  }, []);

  const validationErrors = useMemo(() => {
    const errors: string[] = [];
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

  const handleSave = async () => {
    if (!isDirty) return;
    if (validationErrors.length > 0) {
      toast.error('Erreurs de validation', { description: validationErrors.join('. ') });
      return;
    }

    try {
      setSaving(true);

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

      const bcProviders: PaymentProvider[] = [{
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
      }];

      await saveAll(mmProviders, bcProviders, serverMM, serverBC);

      const maskedNew = {
        mobileMoney: mobileMoney.map((p) => ({ id: p.provider_id, enabled: p.is_enabled })),
        bankCard: { provider: bankCard.provider, enabled: bankCard.is_enabled },
      };
      await logAuditAction('PAYMENT_METHODS_UPDATED', 'payment_methods_config', undefined, undefined, maskedNew);

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

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4 md:space-y-6">
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

        <TabsContent value="mobile-money" className="space-y-3 md:space-y-4">
          {mobileMoney.map((provider) => (
            <MobileMoneyProviderCard
              key={provider.provider_id}
              provider={provider}
              revealedFields={revealedFields}
              onToggleReveal={toggleReveal}
              onUpdate={updateMM}
              onTest={handleTestConnection}
              testing={testingProvider === provider.provider_id}
              testResult={testResults[provider.provider_id]}
            />
          ))}
        </TabsContent>

        <TabsContent value="bank-card" className="space-y-3 md:space-y-4">
          <BankCardConfig
            bankCard={bankCard}
            revealedFields={revealedFields}
            onToggleReveal={toggleReveal}
            onUpdate={updateBC}
            onTest={handleTestConnection}
            testing={testingProvider === bankCard.provider}
            testResult={testResults[bankCard.provider]}
            isTestModeActive={isTestModeActive}
          />
        </TabsContent>
      </Tabs>

      <PaymentSummaryCard
        mobileMoney={mobileMoney}
        bankCard={bankCard}
        paymentEnabled={paymentMode.enabled}
        isTestModeActive={isTestModeActive}
        auditHistory={auditHistory}
      />
    </div>
  );
};

export default AdminPaymentMethods;

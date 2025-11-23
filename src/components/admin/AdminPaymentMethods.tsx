import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { 
  CreditCard, 
  Smartphone, 
  Save, 
  AlertCircle,
  CheckCircle2,
  Settings2
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface MobileMoneyProvider {
  id: string;
  name: string;
  enabled: boolean;
  apiKey?: string;
  merchantCode?: string;
  secretKey?: string;
}

interface BankCardConfig {
  enabled: boolean;
  provider: 'stripe' | 'flutterwave' | 'paypal';
  publicKey?: string;
  secretKey?: string;
  webhookSecret?: string;
}

const AdminPaymentMethods = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Mobile Money Providers
  const [mobileMoneyProviders, setMobileMoneyProviders] = useState<MobileMoneyProvider[]>([
    { id: 'airtel', name: 'Airtel Money', enabled: true, apiKey: '', merchantCode: '', secretKey: '' },
    { id: 'orange', name: 'Orange Money', enabled: true, apiKey: '', merchantCode: '', secretKey: '' },
    { id: 'mpesa', name: 'M-Pesa', enabled: true, apiKey: '', merchantCode: '', secretKey: '' },
  ]);

  // Bank Card Config
  const [bankCardConfig, setBankCardConfig] = useState<BankCardConfig>({
    enabled: false,
    provider: 'stripe',
    publicKey: '',
    secretKey: '',
    webhookSecret: '',
  });

  useEffect(() => {
    loadConfiguration();
  }, []);

  const loadConfiguration = async () => {
    setLoading(true);
    try {
      // Load from localStorage for now (can be moved to database later)
      const savedMobileMoney = localStorage.getItem('admin_mobile_money_config');
      const savedBankCard = localStorage.getItem('admin_bank_card_config');

      if (savedMobileMoney) {
        setMobileMoneyProviders(JSON.parse(savedMobileMoney));
      }

      if (savedBankCard) {
        setBankCardConfig(JSON.parse(savedBankCard));
      }

      toast({
        title: "Configuration chargée",
        description: "Les paramètres de paiement ont été chargés avec succès",
      });
    } catch (error) {
      console.error('Error loading configuration:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger la configuration",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const saveConfiguration = async () => {
    setSaving(true);
    try {
      // Save to localStorage for now
      localStorage.setItem('admin_mobile_money_config', JSON.stringify(mobileMoneyProviders));
      localStorage.setItem('admin_bank_card_config', JSON.stringify(bankCardConfig));

      toast({
        title: "Configuration sauvegardée",
        description: "Les moyens de paiement ont été configurés avec succès",
      });
    } catch (error) {
      console.error('Error saving configuration:', error);
      toast({
        title: "Erreur",
        description: "Impossible de sauvegarder la configuration",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const updateMobileMoneyProvider = (id: string, field: keyof MobileMoneyProvider, value: any) => {
    setMobileMoneyProviders(prev =>
      prev.map(provider =>
        provider.id === id ? { ...provider, [field]: value } : provider
      )
    );
  };

  const updateBankCardConfig = (field: keyof BankCardConfig, value: any) => {
    setBankCardConfig(prev => ({ ...prev, [field]: value }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-bold">Moyens de Paiement</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Configuration des méthodes de paiement acceptées
          </p>
        </div>
        <Button onClick={saveConfiguration} disabled={saving} className="w-full md:w-auto">
          <Save className="h-4 w-4 mr-2" />
          {saving ? 'Sauvegarde...' : 'Sauvegarder'}
        </Button>
      </div>

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
          {mobileMoneyProviders.map((provider) => (
            <Card key={provider.id}>
              <CardHeader className="p-4 md:p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Smartphone className="h-5 w-5 text-primary" />
                    <div>
                      <CardTitle className="text-base md:text-lg">{provider.name}</CardTitle>
                      <CardDescription className="text-xs md:text-sm">
                        Configuration API {provider.name}
                      </CardDescription>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={provider.enabled ? 'default' : 'secondary'} className="text-xs">
                      {provider.enabled ? (
                        <>
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Actif
                        </>
                      ) : (
                        'Inactif'
                      )}
                    </Badge>
                    <Switch
                      checked={provider.enabled}
                      onCheckedChange={(checked) =>
                        updateMobileMoneyProvider(provider.id, 'enabled', checked)
                      }
                    />
                  </div>
                </div>
              </CardHeader>

              {provider.enabled && (
                <CardContent className="p-4 pt-0 md:p-6 md:pt-0 space-y-3 md:space-y-4">
                  <Separator />
                  
                  <div className="grid gap-3 md:gap-4">
                    <div className="space-y-2">
                      <Label htmlFor={`${provider.id}-merchant`} className="text-xs md:text-sm">
                        Code Marchand
                      </Label>
                      <Input
                        id={`${provider.id}-merchant`}
                        placeholder="Entrez le code marchand"
                        value={provider.merchantCode || ''}
                        onChange={(e) =>
                          updateMobileMoneyProvider(provider.id, 'merchantCode', e.target.value)
                        }
                        className="text-sm"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor={`${provider.id}-api`} className="text-xs md:text-sm">
                        Clé API
                      </Label>
                      <Input
                        id={`${provider.id}-api`}
                        type="password"
                        placeholder="Entrez la clé API"
                        value={provider.apiKey || ''}
                        onChange={(e) =>
                          updateMobileMoneyProvider(provider.id, 'apiKey', e.target.value)
                        }
                        className="text-sm"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor={`${provider.id}-secret`} className="text-xs md:text-sm">
                        Clé Secrète
                      </Label>
                      <Input
                        id={`${provider.id}-secret`}
                        type="password"
                        placeholder="Entrez la clé secrète"
                        value={provider.secretKey || ''}
                        onChange={(e) =>
                          updateMobileMoneyProvider(provider.id, 'secretKey', e.target.value)
                        }
                        className="text-sm"
                      />
                    </div>
                  </div>

                  <div className="flex items-start gap-2 p-3 bg-muted rounded-lg">
                    <AlertCircle className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                    <p className="text-xs text-muted-foreground">
                      Ces informations sont sensibles. Assurez-vous de les obtenir depuis le portail marchand officiel de {provider.name}.
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
                  <Badge variant={bankCardConfig.enabled ? 'default' : 'secondary'} className="text-xs">
                    {bankCardConfig.enabled ? (
                      <>
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        Actif
                      </>
                    ) : (
                      'Inactif'
                    )}
                  </Badge>
                  <Switch
                    checked={bankCardConfig.enabled}
                    onCheckedChange={(checked) =>
                      updateBankCardConfig('enabled', checked)
                    }
                  />
                </div>
              </div>
            </CardHeader>

            {bankCardConfig.enabled && (
              <CardContent className="p-4 pt-0 md:p-6 md:pt-0 space-y-3 md:space-y-4">
                <Separator />
                
                <div className="grid gap-3 md:gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="provider" className="text-xs md:text-sm">
                      Fournisseur de Paiement
                    </Label>
                    <select
                      id="provider"
                      className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                      value={bankCardConfig.provider}
                      onChange={(e) =>
                        updateBankCardConfig('provider', e.target.value as 'stripe' | 'flutterwave' | 'paypal')
                      }
                    >
                      <option value="stripe">Stripe</option>
                      <option value="flutterwave">Flutterwave</option>
                      <option value="paypal">PayPal</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="public-key" className="text-xs md:text-sm">
                      Clé Publique
                    </Label>
                    <Input
                      id="public-key"
                      placeholder={`Entrez votre clé publique ${bankCardConfig.provider}`}
                      value={bankCardConfig.publicKey || ''}
                      onChange={(e) =>
                        updateBankCardConfig('publicKey', e.target.value)
                      }
                      className="text-sm"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="secret-key" className="text-xs md:text-sm">
                      Clé Secrète
                    </Label>
                    <Input
                      id="secret-key"
                      type="password"
                      placeholder={`Entrez votre clé secrète ${bankCardConfig.provider}`}
                      value={bankCardConfig.secretKey || ''}
                      onChange={(e) =>
                        updateBankCardConfig('secretKey', e.target.value)
                      }
                      className="text-sm"
                    />
                  </div>

                  {bankCardConfig.provider === 'stripe' && (
                    <div className="space-y-2">
                      <Label htmlFor="webhook-secret" className="text-xs md:text-sm">
                        Webhook Secret
                      </Label>
                      <Input
                        id="webhook-secret"
                        type="password"
                        placeholder="Entrez le secret webhook Stripe"
                        value={bankCardConfig.webhookSecret || ''}
                        onChange={(e) =>
                          updateBankCardConfig('webhookSecret', e.target.value)
                        }
                        className="text-sm"
                      />
                    </div>
                  )}
                </div>

                <div className="flex items-start gap-2 p-3 bg-muted rounded-lg">
                  <AlertCircle className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">
                      Utilisez les clés de test en mode développement. Ne passez en mode production qu'après avoir testé l'intégration.
                    </p>
                    <p className="text-xs text-muted-foreground font-medium">
                      Documentation: <a href={`https://${bankCardConfig.provider}.com/docs`} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                        {bankCardConfig.provider}.com/docs
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
                {mobileMoneyProviders.filter(p => p.enabled).length} / {mobileMoneyProviders.length}
              </span>
            </div>
            <div className="flex items-center justify-between py-2 border-b">
              <span className="text-muted-foreground">Carte bancaire</span>
              <Badge variant={bankCardConfig.enabled ? 'default' : 'secondary'}>
                {bankCardConfig.enabled ? 'Activé' : 'Désactivé'}
              </Badge>
            </div>
            {bankCardConfig.enabled && (
              <div className="flex items-center justify-between py-2">
                <span className="text-muted-foreground">Fournisseur</span>
                <span className="font-medium capitalize">{bankCardConfig.provider}</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminPaymentMethods;

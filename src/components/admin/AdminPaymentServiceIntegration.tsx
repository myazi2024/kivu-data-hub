import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  AlertTriangle, 
  CheckCircle2, 
  TrendingUp, 
  DollarSign, 
  CreditCard,
  Smartphone,
  Shield,
  AlertCircle,
  Info,
  Loader2
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { usePaymentConfig } from '@/hooks/usePaymentConfig';
import { useCadastralServices } from '@/hooks/useCadastralServices';

interface TransactionFees {
  stripe: { percentage: number; fixed: number };
  mobile_money: { percentage: number };
}

interface ServiceProviderCompatibility {
  serviceId: string;
  serviceName: string;
  priceUsd: number;
  compatibleProviders: string[];
  warnings: string[];
  estimatedFees: {
    stripe?: number;
    mobile_money?: number;
  };
}

const AdminPaymentServiceIntegration: React.FC = () => {
  const { paymentMode, availableMethods, isPaymentRequired, loading: configLoading } = usePaymentConfig();
  const { services, loading: servicesLoading } = useCadastralServices();
  const [compatibility, setCompatibility] = useState<ServiceProviderCompatibility[]>([]);
  const [systemHealth, setSystemHealth] = useState({
    score: 0,
    issues: [] as string[],
    warnings: [] as string[]
  });

  // Frais de transaction standards
  const transactionFees: TransactionFees = {
    stripe: { percentage: 2.9, fixed: 0.30 },
    mobile_money: { percentage: 3.5 }
  };

  // Limites de paiement par provider
  const providerLimits = {
    stripe: { min: 0.50, max: 999999 },
    airtel_money: { min: 1, max: 500 },
    orange_money: { min: 1, max: 500 },
    mpesa: { min: 1, max: 1000 }
  };

  useEffect(() => {
    if (!servicesLoading && !configLoading) {
      analyzeCompatibility();
      calculateSystemHealth();
    }
  }, [services, availableMethods, paymentMode, servicesLoading, configLoading]);

  const analyzeCompatibility = () => {
    const compatibilityData: ServiceProviderCompatibility[] = services.map(service => {
      const compatible: string[] = [];
      const warnings: string[] = [];
      const fees: any = {};

      // Vérifier compatibilité Stripe
      if (availableMethods.hasBankCard) {
        if (service.price >= providerLimits.stripe.min && service.price <= providerLimits.stripe.max) {
          compatible.push('Stripe');
          fees.stripe = calculateStripeFee(service.price);
        } else if (service.price < providerLimits.stripe.min) {
          warnings.push(`Prix trop bas pour Stripe (min: $${providerLimits.stripe.min})`);
        }
      }

      // Vérifier compatibilité Mobile Money
      if (availableMethods.hasMobileMoney) {
        const mobileMoneyCompatible = availableMethods.enabledProviders.mobileMoneyProviders.some(provider => {
          const limit = providerLimits[provider as keyof typeof providerLimits];
          return limit && service.price >= limit.min && service.price <= limit.max;
        });

        if (mobileMoneyCompatible) {
          compatible.push('Mobile Money');
          fees.mobile_money = calculateMobileMoneyFee(service.price);
        } else {
          const limits = availableMethods.enabledProviders.mobileMoneyProviders
            .map(p => providerLimits[p as keyof typeof providerLimits])
            .filter(Boolean);
          
          if (limits.length > 0 && service.price > Math.max(...limits.map(l => l.max))) {
            warnings.push(`Prix trop élevé pour Mobile Money (max: $${Math.max(...limits.map(l => l.max))})`);
          }
        }
      }

      return {
        serviceId: service.id,
        serviceName: service.name,
        priceUsd: service.price,
        compatibleProviders: compatible,
        warnings,
        estimatedFees: fees
      };
    });

    setCompatibility(compatibilityData);
  };

  const calculateStripeFee = (amount: number): number => {
    return (amount * transactionFees.stripe.percentage / 100) + transactionFees.stripe.fixed;
  };

  const calculateMobileMoneyFee = (amount: number): number => {
    return amount * transactionFees.mobile_money.percentage / 100;
  };

  const calculateSystemHealth = () => {
    const issues: string[] = [];
    const warnings: string[] = [];
    let score = 100;

    // Vérifier si le paiement est activé
    if (!paymentMode.enabled) {
      issues.push('Le système de paiement n\'est pas configuré');
      score -= 50;
    }

    // Vérifier si des moyens de paiement sont disponibles
    if (isPaymentRequired() && !availableMethods.hasAnyMethod) {
      issues.push('Aucun moyen de paiement configuré alors que le paiement est requis');
      score -= 30;
    }

    // Vérifier si des services sont actifs
    if (services.length === 0) {
      issues.push('Aucun service cadastral actif');
      score -= 20;
    }

    // Vérifier compatibilité services/moyens
    const incompatibleServices = compatibility.filter(c => c.compatibleProviders.length === 0);
    if (incompatibleServices.length > 0) {
      warnings.push(`${incompatibleServices.length} service(s) incompatible(s) avec les moyens de paiement disponibles`);
      score -= incompatibleServices.length * 5;
    }

    // Vérifier si tous les services ont au moins un moyen
    const servicesWithWarnings = compatibility.filter(c => c.warnings.length > 0);
    if (servicesWithWarnings.length > 0) {
      warnings.push(`${servicesWithWarnings.length} service(s) avec des avertissements de compatibilité`);
    }

    setSystemHealth({
      score: Math.max(0, score),
      issues,
      warnings
    });
  };

  const getTotalEstimatedRevenue = () => {
    return services.reduce((sum, service) => sum + service.price, 0);
  };

  const getEstimatedNetRevenue = () => {
    // Estimation basée sur distribution 50% Stripe, 50% Mobile Money
    const totalRevenue = getTotalEstimatedRevenue();
    const stripeFees = totalRevenue * 0.5 * (transactionFees.stripe.percentage / 100);
    const mobileMoneyFees = totalRevenue * 0.5 * (transactionFees.mobile_money.percentage / 100);
    return totalRevenue - stripeFees - mobileMoneyFees;
  };

  if (configLoading || servicesLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl md:text-3xl font-bold tracking-tight">Intégration Services & Paiements</h2>
        <p className="text-muted-foreground mt-1">
          Vue consolidée de la cohérence entre catalogue de services et moyens de paiement
        </p>
      </div>

      {/* État du système */}
      <Card className={`border-2 ${
        systemHealth.score >= 80 ? 'border-green-500' : 
        systemHealth.score >= 50 ? 'border-orange-500' : 
        'border-red-500'
      }`}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${
                systemHealth.score >= 80 ? 'bg-green-100 dark:bg-green-900/20' : 
                systemHealth.score >= 50 ? 'bg-orange-100 dark:bg-orange-900/20' : 
                'bg-red-100 dark:bg-red-900/20'
              }`}>
                {systemHealth.score >= 80 ? (
                  <CheckCircle2 className="h-6 w-6 text-green-600 dark:text-green-400" />
                ) : systemHealth.score >= 50 ? (
                  <AlertTriangle className="h-6 w-6 text-orange-600 dark:text-orange-400" />
                ) : (
                  <AlertCircle className="h-6 w-6 text-red-600 dark:text-red-400" />
                )}
              </div>
              <div>
                <CardTitle className="text-lg">État de Santé du Système</CardTitle>
                <CardDescription>Score de cohérence et compatibilité</CardDescription>
              </div>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold">{systemHealth.score}%</div>
              <Progress value={systemHealth.score} className="w-24 mt-2" />
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {systemHealth.issues.length > 0 && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <div className="font-semibold mb-1">Problèmes critiques détectés:</div>
                <ul className="list-disc list-inside space-y-1">
                  {systemHealth.issues.map((issue, idx) => (
                    <li key={idx} className="text-sm">{issue}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          {systemHealth.warnings.length > 0 && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <div className="font-semibold mb-1">Avertissements:</div>
                <ul className="list-disc list-inside space-y-1">
                  {systemHealth.warnings.map((warning, idx) => (
                    <li key={idx} className="text-sm">{warning}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          {systemHealth.score === 100 && (
            <Alert>
              <CheckCircle2 className="h-4 w-4" />
              <AlertDescription>
                Système opérationnel à 100%. Tous les services sont compatibles avec les moyens de paiement configurés.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Statistiques financières */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Revenus Catalogue Brut</p>
                <p className="text-2xl font-bold">${getTotalEstimatedRevenue().toFixed(2)}</p>
              </div>
              <DollarSign className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Revenus Nets Estimés</p>
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                  ${getEstimatedNetRevenue().toFixed(2)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Après frais transaction
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Frais Estimés</p>
                <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                  ${(getTotalEstimatedRevenue() - getEstimatedNetRevenue()).toFixed(2)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  ~{(((getTotalEstimatedRevenue() - getEstimatedNetRevenue()) / getTotalEstimatedRevenue()) * 100).toFixed(1)}% du total
                </p>
              </div>
              <AlertCircle className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tableau de compatibilité */}
      <Tabs defaultValue="compatibility" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="compatibility">Compatibilité</TabsTrigger>
          <TabsTrigger value="fees">Analyse des Frais</TabsTrigger>
        </TabsList>

        <TabsContent value="compatibility" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Compatibilité Services × Moyens de Paiement
              </CardTitle>
              <CardDescription>
                Validation des limites de montant et disponibilité des providers
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Service</TableHead>
                    <TableHead>Prix</TableHead>
                    <TableHead>Moyens Compatibles</TableHead>
                    <TableHead>État</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {compatibility.map((item) => (
                    <TableRow key={item.serviceId}>
                      <TableCell className="font-medium">{item.serviceName}</TableCell>
                      <TableCell>${item.priceUsd.toFixed(2)}</TableCell>
                      <TableCell>
                        <div className="flex gap-2 flex-wrap">
                          {item.compatibleProviders.length > 0 ? (
                            item.compatibleProviders.map(provider => (
                              <Badge key={provider} variant="default" className="gap-1">
                                {provider === 'Stripe' ? (
                                  <CreditCard className="h-3 w-3" />
                                ) : (
                                  <Smartphone className="h-3 w-3" />
                                )}
                                {provider}
                              </Badge>
                            ))
                          ) : (
                            <Badge variant="destructive">Aucun</Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {item.warnings.length > 0 ? (
                          <div className="space-y-1">
                            {item.warnings.map((warning, idx) => (
                              <div key={idx} className="flex items-center gap-1 text-xs text-orange-600 dark:text-orange-400">
                                <AlertTriangle className="h-3 w-3" />
                                {warning}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <Badge variant="outline" className="gap-1">
                            <CheckCircle2 className="h-3 w-3" />
                            OK
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="fees" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Analyse des Frais de Transaction
              </CardTitle>
              <CardDescription>
                Estimation des frais par service et par moyen de paiement
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Service</TableHead>
                    <TableHead>Prix Brut</TableHead>
                    <TableHead>Frais Stripe</TableHead>
                    <TableHead>Net Stripe</TableHead>
                    <TableHead>Frais Mobile Money</TableHead>
                    <TableHead>Net Mobile Money</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {compatibility.map((item) => (
                    <TableRow key={item.serviceId}>
                      <TableCell className="font-medium">{item.serviceName}</TableCell>
                      <TableCell className="font-semibold">${item.priceUsd.toFixed(2)}</TableCell>
                      <TableCell>
                        {item.estimatedFees.stripe ? (
                          <span className="text-orange-600 dark:text-orange-400">
                            -${item.estimatedFees.stripe.toFixed(2)}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">N/A</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {item.estimatedFees.stripe ? (
                          <span className="text-green-600 dark:text-green-400 font-semibold">
                            ${(item.priceUsd - item.estimatedFees.stripe).toFixed(2)}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">N/A</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {item.estimatedFees.mobile_money ? (
                          <span className="text-orange-600 dark:text-orange-400">
                            -${item.estimatedFees.mobile_money.toFixed(2)}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">N/A</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {item.estimatedFees.mobile_money ? (
                          <span className="text-green-600 dark:text-green-400 font-semibold">
                            ${(item.priceUsd - item.estimatedFees.mobile_money).toFixed(2)}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">N/A</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Légende des frais */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Info className="h-4 w-4" />
                Tarifs de Transaction
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex items-center justify-between p-2 rounded bg-muted/30">
                <div className="flex items-center gap-2">
                  <CreditCard className="h-4 w-4" />
                  <span>Stripe (Carte Bancaire)</span>
                </div>
                <span className="font-mono">{transactionFees.stripe.percentage}% + ${transactionFees.stripe.fixed}</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded bg-muted/30">
                <div className="flex items-center gap-2">
                  <Smartphone className="h-4 w-4" />
                  <span>Mobile Money</span>
                </div>
                <span className="font-mono">~{transactionFees.mobile_money.percentage}%</span>
              </div>
              <p className="text-xs text-muted-foreground mt-3">
                * Les frais Mobile Money peuvent varier selon le provider (Airtel, Orange, M-Pesa)
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminPaymentServiceIntegration;

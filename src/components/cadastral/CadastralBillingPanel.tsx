import React, { useState } from 'react';
import { Building2 } from 'lucide-react';
import { trackEvent } from '@/lib/analytics';


import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { TooltipProvider } from '@/components/ui/tooltip';
import { CheckCircle } from 'lucide-react';
import { ConsentAwareStorage } from '@/lib/cookies';
import { useCadastralCart } from '@/hooks/useCadastralCart';
import { useCartDiscounts } from '@/hooks/useCartDiscounts';
import { useCadastralPayment } from '@/hooks/useCadastralPayment';
import { useCadastralServices } from '@/hooks/useCadastralServices';
import { CadastralSearchResult } from '@/hooks/useCadastralSearch';
import { useToast } from '@/hooks/use-toast';
import { usePaymentConfig } from '@/hooks/usePaymentConfig';
import { useCurrencyConfig } from '@/hooks/useCurrencyConfig';
import CadastralPaymentDialog from './CadastralPaymentDialog';
import { resolveLucideIcon } from '@/lib/lucideIconMap';
import { evaluateServiceAvailability } from '@/lib/serviceAvailability';
import BillingHeader from './billing/BillingHeader';
import ServiceListItem from './billing/ServiceListItem';
import BillingTotals from './billing/BillingTotals';
import {
  ClientFiscalIdentityForm,
  EMPTY_FISCAL_IDENTITY,
  validateFiscalIdentity,
  type ClientFiscalIdentity,
} from '@/components/billing/ClientFiscalIdentityForm';
import { formatCurrency } from '@/utils/formatters';

interface CadastralBillingPanelProps {
  searchResult: CadastralSearchResult;
  onPaymentSuccess: (selectedServices: string[]) => void;
  preselectServiceId?: string;
  onClose?: () => void;
  onRequestContribution?: () => void;
  alreadyPaidServices?: string[];
}

// B5 : `legacyAvailability` retiré — tous les services BD ont désormais `required_data_fields`.


const CadastralBillingPanel: React.FC<CadastralBillingPanelProps> = ({ 
  searchResult, 
  onPaymentSuccess,
  preselectServiceId,
  onClose,
  onRequestContribution,
  alreadyPaidServices = []
}) => {
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [currentInvoice, setCurrentInvoice] = useState<any>(null);
  const [appliedDiscount, setAppliedDiscount] = useState<{
    code: string;
    amount: number;
    reseller_id: string;
    code_id: string;
  } | null>(null);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [highlightTerms, setHighlightTerms] = useState(false);
  const [expandedServices, setExpandedServices] = useState<Set<string>>(new Set());
  const [fiscalIdentity, setFiscalIdentity] = useState<ClientFiscalIdentity>(() => {
    try {
      // PII fiscale (RCCM/NIF) → consent-aware storage (RGPD)
      const stored = ConsentAwareStorage.getItem('bic_last_fiscal_identity');
      if (stored) return { ...EMPTY_FISCAL_IDENTITY, ...JSON.parse(stored) };
    } catch {}
    return EMPTY_FISCAL_IDENTITY;
  });
  const { toast } = useToast();
  // Fix #10: Une seule instanciation de usePaymentConfig, passée au dialog
  const { paymentMode, isPaymentRequired, availableMethods } = usePaymentConfig();
  const { services: catalogServices, loading: catalogLoading, error: catalogError } = useCadastralServices();
  const { selectedServices, addService, addServices, removeService, toggleService, getTotalAmount, setParcelNumber, isSelected, updateServicePrices } = useCadastralCart();
  const { loading, createInvoice, processMobileMoneyPayment, processStripePayment, processTestPayment, paymentStep, resetPaymentState } = useCadastralPayment();
  const { currencies, selectedCurrency, setSelectedCurrency, convertFromUsd, exchangeRate } = useCurrencyConfig();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { get: getCartDiscount } = useCartDiscounts();
  const cardRef = React.useRef<HTMLDivElement | null>(null);

  // P1-4 : scroll vers le panneau quand le drawer demande le focus pour cette parcelle.
  React.useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<{ parcelNumber?: string }>).detail;
      if (!detail?.parcelNumber || detail.parcelNumber !== searchResult.parcel.parcel_number) return;
      cardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };
    window.addEventListener('cadastralCartFocusBilling', handler);
    return () => window.removeEventListener('cadastralCartFocusBilling', handler);
  }, [searchResult.parcel.parcel_number]);

  // P4 — Sync code promo mémorisé ↔ état local (auto-apply + auto-clear)
  React.useEffect(() => {
    const memorized = getCartDiscount(searchResult.parcel.parcel_number);
    if (memorized && (!appliedDiscount || appliedDiscount.code !== memorized.code)) {
      setAppliedDiscount({
        code: memorized.code,
        amount: memorized.amount,
        reseller_id: memorized.reseller_id ?? '',
        code_id: memorized.code_id,
      });
    } else if (!memorized && appliedDiscount) {
      // Le code a été retiré depuis le drawer → reset local
      setAppliedDiscount(null);
    }
  }, [searchResult.parcel.parcel_number, getCartDiscount, appliedDiscount]);

  const serviceAvailability = React.useMemo(() => {
    const result: Record<string, boolean> = {};
    catalogServices.forEach(svc => {
      result[svc.id] = svc.required_data_fields
        ? evaluateServiceAvailability(svc.required_data_fields, searchResult)
        : true;
    });
    return result;
  }, [searchResult, catalogServices]);

  // B5/O2 : sync prix du panier (dep selectedServices ajoutée).
  React.useEffect(() => {
    if (catalogServices.length === 0 || selectedServices.length === 0) return;
    const updates = selectedServices
      .map(cartItem => {
        const catalogItem = catalogServices.find(s => s.id === cartItem.id);
        if (catalogItem && catalogItem.price !== cartItem.price) {
          return { id: catalogItem.id, price: catalogItem.price };
        }
        return null;
      })
      .filter((u): u is { id: string; price: number } => u !== null);

    if (updates.length > 0) {
      updateServicePrices(updates);
    }
  }, [catalogServices, selectedServices, updateServicePrices]);

  React.useEffect(() => {
    setParcelNumber(searchResult.parcel.parcel_number);
  }, [searchResult.parcel.parcel_number, setParcelNumber]);

  // O3 : auto-expand des services disponibles, étendu aux nouveaux IDs apparus via Realtime.
  React.useEffect(() => {
    if (catalogServices.length === 0) return;
    setExpandedServices(prev => {
      const next = new Set(prev);
      let changed = false;
      catalogServices.forEach(s => {
        if ((serviceAvailability[s.id] ?? true) && !next.has(s.id)) {
          next.add(s.id);
          changed = true;
        }
      });
      return changed ? next : prev;
    });
  }, [catalogServices, serviceAvailability]);


  React.useEffect(() => {
    if (preselectServiceId && catalogServices.length > 0 && !selectedServices.some(s => s.id === preselectServiceId)) {
      const service = catalogServices.find(s => s.id === preselectServiceId);
      if (service) {
        toggleService({
          id: service.id,
          name: service.name,
          price: service.price,
          description: service.description,
          parcel_number: searchResult.parcel.parcel_number,
          parcel_location: searchResult.parcel.location
        });
      }
    }
  }, [preselectServiceId, catalogServices]);

  const handleServiceToggle = (serviceId: string) => {
    const service = catalogServices.find(s => s.id === serviceId);
    if (service) {
      toggleService({
        id: service.id,
        name: service.name,
        price: service.price,
        description: service.description,
        parcel_number: searchResult.parcel.parcel_number,
        parcel_location: searchResult.parcel.location
      });
    }
  };

  const toggleServiceExpansion = (serviceId: string) => {
    const newExpandedServices = new Set(expandedServices);
    if (newExpandedServices.has(serviceId)) {
      newExpandedServices.delete(serviceId);
    } else {
      newExpandedServices.add(serviceId);
    }
    setExpandedServices(newExpandedServices);
  };

  const handleProceedToPayment = async () => {
    if (isSubmitting || loading) return; // Fix: double-click prevention
    
    if (!acceptedTerms) {
      setHighlightTerms(true);
      setTimeout(() => setHighlightTerms(false), 2000);
      toast({
        title: "Termes et conditions requis",
        description: "Veuillez accepter les conditions d'utilisation pour continuer",
        variant: "destructive"
      });
      return;
    }

    // DGI : validation identité fiscale client
    const fiscalError = validateFiscalIdentity(fiscalIdentity);
    if (fiscalError) {
      toast({
        title: "Identification fiscale requise (DGI)",
        description: fiscalError,
        variant: "destructive",
      });
      return;
    }

    // Mémoriser pour la prochaine facture (PII → consent-aware)
    try { ConsentAwareStorage.setItem('bic_last_fiscal_identity', JSON.stringify(fiscalIdentity)); } catch {}

    setIsSubmitting(true);
    try {
      if (isPaymentRequired()) {
        const invoice = await createInvoice(appliedDiscount ?? undefined, fiscalIdentity);
        if (invoice) {
          setCurrentInvoice(invoice);
          setShowPaymentDialog(true);
        }
      } else {
        // Paiement non activé — accès gratuit (comme bypass)
        const invoice = await createInvoice(appliedDiscount ?? undefined, fiscalIdentity);
        if (invoice) {
          toast({
            title: "Accès accordé",
            description: "Services débloqués avec succès",
            duration: 3000
          });
          onPaymentSuccess(selectedServices.map(s => s.id));
        }
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePaymentSuccess = (services: string[]) => {
    setShowPaymentDialog(false);
    onPaymentSuccess(services.length > 0 ? services : selectedServices.map(s => s.id));
  };

  // B5 : `fallbackIconMap` retiré — toutes les lignes BD ont `icon_name` renseigné.
  const getServiceIcon = (service: { icon_name?: string | null }) =>
    resolveLucideIcon(service.icon_name ?? null, Building2);


  const totalAmount = getTotalAmount();
  const discountedAmount = appliedDiscount ? Math.max(0, totalAmount - appliedDiscount.amount) : totalAmount;
  const selectedServiceIds = selectedServices.map(s => s.id);

  // Fix #6: Calculer les services sélectionnables (non payés, avec données)
  const selectableServices = catalogServices.filter(
    s => (serviceAvailability[s.id] ?? true) && !alreadyPaidServices.includes(s.id)
  );
  const allSelectableSelected = selectableServices.length > 0 && 
    selectableServices.every(s => selectedServiceIds.includes(s.id));

  return (
    <TooltipProvider>
      <Card ref={cardRef} className="w-full max-w-[380px] sm:max-w-none mx-auto border-primary/20 bg-gradient-to-br from-background to-secondary/5 rounded-2xl overflow-hidden shadow-sm scroll-mt-20">
        <BillingHeader parcel={searchResult.parcel} servicesCount={catalogServices.length} />

        <CardContent className="space-y-2.5 p-3">
          {/* Message info compact */}
          <div className="flex items-start gap-2 p-2 rounded-xl bg-emerald-50/80 border border-emerald-200/60 dark:bg-emerald-900/20 dark:border-emerald-700/40">
            <CheckCircle className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 mt-0.5 shrink-0" />
            <p className="text-xs text-emerald-800 dark:text-emerald-200 leading-relaxed">
              Cette parcelle dispose de données cadastrales. Sélectionnez les services souhaités.
            </p>
          </div>

          {catalogLoading ? (
            <div className="flex items-center justify-center p-6">
              <div className="animate-spin rounded-full h-6 w-6 border-2 border-primary border-t-transparent" />
              <span className="ml-2 text-xs text-muted-foreground">Chargement du catalogue...</span>
            </div>
          ) : catalogError ? (
            <Alert variant="destructive" className="text-xs">
              <AlertDescription>
                Impossible de charger le catalogue de services. Veuillez réessayer.
              </AlertDescription>
            </Alert>
          ) : (
          <div className="space-y-2">
            {/* P2 — Bundle "Tout ajouter" : dossier complet en 1 clic */}
            {(() => {
              const bundleTotal = selectableServices.reduce((acc, s) => acc + s.price, 0);
              const remainingToAdd = selectableServices.filter(s => !selectedServiceIds.includes(s.id));
              const remainingValue = remainingToAdd.reduce((acc, s) => acc + s.price, 0);
              if (selectableServices.length <= 1) return null;
              return (
                <div className="rounded-xl border border-primary/30 bg-gradient-to-br from-primary/5 to-primary/10 p-2.5 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-primary flex items-center gap-1.5">
                        <CheckCircle className="h-3.5 w-3.5" />
                        Dossier complet de la parcelle
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-0.5 leading-tight">
                        {selectableServices.length} services pour {formatCurrency(convertFromUsd(bundleTotal), selectedCurrency)} — toutes les informations en 1 paiement.
                      </p>
                    </div>
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0.5 shrink-0">
                      {selectableServices.length} dispo.
                    </Badge>
                  </div>
                  {allSelectableSelected ? (
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full h-8 text-xs"
                      onClick={() => selectedServiceIds.forEach(id => removeService(id))}
                    >
                      Tout retirer
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      className="w-full h-8 text-xs"
                      onClick={() => {
                        remainingToAdd.forEach(service => {
                          addService({
                            id: service.id,
                            name: service.name,
                            price: service.price,
                            description: service.description,
                            parcel_number: searchResult.parcel.parcel_number,
                            parcel_location: searchResult.parcel.location,
                            category: typeof service.category === 'string' ? service.category : undefined,
                          });
                        });
                        // O5 : tracking du bundle "Tout ajouter / Compléter le dossier"
                        trackEvent(selectedServiceIds.length === 0 ? 'cadastral_bundle_add_all' : 'cadastral_bundle_complete_panel', {
                          parcel_number: searchResult.parcel.parcel_number,
                          added_count: remainingToAdd.length,
                          added_value_usd: remainingValue,
                        });
                      }}

                    >
                      {selectedServiceIds.length === 0
                        ? `Tout ajouter — ${formatCurrency(convertFromUsd(bundleTotal), selectedCurrency)}`
                        : `Compléter le dossier (+${formatCurrency(convertFromUsd(remainingValue), selectedCurrency)})`}
                    </Button>
                  )}
                </div>
              );
            })()}
            
            {/* Liste des services */}
            <div className="space-y-2">
              {catalogServices.map((service) => {
                const IconComponent = getServiceIcon(service);
                const isServiceSelected = selectedServiceIds.includes(service.id);
                const isExpanded = expandedServices.has(service.id);
                const hasData = serviceAvailability[service.id] ?? true;
                const isAlreadyPaid = alreadyPaidServices.includes(service.id);
                const isDisabled = !hasData || isAlreadyPaid;
                
                return (
                  <ServiceListItem
                    key={service.id}
                    service={service}
                    Icon={IconComponent}
                    isSelected={isServiceSelected}
                    isExpanded={isExpanded}
                    hasData={hasData}
                    isAlreadyPaid={isAlreadyPaid}
                    onToggleSelect={() => handleServiceToggle(service.id)}
                    onToggleExpand={() => toggleServiceExpansion(service.id)}
                    onRequestContribution={onRequestContribution}
                    priceLabel={formatCurrency(convertFromUsd(service.price), selectedCurrency)}

                  />
                );
              })}
            </div>
          </div>
          )}

          {/* DGI : identité fiscale du client (obligatoire) */}
          {selectedServiceIds.length > 0 && (
            <ClientFiscalIdentityForm
              value={fiscalIdentity}
              onChange={setFiscalIdentity}
              required
            />
          )}

          <BillingTotals
            selectedCount={selectedServiceIds.length}
            totalAmount={totalAmount}
            appliedDiscount={appliedDiscount}
            onDiscountApplied={setAppliedDiscount}
            currencies={currencies}
            selectedCurrency={selectedCurrency}
            setSelectedCurrency={setSelectedCurrency}
            convertFromUsd={convertFromUsd}
            acceptedTerms={acceptedTerms}
            setAcceptedTerms={setAcceptedTerms}
            highlightTerms={highlightTerms}
            loading={loading}
            isSubmitting={isSubmitting}
            isPaymentRequired={isPaymentRequired}
            onProceed={handleProceedToPayment}
          />
        </CardContent>
      </Card>

      {/* Fix #10: Passer availableMethods au dialog au lieu de le ré-instancier */}
      {showPaymentDialog && currentInvoice && (
        <CadastralPaymentDialog
          invoice={currentInvoice}
          onClose={() => setShowPaymentDialog(false)}
          onPaymentSuccess={handlePaymentSuccess}
          availableMethods={availableMethods}
          paymentStep={paymentStep}
          processMobileMoneyPayment={processMobileMoneyPayment}
          processStripePayment={processStripePayment}
          processTestPayment={processTestPayment}
          resetPaymentState={resetPaymentState}
          selectedCurrency={selectedCurrency}
          exchangeRate={exchangeRate}
        />
      )}
    </TooltipProvider>
  );
};

export default CadastralBillingPanel;

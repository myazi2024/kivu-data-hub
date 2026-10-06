import React, { useState, useEffect } from 'react';
import { ShoppingCart, Trash2, MapPin, Check, Plus, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetFooter } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useCadastralCart } from '@/hooks/useCadastralCart';
import { useCartAccessCheck } from '@/hooks/useCartAccessCheck';
import { useCartDiscounts } from '@/hooks/useCartDiscounts';
import { useDiscountCodes } from '@/hooks/useDiscountCodes';
import { useCadastralServices } from '@/hooks/useCadastralServices';
import { useCurrencyConfig } from '@/hooks/useCurrencyConfig';
import { useToast } from '@/hooks/use-toast';
import { formatCurrency } from '@/utils/formatters';
import { trackEvent } from '@/lib/analytics';
import { cn } from '@/lib/utils';
import CartParcelDiscountInput from './cart/CartParcelDiscountInput';

import { getCadastralCategoryMeta, CADASTRAL_SERVICE_CATEGORIES } from '@/constants/cadastralServiceCategories';
import type { CadastralCartService } from '@/hooks/useCadastralCart';

const CATEGORY_ORDER: readonly string[] = CADASTRAL_SERVICE_CATEGORIES;

/** Regroupe les services par catégorie, dans l'ordre du catalogue. */
const groupByCategory = (services: CadastralCartService[]) => {
  const groups = new Map<string, CadastralCartService[]>();
  for (const s of services) {
    const key = s.category || 'consultation';
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(s);
  }
  const rank = (k: string) => { const i = CATEGORY_ORDER.indexOf(k); return i === -1 ? CATEGORY_ORDER.length : i; };
  return [...groups.entries()].sort((a, b) => rank(a[0]) - rank(b[0]));
};

const formatDate = (iso: string) => new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });

/**
 * Bouton flottant + Sheet récapitulant le panier multi-parcelles cadastral.
 * Phase 1 : multi-parcelles + anti-doublon achat (P1) + badges catégorie (P3) + tri stable (P3).
 * La purge post-paiement (P6) est gérée dans useCadastralCart.
 */
const CadastralCartButton: React.FC = () => {
  const [open, setOpen] = useState(false);
  const {
    parcels,
    getParcelCount,
    getTotalAcrossParcels,
    removeServiceForParcel,
    clearParcel,
    setParcelNumber,
    addServiceForParcel,
    syncWithCatalog,
    parcelNumber: activeParcelNumber,
  } = useCadastralCart();

  const { toast } = useToast();
  const { isOwned, ownedUntil, allOwnedFor } = useCartAccessCheck(parcels);
  const { services: catalogServices, loading: catalogLoading } = useCadastralServices();
  // Retire du panier les services archivés/désactivés et aligne prix/libellés sur le catalogue.
  React.useEffect(() => {
    if (catalogLoading || catalogServices.length === 0) return;
    const activeIds = new Set(catalogServices.map((c) => c.id));
    const removed = parcels.flatMap((p) => p.services.filter((s) => !activeIds.has(s.id)).map((s) => s.name));
    syncWithCatalog(catalogServices);
    if (removed.length > 0) {
      toast({
        title: 'Panier mis à jour',
        description: `${removed.length > 1 ? 'Ces services ne sont plus proposés et ont été retirés' : "Ce service n'est plus proposé et a été retiré"} : ${removed.join(', ')}.`,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [catalogLoading, catalogServices, syncWithCatalog]);
  const { selectedCurrency, convertFromUsd } = useCurrencyConfig();
  const { map: discountsMap, clear: clearDiscount } = useCartDiscounts();
  const { validateDiscountCode } = useDiscountCodes();

  const fmt = (usd: number) => formatCurrency(convertFromUsd(usd), selectedCurrency);

  const totalServices = parcels.reduce((acc, p) => acc + p.services.length, 0);
  const total = getTotalAcrossParcels();
  const parcelCount = getParcelCount();

  // P1-7: re-valider les codes promo mémorisés à chaque ouverture du drawer (auto-clear si invalides).
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    (async () => {
      for (const p of parcels) {
        const entry = discountsMap[p.parcelNumber];
        if (!entry) continue;
        const subtotal = p.services
          .filter((s) => !isOwned(p.parcelNumber, s.id))
          .reduce((acc, sv) => acc + sv.price, 0);
        if (subtotal <= 0) continue;
        try {
          const v = await validateDiscountCode(entry.code, subtotal);
          if (cancelled) return;
          if (!v?.is_valid) {
            clearDiscount(p.parcelNumber);
            trackEvent('cadastral_cart_promo_auto_cleared', {
              parcel_number: p.parcelNumber,
              code: entry.code,
            });
            toast({
              title: 'Code retiré',
              description: `Le code "${entry.code}" n'est plus valide pour ${p.parcelNumber}.`,
              variant: 'destructive',
            });
          }
        } catch {
          /* silent */
        }
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (totalServices === 0) return null;

  const totalRemaining = parcels.reduce(
    (acc, p) => acc + p.services.filter((s) => !isOwned(p.parcelNumber, s.id)).reduce((a, sv) => a + sv.price, 0),
    0
  );

  return (
    <Sheet
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) {
          trackEvent('cadastral_cart_open', {
            parcel_count: parcelCount,
            service_count: totalServices,
            total_usd: total,
          });
        }
      }}
    >
      <SheetTrigger asChild>
        <Button
          size="icon"
          className="fixed left-3 z-[1000] shadow-lg rounded-full h-11 w-11 bottom-[calc(env(safe-area-inset-bottom,0px)+5rem)] sm:bottom-3"
          aria-label={`Panier cadastral : ${totalServices} service${totalServices > 1 ? 's' : ''}, total ${fmt(total)}`}
          title={`${totalServices} service${totalServices > 1 ? 's' : ''} · ${fmt(total)}`}
        >
          <ShoppingCart className="h-5 w-5" />
          <Badge
            variant="secondary"
            className="absolute -top-1 -right-1 h-4 min-w-4 px-1 text-[10px] flex items-center justify-center pointer-events-none"
          >
            {totalServices}
          </Badge>
        </Button>
      </SheetTrigger>

      <SheetContent side="left" className="w-3/4 max-w-[85vw] sm:max-w-sm flex flex-col rounded-r-2xl pb-[env(safe-area-inset-bottom,0px)]">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5" />
            Panier cadastral
          </SheetTitle>
          <p className="text-xs text-muted-foreground text-left">
            {parcelCount} parcelle{parcelCount > 1 ? 's' : ''} · {totalServices} service{totalServices > 1 ? 's' : ''}
          </p>
        </SheetHeader>

        <ScrollArea className="flex-1 -mx-6 px-6 py-3">
          <div className="space-y-4">
            {parcels.map((p) => {
              const subtotal = p.services
                .filter((s) => !isOwned(p.parcelNumber, s.id))
                .reduce((acc, sv) => acc + sv.price, 0);
              const isActive = activeParcelNumber === p.parcelNumber;
              const allOwned = allOwnedFor(p);
              return (
                <div
                  key={p.parcelNumber}
                  className={cn(
                    'rounded-xl border bg-card p-3 space-y-2',
                    isActive ? 'border-primary/40 ring-1 ring-primary/20' : 'border-border'
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 text-sm font-semibold">
                        <MapPin className="h-3.5 w-3.5 text-primary shrink-0" />
                        <span className="truncate">{p.parcelNumber}</span>
                        {isActive && (
                          <Badge variant="outline" className="h-4 px-1.5 text-[9px] border-primary/40 text-primary">
                            En cours
                          </Badge>
                        )}
                      </div>
                      {p.parcelLocation && (
                        <p className="text-xs text-muted-foreground truncate ml-5">{p.parcelLocation}</p>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-11 w-11 shrink-0"
                      onClick={() => {
                        trackEvent('cadastral_cart_clear_parcel', {
                          parcel_number: p.parcelNumber,
                          service_count: p.services.length,
                        });
                        clearParcel(p.parcelNumber);
                      }}
                      aria-label={`Vider la parcelle ${p.parcelNumber}`}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>

                  <Separator />

                  <div className="space-y-2">
                    {groupByCategory(p.services).map(([category, services]) => {
                      const meta = getCadastralCategoryMeta(category);
                      return (
                        <div key={category} className="space-y-1">
                          <Badge variant="outline" className={cn('h-5 px-1.5 text-[10px] font-normal', meta.className)}>
                            {meta.label}
                          </Badge>
                          <ul className="space-y-1">
                            {services.map((s) => {
                              const owned = isOwned(p.parcelNumber, s.id);
                              const until = owned ? ownedUntil(p.parcelNumber, s.id) : null;
                              return (
                                <li key={s.id} className={cn('flex items-center justify-between gap-2 text-xs', owned && 'opacity-70')}>
                                  <div className="flex flex-col min-w-0 flex-1 gap-0.5">
                                    <span className={cn('truncate', owned && 'line-through')}>{s.name}</span>
                                    {owned && (
                                      <span className="flex items-center gap-1 text-[10px] text-primary">
                                        <Check className="h-3 w-3" />
                                        {until ? `Déjà acquis · accès jusqu'au ${formatDate(until)}` : 'Déjà acquis'}
                                      </span>
                                    )}
                                  </div>
                                  <span className="tabular-nums text-muted-foreground" aria-label={`Prix : ${fmt(s.price)}`}>
                                    {owned ? '—' : fmt(s.price)}
                                  </span>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-11 w-11 shrink-0"
                                    onClick={() => {
                                      trackEvent('cadastral_cart_remove_service', {
                                        parcel_number: p.parcelNumber,
                                        service_id: s.id,
                                        price_usd: s.price,
                                      });
                                      removeServiceForParcel(p.parcelNumber, s.id);
                                    }}
                                    aria-label={`Retirer ${s.name}`}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </li>
                              );
                            })}
                          </ul>
                        </div>
                      );
                    })}
                  </div>

                  {/* Suggestions : uniquement les services que le catalogue déclare disponibles pour cette parcelle. */}
                  {(() => {
                    if (!p.availableServiceIds || catalogServices.length === 0) return null;
                    const available = new Set(p.availableServiceIds);
                    const inCartIds = new Set(p.services.map((s) => s.id));
                    const missing = catalogServices.filter(
                      (cs) => available.has(cs.id) && !inCartIds.has(cs.id) && !isOwned(p.parcelNumber, cs.id)
                    );
                    if (missing.length === 0) return null;
                    const missingTotal = missing.reduce((acc, m) => acc + m.price, 0);
                    return (
                      <div className="rounded-lg border border-dashed border-primary/30 bg-primary/5 p-2 space-y-1.5">
                        <div className="flex items-center gap-1.5 text-[11px] text-primary font-medium">
                          <Sparkles className="h-3 w-3" />
                          Compléter le dossier
                        </div>
                        <p className="text-[10px] text-muted-foreground leading-tight">
                          {missing.length} autre{missing.length > 1 ? 's' : ''} service{missing.length > 1 ? 's' : ''} disponible{missing.length > 1 ? 's' : ''} pour cette parcelle : {missing.map((m) => m.name).join(', ')}.
                        </p>
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full h-11 text-xs border-primary/30 hover:bg-primary/10"
                          onClick={() => {
                            missing.forEach((cs) => {
                              addServiceForParcel(p.parcelNumber, p.parcelLocation, {
                                id: cs.id,
                                name: cs.name,
                                price: cs.price,
                                description: cs.description,
                                parcel_number: p.parcelNumber,
                                parcel_location: p.parcelLocation,
                                category: typeof cs.category === 'string' ? cs.category : undefined,
                              });
                            });
                            trackEvent('cadastral_cart_complete_bundle', {
                              parcel_number: p.parcelNumber,
                              added_count: missing.length,
                              added_value_usd: missingTotal,
                            });
                          }}
                        >
                          <Plus className="h-3 w-3 mr-1" />
                          Tout ajouter (+{fmt(missingTotal)})
                        </Button>
                      </div>
                    );
                  })()}

                  {/* P4 — Code promo / CCC mémorisé par parcelle */}
                  {!allOwned && subtotal > 0 && (
                    <CartParcelDiscountInput parcelNumber={p.parcelNumber} subtotal={subtotal} />
                  )}

                  <div className="flex items-center justify-between pt-1 text-xs">
                    <span className="text-muted-foreground">À payer</span>
                    <span className="font-semibold tabular-nums">{fmt(subtotal)}</span>
                  </div>

                  <Button
                    variant={isActive ? 'default' : 'outline'}
                    size="sm"
                    className="w-full h-11 text-xs"
                    disabled={allOwned || subtotal <= 0}
                    onClick={() => {
                      trackEvent('cadastral_cart_pay_parcel', {
                        parcel_number: p.parcelNumber,
                        service_count: p.services.length,
                        subtotal_usd: subtotal,
                      });
                      setParcelNumber(p.parcelNumber);
                      setOpen(false);
                      // P1-4 : signaler au panneau de facturation de défiler dans la vue.
                      window.dispatchEvent(new CustomEvent('cadastralCartFocusBilling', {
                        detail: { parcelNumber: p.parcelNumber },
                      }));
                      trackEvent('cadastral_cart_focus_billing', { parcel_number: p.parcelNumber });
                    }}
                  >
                    {allOwned ? 'Tous services déjà acquis' : isActive ? 'Payer cette parcelle' : 'Sélectionner & payer'}
                  </Button>
                </div>
              );
            })}
          </div>
        </ScrollArea>

        <SheetFooter className="border-t pt-3 flex-col gap-2 sm:flex-col">
          <div className="flex items-center justify-between w-full text-sm">
            <span className="font-medium">Total restant</span>
            <span className="text-lg font-bold tabular-nums">{fmt(totalRemaining)}</span>
          </div>
          <p className="text-[11px] text-muted-foreground text-center">
            Le paiement se fait parcelle par parcelle. Les services déjà acquis ne sont pas facturés ; le montant final est confirmé par le serveur.
          </p>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
};

export default CadastralCartButton;

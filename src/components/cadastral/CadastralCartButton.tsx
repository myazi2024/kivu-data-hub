import React, { useState } from 'react';
import { ShoppingCart, Trash2, MapPin, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetFooter } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useCadastralCart } from '@/hooks/useCadastralCart';
import { useCartAccessCheck } from '@/hooks/useCartAccessCheck';
import { trackEvent } from '@/lib/analytics';
import { cn } from '@/lib/utils';

/**
 * Mapping catégorie → libellé court + classes sémantiques (design tokens).
 */
const CATEGORY_META: Record<string, { label: string; className: string }> = {
  consultation: { label: 'Consultation', className: 'bg-primary/10 text-primary border-primary/20' },
  fiscal: { label: 'Fiscal', className: 'bg-accent/20 text-accent-foreground border-accent/30' },
  juridique: { label: 'Juridique', className: 'bg-secondary text-secondary-foreground border-border' },
};

const getCategoryMeta = (cat?: string) => {
  if (!cat) return null;
  return CATEGORY_META[cat] || { label: cat, className: 'bg-muted text-muted-foreground border-border' };
};

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
    parcelNumber: activeParcelNumber,
  } = useCadastralCart();

  const { isOwned, allOwnedFor } = useCartAccessCheck(parcels);

  const totalServices = parcels.reduce((acc, p) => acc + p.services.length, 0);
  const total = getTotalAcrossParcels();
  const parcelCount = getParcelCount();

  if (totalServices === 0) return null;

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
          className="fixed bottom-3 left-3 z-[1000] shadow-lg rounded-full h-11 w-11"
          aria-label={`Panier cadastral : ${totalServices} service${totalServices > 1 ? 's' : ''} · $${total.toFixed(2)}`}
          title={`${totalServices} service${totalServices > 1 ? 's' : ''} · $${total.toFixed(2)}`}
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

      <SheetContent side="left" className="w-3/4 max-w-[85vw] sm:max-w-sm flex flex-col rounded-r-2xl">
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
                      className="h-7 w-7 shrink-0"
                      onClick={() => clearParcel(p.parcelNumber)}
                      aria-label={`Vider la parcelle ${p.parcelNumber}`}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>

                  <Separator />

                  <ul className="space-y-1.5">
                    {p.services.map((s) => {
                      const owned = isOwned(p.parcelNumber, s.id);
                      const meta = getCategoryMeta(s.category);
                      return (
                        <li
                          key={s.id}
                          className={cn(
                            'flex items-center justify-between gap-2 text-xs',
                            owned && 'opacity-60'
                          )}
                        >
                          <div className="flex flex-col min-w-0 flex-1 gap-0.5">
                            <span className={cn('truncate', owned && 'line-through')}>{s.name}</span>
                            <div className="flex items-center gap-1">
                              {meta && (
                                <Badge variant="outline" className={cn('h-4 px-1 text-[9px] font-normal', meta.className)}>
                                  {meta.label}
                                </Badge>
                              )}
                              {owned && (
                                <Badge variant="outline" className="h-4 px-1 text-[9px] gap-0.5 border-primary/40 text-primary">
                                  <Check className="h-2.5 w-2.5" />
                                  Déjà acheté
                                </Badge>
                              )}
                            </div>
                          </div>
                          <span className="tabular-nums text-muted-foreground">${s.price.toFixed(2)}</span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 shrink-0"
                            onClick={() => removeServiceForParcel(p.parcelNumber, s.id)}
                            aria-label={`Retirer ${s.name}`}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </li>
                      );
                    })}
                  </ul>

                  <div className="flex items-center justify-between pt-1 text-xs">
                    <span className="text-muted-foreground">À payer</span>
                    <span className="font-semibold tabular-nums">${subtotal.toFixed(2)}</span>
                  </div>

                  <Button
                    variant={isActive ? 'default' : 'outline'}
                    size="sm"
                    className="w-full h-8 text-xs"
                    disabled={allOwned || subtotal <= 0}
                    onClick={() => {
                      trackEvent('cadastral_cart_pay_parcel', {
                        parcel_number: p.parcelNumber,
                        service_count: p.services.length,
                        subtotal_usd: subtotal,
                      });
                      setParcelNumber(p.parcelNumber);
                      setOpen(false);
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
            <span className="text-lg font-bold tabular-nums">
              ${parcels.reduce((acc, p) => acc + p.services.filter(s => !isOwned(p.parcelNumber, s.id)).reduce((a, sv) => a + sv.price, 0), 0).toFixed(2)}
            </span>
          </div>
          <p className="text-[11px] text-muted-foreground text-center">
            Le paiement se fait par parcelle. Les services déjà acquis sont exclus du total.
          </p>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
};

export default CadastralCartButton;

import { ShoppingCart, Trash2, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetFooter } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useCadastralCart } from '@/hooks/useCadastralCart';
import { trackEvent } from '@/lib/analytics';

/**
 * Bouton flottant + Sheet récapitulant le panier multi-parcelles cadastral.
 * Monté dans CadastralMap uniquement (scoping cadastral).
 * Position bottom-left pour éviter conflit avec CartButton kiosque (bottom-right).
 *
 * Phase 1 : affichage + suppression. Le checkout reste géré par CadastralBillingPanel
 * pour la parcelle active (pas de régression facturation).
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
  } = useCadastralCart();

  const totalServices = parcels.reduce((acc, p) => acc + p.services.length, 0);
  const total = getTotalAcrossParcels();
  const parcelCount = getParcelCount();

  if (totalServices === 0) return null;

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
          className="fixed bottom-3 left-3 z-[1000] shadow-lg rounded-full h-11 w-11"
          aria-label={`Panier cadastral : ${totalServices} service${totalServices > 1 ? 's' : ''} · $${total.toFixed(2)}`}
          title={`${totalServices} service${totalServices > 1 ? 's' : ''} · $${total.toFixed(2)}`}
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

      <SheetContent side="left" className="w-3/4 max-w-[85vw] sm:max-w-sm flex flex-col rounded-r-2xl">
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
              const subtotal = p.services.reduce((s, sv) => s + sv.price, 0);
              return (
                <div
                  key={p.parcelNumber}
                  className="rounded-xl border border-border bg-card p-3 space-y-2"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 text-sm font-semibold">
                        <MapPin className="h-3.5 w-3.5 text-primary shrink-0" />
                        <span className="truncate">{p.parcelNumber}</span>
                      </div>
                      {p.parcelLocation && (
                        <p className="text-xs text-muted-foreground truncate ml-5">{p.parcelLocation}</p>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 shrink-0"
                      onClick={() => clearParcel(p.parcelNumber)}
                      aria-label={`Vider la parcelle ${p.parcelNumber}`}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>

                  <Separator />

                  <ul className="space-y-1.5">
                    {p.services.map((s) => (
                      <li key={s.id} className="flex items-center justify-between gap-2 text-xs">
                        <span className="truncate flex-1">{s.name}</span>
                        <span className="tabular-nums text-muted-foreground">${s.price.toFixed(2)}</span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 shrink-0"
                          onClick={() => removeServiceForParcel(p.parcelNumber, s.id)}
                          aria-label={`Retirer ${s.name}`}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </li>
                    ))}
                  </ul>

                  <div className="flex items-center justify-between pt-1 text-xs">
                    <span className="text-muted-foreground">Sous-total</span>
                    <span className="font-semibold tabular-nums">${subtotal.toFixed(2)}</span>
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full h-8 text-xs"
                    onClick={() => {
                      trackEvent('cadastral_cart_pay_parcel', {
                        parcel_number: p.parcelNumber,
                        service_count: p.services.length,
                        subtotal_usd: subtotal,
                      });
                      setParcelNumber(p.parcelNumber);
                      setOpen(false);
                    }}
                  >
                    Payer cette parcelle
                  </Button>
                </div>
              );
            })}
          </div>
        </ScrollArea>

        <SheetFooter className="border-t pt-3 flex-col gap-2 sm:flex-col">
          <div className="flex items-center justify-between w-full text-sm">
            <span className="font-medium">Total</span>
            <span className="text-lg font-bold tabular-nums">${total.toFixed(2)}</span>
          </div>
          <p className="text-[11px] text-muted-foreground text-center">
            Le paiement se fait par parcelle. Sélectionnez une parcelle ci-dessus pour finaliser sa commande.
          </p>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
};

export default CadastralCartButton;

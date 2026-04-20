import React, { useState } from 'react';
import { ShoppingCart, Trash2, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetFooter } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useCadastralCart } from '@/hooks/useCadastralCart';

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
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          size="lg"
          className="fixed bottom-3 left-3 z-[1000] shadow-xl rounded-full h-14 pl-4 pr-5 gap-2"
          aria-label={`Panier cadastral : ${totalServices} service${totalServices > 1 ? 's' : ''}`}
        >
          <div className="relative">
            <ShoppingCart className="h-5 w-5" />
            <Badge
              variant="secondary"
              className="absolute -top-2 -right-2 h-5 min-w-5 px-1 text-[10px] flex items-center justify-center"
            >
              {totalServices}
            </Badge>
          </div>
          <span className="font-semibold tabular-nums">${total.toFixed(2)}</span>
        </Button>
      </SheetTrigger>

      <SheetContent side="left" className="w-full sm:max-w-md flex flex-col">
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

import React, { useState } from 'react';
import { Tag, Loader2, X, Check, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useDiscountCodes } from '@/hooks/useDiscountCodes';
import { useCartDiscounts } from '@/hooks/useCartDiscounts';
import { useToast } from '@/hooks/use-toast';
import { trackEvent } from '@/lib/analytics';
import { cn } from '@/lib/utils';

interface CartParcelDiscountInputProps {
  parcelNumber: string;
  /** Sous-total USD utilisé pour valider le code (sans services déjà acquis). */
  subtotal: number;
}

/**
 * Mini-input collapsible pour appliquer un code promo/CCC à une parcelle du panier.
 * Le code est mémorisé via `useCartDiscounts` et appliqué automatiquement par
 * `CadastralBillingPanel` lors du checkout.
 */
const CartParcelDiscountInput: React.FC<CartParcelDiscountInputProps> = ({ parcelNumber, subtotal }) => {
  const [expanded, setExpanded] = useState(false);
  const [code, setCode] = useState('');
  const [validating, setValidating] = useState(false);
  const { validateDiscountCode } = useDiscountCodes();
  const { get, set, clear } = useCartDiscounts();
  const { toast } = useToast();

  const applied = get(parcelNumber);

  const handleApply = async () => {
    const trimmed = code.trim().toUpperCase();
    if (!trimmed) return;
    setValidating(true);
    try {
      const validation = await validateDiscountCode(trimmed, subtotal);
      if (validation?.is_valid && validation.code_id) {
        set(parcelNumber, {
          code: trimmed,
          amount: validation.discount_amount,
          reseller_id: validation.reseller_id,
          code_id: validation.code_id,
        });
        trackEvent('cadastral_cart_promo_applied', {
          parcel_number: parcelNumber,
          code: trimmed,
          discount_usd: validation.discount_amount,
        });
        toast({
          title: 'Code appliqué',
          description: `Remise de $${validation.discount_amount.toFixed(2)} mémorisée pour cette parcelle.`,
        });
        setCode('');
      } else {
        toast({
          title: 'Code invalide',
          description: 'Ce code de remise n\'est pas valide ou a expiré.',
          variant: 'destructive',
        });
      }
    } finally {
      setValidating(false);
    }
  };

  if (applied) {
    return (
      <div className="flex items-center justify-between gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-1.5">
        <div className="flex items-center gap-1.5 min-w-0">
          <Check className="h-3 w-3 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span className="text-[11px] font-medium truncate">{applied.code}</span>
          <Badge variant="outline" className="h-4 px-1 text-[9px] border-emerald-500/40 text-emerald-700 dark:text-emerald-300 shrink-0">
            -${applied.amount.toFixed(2)}
          </Badge>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-5 w-5 shrink-0"
          onClick={() => clear(parcelNumber)}
          aria-label="Retirer le code"
        >
          <X className="h-3 w-3" />
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
      >
        <Tag className="h-3 w-3" />
        <span>J'ai un code promo / CCC</span>
        {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
      </button>
      {expanded && (
        <div className="flex gap-1.5">
          <Input
            type="text"
            placeholder="BIC-XXXX ou CCC-XXXX"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            onKeyDown={(e) => e.key === 'Enter' && handleApply()}
            className={cn('h-7 text-[11px] uppercase px-2 py-1')}
            disabled={validating}
          />
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-[11px] px-2 shrink-0"
            disabled={!code.trim() || validating}
            onClick={handleApply}
          >
            {validating ? <Loader2 className="h-3 w-3 animate-spin" /> : 'OK'}
          </Button>
        </div>
      )}
    </div>
  );
};

export default CartParcelDiscountInput;

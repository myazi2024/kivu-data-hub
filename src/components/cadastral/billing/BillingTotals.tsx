import React from 'react';
import { CheckCircle, CreditCard, Lock, Receipt } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import DiscountCodeInput from '../DiscountCodeInput';
import CurrencySelector from '@/components/payment/CurrencySelector';
import { formatCurrency } from '@/utils/formatters';
import { useTvaRate } from '@/hooks/useTvaRate';
import type { CurrencyCode } from '@/hooks/useCurrencyConfig';

interface AppliedDiscount {
  code: string;
  amount: number;
  reseller_id: string;
  code_id: string;
}

interface BillingTotalsProps {
  selectedCount: number;
  totalAmount: number;
  appliedDiscount: AppliedDiscount | null;
  onDiscountApplied: (d: AppliedDiscount | null) => void;
  currencies: any[];
  selectedCurrency: CurrencyCode;
  setSelectedCurrency: (c: CurrencyCode) => void;
  convertFromUsd: (n: number) => number;
  acceptedTerms: boolean;
  setAcceptedTerms: (v: boolean) => void;
  highlightTerms: boolean;
  loading: boolean;
  isSubmitting: boolean;
  isPaymentRequired: () => boolean;
  onProceed: () => void;
}

const BillingTotals: React.FC<BillingTotalsProps> = ({
  selectedCount,
  totalAmount,
  appliedDiscount,
  onDiscountApplied,
  currencies,
  selectedCurrency,
  setSelectedCurrency,
  convertFromUsd,
  acceptedTerms,
  setAcceptedTerms,
  highlightTerms,
  loading,
  isSubmitting,
  isPaymentRequired,
  onProceed,
}) => {
  const { rate: TVA_RATE, label: tvaLabel } = useTvaRate();
  const discountedAmount = appliedDiscount ? Math.max(0, totalAmount - appliedDiscount.amount) : totalAmount;
  const hasSelection = selectedCount > 0;

  return (
    <>
      {hasSelection && (
        <div className="rounded-xl border bg-muted/20 p-2.5">
          <div className="flex items-center gap-2 mb-2">
            <Receipt className="h-3 w-3 text-primary" />
            <span className="text-xs font-medium">Code de remise</span>
            <Badge variant="outline" className="text-[10px] px-1.5 py-0">Optionnel</Badge>
          </div>
          <DiscountCodeInput
            invoiceAmount={totalAmount}
            onDiscountApplied={onDiscountApplied}
            className="bg-background/50 border-border/50"
          />
        </div>
      )}

      {hasSelection && (
        <div className="space-y-2">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-muted-foreground">Devise d'affichage</span>
            <CurrencySelector
              currencies={currencies}
              selectedCurrency={selectedCurrency}
              onCurrencyChange={setSelectedCurrency}
            />
          </div>
          <div className="space-y-1 px-2.5 py-2 bg-muted/20 rounded-xl text-xs">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Sous-total ({selectedCount} service{selectedCount > 1 ? 's' : ''})</span>
              <span className="font-medium">{formatCurrency(convertFromUsd(totalAmount), selectedCurrency)}</span>
            </div>
            {appliedDiscount && (
              <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400">
                <span>Remise ({appliedDiscount.code})</span>
                <span>-{formatCurrency(convertFromUsd(appliedDiscount.amount), selectedCurrency)}</span>
              </div>
            )}
            <div className="flex items-center justify-between text-muted-foreground">
              <span>{tvaLabel || `TVA (${(TVA_RATE * 100).toFixed(0)}%)`}</span>
              <span>{formatCurrency(convertFromUsd(discountedAmount * TVA_RATE), selectedCurrency)}</span>
            </div>
          </div>

          <div className="flex items-center justify-between p-2.5 bg-primary/5 rounded-xl border border-primary/20">
            <span className="text-sm font-semibold">Total TTC</span>
            <div className="text-right">
              <div className="text-lg font-bold text-primary">
                {formatCurrency(convertFromUsd(discountedAmount * (1 + TVA_RATE)), selectedCurrency)}
              </div>
              {selectedCurrency !== 'USD' && (
                <div className="text-[10px] text-muted-foreground">
                  ≈ {formatCurrency(discountedAmount * (1 + TVA_RATE), 'USD')}
                </div>
              )}
              {appliedDiscount && (
                <div className="text-[10px] text-green-600 dark:text-green-400">
                  Économie: {formatCurrency(convertFromUsd(appliedDiscount.amount * (1 + TVA_RATE)), selectedCurrency)} TTC
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {hasSelection && (
        <div className={`
          p-2.5 rounded-xl border transition-all duration-300
          ${highlightTerms ? 'border-destructive bg-destructive/5' : 'border-border bg-muted/20'}
        `}>
          <div className="flex items-start gap-2">
            <Checkbox
              id="terms"
              checked={acceptedTerms}
              onCheckedChange={(checked) => setAcceptedTerms(checked === true)}
              className="mt-0.5 h-4 w-4"
            />
            <label
              htmlFor="terms"
              className={`text-xs leading-relaxed cursor-pointer ${highlightTerms ? 'text-destructive' : ''}`}
            >
              J'accepte les{' '}
              <a href="/legal" target="_blank" className="text-primary underline">
                conditions BIC
              </a>
              {' '}et confirme la commande.
            </label>
          </div>
        </div>
      )}

      <Button
        onClick={onProceed}
        disabled={selectedCount === 0 || loading || isSubmitting}
        className={`
          w-full h-10 text-sm font-semibold rounded-xl
          ${hasSelection && acceptedTerms
            ? 'bg-primary hover:bg-primary/90 shadow-sm'
            : hasSelection
              ? 'bg-muted-foreground/80'
              : 'opacity-50 cursor-not-allowed bg-muted'}
        `}
      >
        {loading ? (
          <div className="flex items-center gap-2">
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-background border-t-transparent" />
            <span>Traitement...</span>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            {!isPaymentRequired() ? <CheckCircle className="h-4 w-4" /> : <CreditCard className="h-4 w-4" />}
            <span>
              {selectedCount === 0
                ? 'Sélectionner des services'
                : !acceptedTerms
                  ? 'Accepter les conditions'
                  : !isPaymentRequired()
                    ? 'Accéder aux services'
                    : 'Payer'}
            </span>
            {hasSelection && acceptedTerms && <Lock className="h-3 w-3 ml-auto opacity-70" />}
          </div>
        )}
      </Button>

      {selectedCount === 0 && (
        <p className="text-center text-xs text-muted-foreground">Sélectionnez les services souhaités</p>
      )}
      {hasSelection && !acceptedTerms && (
        <p className="text-center text-xs text-amber-600 dark:text-amber-400">Validation des conditions requise</p>
      )}
      {!isPaymentRequired() && (
        <p className="text-[10px] text-muted-foreground/60 text-right mt-1">Accès gratuit</p>
      )}
    </>
  );
};

export default BillingTotals;

import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { CurrencyCode, CurrencyInfo } from '@/hooks/useCurrencyConfig';

interface CurrencySelectorProps {
  currencies: CurrencyInfo[];
  selectedCurrency: CurrencyCode;
  onCurrencyChange: (code: CurrencyCode) => void;
  className?: string;
}

const CurrencySelector: React.FC<CurrencySelectorProps> = ({
  currencies,
  selectedCurrency,
  onCurrencyChange,
  className = '',
}) => {
  if (currencies.length <= 1) return null;

  return (
    <Select value={selectedCurrency} onValueChange={(v) => onCurrencyChange(v as CurrencyCode)}>
      <SelectTrigger className={`h-7 w-[90px] text-xs border-border/30 bg-background/50 ${className}`}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {currencies.map(c => (
          <SelectItem key={c.currency_code} value={c.currency_code} className="text-xs">
            {c.symbol} {c.currency_code}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};

export default CurrencySelector;

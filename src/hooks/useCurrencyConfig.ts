import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';

export type CurrencyCode = 'USD' | 'CDF';

export interface CurrencyInfo {
  currency_code: CurrencyCode;
  currency_name: string;
  symbol: string;
  exchange_rate_to_usd: number;
  is_default: boolean;
}

export const useCurrencyConfig = () => {
  const [currencies, setCurrencies] = useState<CurrencyInfo[]>([]);
  const [selectedCurrency, setSelectedCurrency] = useState<CurrencyCode>('USD');
  const [loading, setLoading] = useState(true);

  const fetchCurrencies = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('currency_config')
        .select('currency_code, currency_name, symbol, exchange_rate_to_usd, is_default')
        .eq('is_active', true)
        .order('is_default', { ascending: false });

      if (error) throw error;

      const mapped = (data || []).map(c => ({
        ...c,
        currency_code: c.currency_code as CurrencyCode,
        exchange_rate_to_usd: Number(c.exchange_rate_to_usd),
      }));

      setCurrencies(mapped);
    } catch (error) {
      console.error('Error fetching currencies:', error);
      // Fallback
      setCurrencies([
        { currency_code: 'USD', currency_name: 'Dollar américain', symbol: '$', exchange_rate_to_usd: 1, is_default: true },
        { currency_code: 'CDF', currency_name: 'Franc congolais', symbol: 'FC', exchange_rate_to_usd: 2850, is_default: false },
      ]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCurrencies();

    const channel = supabase
      .channel('currency_config_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'currency_config' }, () => {
        fetchCurrencies();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [fetchCurrencies]);

  const exchangeRate = useMemo(() => {
    const found = currencies.find(c => c.currency_code === selectedCurrency);
    return found?.exchange_rate_to_usd ?? 1;
  }, [currencies, selectedCurrency]);

  const convertFromUsd = useCallback((amountUsd: number, currency?: CurrencyCode): number => {
    const code = currency || selectedCurrency;
    const found = currencies.find(c => c.currency_code === code);
    const rate = found?.exchange_rate_to_usd ?? 1;
    return amountUsd * rate;
  }, [currencies, selectedCurrency]);

  const currentCurrencyInfo = useMemo(() => {
    return currencies.find(c => c.currency_code === selectedCurrency) || currencies[0];
  }, [currencies, selectedCurrency]);

  return {
    currencies,
    selectedCurrency,
    setSelectedCurrency,
    exchangeRate,
    convertFromUsd,
    currentCurrencyInfo,
    loading,
  };
};

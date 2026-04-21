import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface CompanyLegalInfo {
  id: string;
  legal_name: string;
  trade_name: string | null;
  rccm: string;
  id_nat: string;
  nif: string;
  tva_number: string | null;
  tax_regime: string;
  legal_form: string | null;
  capital_amount: string | null;
  address_line1: string;
  address_line2: string | null;
  city: string;
  province: string;
  country: string;
  phone: string | null;
  email: string | null;
  website: string | null;
  logo_url: string | null;
  bank_name: string | null;
  bank_account: string | null;
  bank_swift: string | null;
}

const FALLBACK: CompanyLegalInfo = {
  id: 'fallback',
  legal_name: "Bureau d'Informations Cadastrales SARL",
  trade_name: 'BIC',
  rccm: 'CD/KIN/RCCM/24-B-00000',
  id_nat: '01-XXXX-XXXXX',
  nif: 'A0000000X',
  tva_number: 'TVA-XXXXXXXX',
  tax_regime: 'reel',
  legal_form: 'SARL',
  capital_amount: null,
  address_line1: 'Avenue à compléter',
  address_line2: null,
  city: 'Kinshasa',
  province: 'Kinshasa',
  country: 'République Démocratique du Congo',
  phone: '+243 000 000 000',
  email: 'contact@bic.cd',
  website: null,
  logo_url: null,
  bank_name: null,
  bank_account: null,
  bank_swift: null,
};

export function useCompanyLegalInfo() {
  const [info, setInfo] = useState<CompanyLegalInfo | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('company_legal_info')
        .select('*')
        .eq('is_active', true)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error || !data) setInfo(FALLBACK);
      else setInfo(data as CompanyLegalInfo);
    } catch {
      setInfo(FALLBACK);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let active = true;
    (async () => { if (active) await load(); })();
    return () => { active = false; };
  }, []);

  return { info: info || FALLBACK, loading, refetch: load };
}

export async function fetchCompanyLegalInfo(): Promise<CompanyLegalInfo> {
  try {
    const { data } = await supabase
      .from('company_legal_info')
      .select('*')
      .eq('is_active', true)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    return (data as CompanyLegalInfo) || FALLBACK;
  } catch {
    return FALLBACK;
  }
}

export const TAX_REGIME_LABELS: Record<string, string> = {
  reel: 'Régime du réel',
  forfaitaire: 'Régime forfaitaire',
  ipr: 'IPR',
  exonere: 'Exonéré',
};

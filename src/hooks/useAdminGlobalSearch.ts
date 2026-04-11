import { useState, useEffect, useMemo } from 'react';
import { useDebounce } from '@/hooks/useDebounce';
import { supabase } from '@/integrations/supabase/client';
import { Users, MapPin, FileText, ClipboardList, type LucideIcon } from 'lucide-react';

export interface SearchResult {
  id: string;
  type: 'user' | 'parcel' | 'invoice' | 'contribution';
  label: string;
  sublabel: string;
  icon: LucideIcon;
  url: string;
}

const TYPE_CONFIG: Record<SearchResult['type'], { icon: LucideIcon; groupLabel: string }> = {
  user: { icon: Users, groupLabel: 'Utilisateurs' },
  parcel: { icon: MapPin, groupLabel: 'Parcelles' },
  invoice: { icon: FileText, groupLabel: 'Factures' },
  contribution: { icon: ClipboardList, groupLabel: 'Contributions CCC' },
};

export function useAdminGlobalSearch(searchTerm: string) {
  const debouncedTerm = useDebounce(searchTerm.trim(), 300);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (debouncedTerm.length < 2) {
      setResults([]);
      return;
    }

    let cancelled = false;
    setIsLoading(true);

    const search = async () => {
      const term = `%${debouncedTerm}%`;

      const [usersRes, parcelsRes, invoicesRes, contributionsRes] = await Promise.all([
        supabase
          .from('profiles')
          .select('id, full_name, email')
          .or(`full_name.ilike.${term},email.ilike.${term}`)
          .limit(5),
        supabase
          .from('cadastral_parcels')
          .select('id, parcel_number, current_owner_name, location')
          .or(`parcel_number.ilike.${term},current_owner_name.ilike.${term}`)
          .is('deleted_at', null)
          .limit(5),
        supabase
          .from('cadastral_invoices')
          .select('id, invoice_number, client_email, parcel_number')
          .or(`invoice_number.ilike.${term},client_email.ilike.${term},parcel_number.ilike.${term}`)
          .limit(5),
        supabase
          .from('cadastral_contributions')
          .select('id, parcel_number, current_owner_name, status')
          .or(`parcel_number.ilike.${term},current_owner_name.ilike.${term}`)
          .limit(5),
      ]);

      if (cancelled) return;

      const mapped: SearchResult[] = [];

      usersRes.data?.forEach(u => mapped.push({
        id: u.id,
        type: 'user',
        label: u.full_name || u.email || 'Utilisateur',
        sublabel: u.email || '',
        icon: TYPE_CONFIG.user.icon,
        url: `/admin?tab=users`,
      }));

      parcelsRes.data?.forEach(p => mapped.push({
        id: p.id,
        type: 'parcel',
        label: p.parcel_number,
        sublabel: `${p.current_owner_name} — ${p.location}`,
        icon: TYPE_CONFIG.parcel.icon,
        url: `/admin?tab=cadastral-map`,
      }));

      invoicesRes.data?.forEach(i => mapped.push({
        id: i.id,
        type: 'invoice',
        label: i.invoice_number,
        sublabel: `${i.client_email} — ${i.parcel_number}`,
        icon: TYPE_CONFIG.invoice.icon,
        url: `/admin?tab=invoices`,
      }));

      contributionsRes.data?.forEach(c => mapped.push({
        id: c.id,
        type: 'contribution',
        label: c.parcel_number,
        sublabel: `${c.current_owner_name || 'N/A'} — ${c.status}`,
        icon: TYPE_CONFIG.contribution.icon,
        url: `/admin?tab=ccc`,
      }));

      setResults(mapped);
      setIsLoading(false);
    };

    search();
    return () => { cancelled = true; };
  }, [debouncedTerm]);

  const grouped = useMemo(() => {
    const groups: Record<string, { label: string; items: SearchResult[] }> = {};
    for (const r of results) {
      const key = r.type;
      if (!groups[key]) groups[key] = { label: TYPE_CONFIG[key].groupLabel, items: [] };
      groups[key].items.push(r);
    }
    return groups;
  }, [results]);

  return { results, grouped, isLoading, hasResults: results.length > 0 };
}

// Search history helpers
const HISTORY_KEY = 'admin-search-history';
const MAX_HISTORY = 5;

export function getSearchHistory(): string[] {
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
  } catch { return []; }
}

export function addToSearchHistory(term: string) {
  const trimmed = term.trim();
  if (!trimmed) return;
  const history = getSearchHistory().filter(h => h !== trimmed);
  history.unshift(trimmed);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(0, MAX_HISTORY)));
}

export function clearSearchHistory() {
  localStorage.removeItem(HISTORY_KEY);
}

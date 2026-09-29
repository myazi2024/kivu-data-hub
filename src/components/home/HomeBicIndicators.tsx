import { useEffect, useState } from 'react';
import { displayHomeCount, HOME_BIC_INDICATORS, validCount, type HomeBicCounts } from '@/lib/homeBicCounts';

export default function HomeBicIndicators({ configured }: { configured: Record<string, unknown> }) {
  const [counts, setCounts] = useState<HomeBicCounts | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    const baseUrl = import.meta.env.VITE_SUPABASE_URL;
    const publicKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
    if (!baseUrl || !publicKey) return () => controller.abort();
    fetch(`${baseUrl}/functions/v1/home-bic-counts`, {
      signal: controller.signal,
      headers: { apikey: publicKey },
    }).then(async response => {
      if (!response.ok) throw new Error('Indicateurs indisponibles');
      return response.json();
    }).then((result: HomeBicCounts) => {
      if (HOME_BIC_INDICATORS.every(({ countKey }) => validCount(result[countKey]) !== null)) setCounts(result);
    }).catch(() => { /* Keep the configured presentation figures if real counts are unavailable. */ });
    return () => controller.abort();
  }, []);

  return (
    <div className="grid grid-cols-3 gap-2 sm:gap-4 border-t border-primary-foreground/30 pt-3 sm:pt-5" aria-label="BIC en chiffres">
      {HOME_BIC_INDICATORS.map(({ key, countKey, label, defaultValue }) => (
        <div key={key} className="min-w-0">
          <strong className="block text-xl sm:text-3xl font-bold tabular-nums leading-tight text-primary-foreground">
            {displayHomeCount(counts?.[countKey], configured[key], defaultValue).toLocaleString('fr-FR')}
          </strong>
          <span className="block mt-1 text-[10px] sm:text-xs leading-snug text-primary-foreground/90 break-words">{label}</span>
        </div>
      ))}
    </div>
  );
}
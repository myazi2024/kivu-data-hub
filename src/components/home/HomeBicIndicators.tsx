import { useEffect, useState } from 'react';
import { displayHomeCount, HOME_BIC_INDICATORS, validCount, type HomeBicCounts } from '@/lib/homeBicCounts';

export default function HomeBicIndicators({ configured }: { configured: {
  hero_parcels_count?: number;
  hero_services_count?: number;
  hero_disputes_count?: number;
} }) {
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
    <div
      className="grid grid-cols-3 rounded-lg sm:rounded-xl border border-primary-foreground/25 bg-primary-foreground/10 backdrop-blur-md shadow-md overflow-hidden divide-x divide-y-0 divide-primary-foreground/15"
      aria-label="BIC en chiffres"
    >
      {HOME_BIC_INDICATORS.map(({ key, countKey, label, defaultValue }) => (
        <div
          key={key}
          className="flex flex-col items-center justify-center px-1.5 py-2 sm:px-6 sm:py-5 lg:py-2 text-center transition-colors hover:bg-primary-foreground/5"
        >
          <strong className="text-base sm:text-2xl lg:text-xl font-black tracking-tight tabular-nums leading-none text-primary-foreground">
            {displayHomeCount(counts?.[countKey], configured[key], defaultValue).toLocaleString('fr-FR')}
          </strong>
          <span className="mt-1 sm:mt-2 lg:mt-1 text-[7px] sm:text-[10px] lg:text-[8.5px] font-bold uppercase tracking-[0.12em] sm:tracking-[0.16em] leading-tight text-primary-foreground/70 break-words">
            {label}
          </span>
        </div>
      ))}
    </div>
  );
}

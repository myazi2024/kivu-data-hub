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
      className="flex flex-wrap items-baseline justify-center gap-x-2 gap-y-0.5 text-[9px] leading-none"
      aria-label="BIC en chiffres"
    >
      {HOME_BIC_INDICATORS.map(({ key, countKey, label, defaultValue }, index) => (
        <span key={key} className="flex items-baseline gap-1 whitespace-nowrap">
          {index > 0 && <span aria-hidden="true" className="text-muted-foreground/50 mr-1">·</span>}
          <strong className="font-semibold tabular-nums text-foreground/90">
            {displayHomeCount(counts?.[countKey], configured[key], defaultValue).toLocaleString('fr-FR')}
          </strong>
          <span className="text-muted-foreground">{label}</span>
        </span>
      ))}
    </div>
  );
}

import { displayHomeCount, HOME_BIC_INDICATORS, validCount } from '@/lib/homeBicCounts';
import { useHomeBicCounts } from '@/hooks/useHomeBicCounts';

export default function HomeBicIndicators({ configured }: { configured: {
  hero_parcels_count?: number;
  hero_services_count?: number;
  hero_disputes_count?: number;
} }) {
  const { data } = useHomeBicCounts();
  // Keep the configured presentation figures if real counts are incomplete.
  const counts = data && HOME_BIC_INDICATORS.every(({ countKey }) => validCount(data[countKey]) !== null) ? data : null;

  return (
    <div
      className="flex flex-wrap items-baseline justify-center gap-x-2 gap-y-0.5 text-[9px] leading-none"
      aria-label="BIC en chiffres"
    >
      {HOME_BIC_INDICATORS.map(({ key, countKey, label, defaultValue }, index) => (
        <span key={key} className="flex items-baseline gap-1 whitespace-nowrap">
          {index > 0 && <span aria-hidden="true" className="text-background/40 mr-1">·</span>}
          <strong className="font-semibold tabular-nums text-background/90">
            {displayHomeCount(counts?.[countKey], configured[key], defaultValue).toLocaleString('fr-FR')}
          </strong>
          <span className="text-background/55">{label}</span>
        </span>
      ))}
    </div>
  );
}

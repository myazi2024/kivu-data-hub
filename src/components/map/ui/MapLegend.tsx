import React from 'react';
import type { MapTabProfile, MapTier } from '@/config/mapTabProfiles';

interface MapLegendProps {
  activeProfile: MapTabProfile;
  adaptiveTiers: MapTier[] | null;
  hasAnyMetricData: boolean;
}

/** Profile-driven choropleth mini-legend (top-right of the map) */
export const MapLegend: React.FC<MapLegendProps> = ({ activeProfile, adaptiveTiers, hasAnyMetricData }) => {
  return (
    <div
      className="absolute top-2 right-2 z-50 bg-background/85 backdrop-blur-sm rounded-md px-2 py-1.5 border border-border/40 shadow-sm animate-fade-in max-w-[170px]"
      role="region"
      aria-live="polite"
      aria-label={`Légende : ${activeProfile.legendTitle}`}
    >
      <div className="text-[9px] font-semibold text-foreground mb-1 truncate">{activeProfile.legendTitle}</div>
      {hasAnyMetricData ? (
        <div className="flex flex-col gap-0.5">
          {(adaptiveTiers || activeProfile.tiers).map((t, i) => (
            <div key={i} className="flex items-center gap-1.5" role="img" aria-label={`Palier ${t.label} : de ${t.min} à ${t.max === Infinity ? '∞' : t.max}`}>
              <span className="inline-block h-2.5 w-2.5 rounded-sm border border-border/40" style={{ backgroundColor: t.color }} aria-hidden="true" />
              <span className="text-[9px] text-muted-foreground truncate">{t.label}</span>
            </div>
          ))}
          <div className="flex items-center gap-1.5 pt-0.5 mt-0.5 border-t border-border/30" role="img" aria-label="Aucune donnée disponible">
            <span className="inline-block h-2.5 w-2.5 rounded-sm border border-border/40" style={{ backgroundColor: 'hsl(var(--muted))' }} aria-hidden="true" />
            <span className="text-[9px] text-muted-foreground italic truncate">Aucune donnée</span>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-1.5" role="img" aria-label="Aucune occurrence pour ce profil">
          <span className="inline-block h-2.5 w-2.5 rounded-sm border border-border/40" style={{ backgroundColor: 'hsl(var(--muted))' }} aria-hidden="true" />
          <span className="text-[9px] text-muted-foreground italic">Aucune occurrence pour ce profil</span>
        </div>
      )}
    </div>
  );
};

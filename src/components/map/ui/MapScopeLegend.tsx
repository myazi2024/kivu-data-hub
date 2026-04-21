import React from 'react';

interface ProfileLine {
  label: string;
  value: string;
  color?: string;
}

interface MapScopeLegendProps {
  scopeLabel: string;
  profileLines?: ProfileLine[];
  fallbackStats?: {
    certEnregCount: number;
    titleRequestsCount: number;
    disputesCount: number;
    avgParcelSurfaceSqm: number;
  };
  formatNumber: (n: number) => string;
}

/** Bottom-left scope legend overlay shown when a province is selected */
export const MapScopeLegend: React.FC<MapScopeLegendProps> = ({
  scopeLabel,
  profileLines,
  fallbackStats,
  formatNumber,
}) => {
  return (
    <div className="absolute bottom-5 left-2 z-10 bg-background/80 backdrop-blur-sm rounded px-1.5 py-1 border border-border/30 animate-fade-in max-w-[140px]">
      <div className="text-[10px] font-medium text-foreground mb-0.5 truncate">{scopeLabel}</div>
      <div className="flex flex-col gap-0.5 text-[10px] text-muted-foreground">
        {profileLines
          ? profileLines.map((s, i) => (
              <div key={i} className="flex justify-between gap-2">
                <span className="truncate">{s.label}</span>
                <span className={`font-medium ${s.color || 'text-foreground'}`}>{s.value}</span>
              </div>
            ))
          : fallbackStats && (
              <>
                <div className="flex justify-between gap-2"><span>Certif. enreg.</span><span className="font-medium text-foreground">{formatNumber(fallbackStats.certEnregCount)}</span></div>
                <div className="flex justify-between gap-2"><span>Titres dem.</span><span className="font-medium text-foreground">{formatNumber(fallbackStats.titleRequestsCount)}</span></div>
                <div className="flex justify-between gap-2"><span>Litiges</span><span className="font-medium text-foreground">{formatNumber(fallbackStats.disputesCount)}</span></div>
                <div className="flex justify-between gap-2"><span>Sup. moy.</span><span className="font-medium text-foreground">{fallbackStats.avgParcelSurfaceSqm > 0 ? `${fallbackStats.avgParcelSurfaceSqm} m²` : '—'}</span></div>
              </>
            )}
      </div>
      <div className="mt-0.5 pt-0.5 border-t border-border/20 text-[8px] text-muted-foreground/70 italic" title="Quartiers : OpenStreetMap / HDX — ODbL">
        Quartiers © OSM / HDX
      </div>
    </div>
  );
};

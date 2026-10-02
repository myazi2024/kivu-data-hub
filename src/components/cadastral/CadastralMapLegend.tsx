import { AlertTriangle, HelpCircle, MapPin, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import type { MapConfig } from '@/hooks/useMapConfig';

interface CadastralMapLegendProps {
  legend?: MapConfig['legend'];
  hasRoadSides: boolean;
  hasBuildings: boolean;
  hasCalculatedSides: boolean;
  hasMissingHeight: boolean;
  hasSubdividedParcels: boolean;
  hasLots: boolean;
}

const icons: Record<string, React.ReactNode> = {
  bornage_gps: <span className="h-3 w-3 shrink-0 border-2 border-primary bg-primary/15" />,
  sans_bornage: <MapPin className="h-3 w-3 shrink-0 text-primary" />,
  limites: <span className="w-3 shrink-0 border-t-2 border-primary" />,
  dimensions: <span className="shrink-0 border border-primary bg-background px-0.5 text-[8px] font-bold text-primary">12 m</span>,
  incompletes: <AlertTriangle className="h-3 w-3 shrink-0 text-warning" />,
  favorite: <Star className="h-3 w-3 shrink-0 fill-warning text-warning" />,
};

export default function CadastralMapLegend({ legend, hasRoadSides, hasBuildings, hasCalculatedSides, hasMissingHeight, hasSubdividedParcels, hasLots }: CadastralMapLegendProps) {
  if (legend?.enabled === false) return null;
  const items = (legend?.items ?? []).filter(item => item.enabled);
  const additional = [
    ...(hasSubdividedParcels ? [{ key: 'subdivided', label: 'Parcelle lotie', symbol: <span className="w-4 shrink-0 border-t-2 border-dashed border-muted-foreground" /> }] : []),
    ...(hasLots ? [{ key: 'lot', label: 'Lot de lotissement (contour pointillé)', symbol: <span className="w-4 shrink-0 border-t-2 border-dashed border-primary" /> }] : []),
    ...(hasRoadSides ? [{ key: 'road', label: 'Côté donnant sur une voie déclarée · numéro du côté', symbol: <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-primary bg-background text-[9px] font-bold text-primary">1</span> }] : []),
    ...(hasBuildings ? [
      { key: 'building', label: 'Emprise d’une construction déclarée', symbol: <span className="h-3 w-4 shrink-0 border-2 border-primary bg-primary/20" /> },
      { key: 'side', label: 'Longueur d’un côté de construction', symbol: <span className="shrink-0 rounded-sm border border-primary bg-background px-0.5 text-[8px]">5 m</span> },
      { key: 'height', label: '1 · H 6 m : construction n° 1, hauteur', symbol: <span className="shrink-0 rounded-sm bg-primary px-0.5 text-[8px] text-primary-foreground">H</span> },
    ] : []),
    ...(hasCalculatedSides ? [{ key: 'estimate', label: '≈ : longueur calculée depuis les coordonnées', symbol: <span className="shrink-0 text-xs font-semibold text-primary">≈</span> }] : []),
    ...(hasMissingHeight ? [{ key: 'unknown', label: 'H — : hauteur non renseignée', symbol: <span className="shrink-0 text-xs font-semibold text-primary">—</span> }] : []),
  ];
  if (items.length === 0 && additional.length === 0) return null;

  const content = (mobile: boolean) => (
    <div className="space-y-1.5" aria-label="Légende de la carte cadastrale">
      <p className="text-[10px] font-semibold uppercase text-foreground">Légende</p>
      {items.map(item => (
        <div key={item.key} className="flex items-start gap-2 text-[10px] leading-4">
          <span className="flex h-4 w-5 shrink-0 items-center justify-center">{icons[item.key]}</span>
          <span className="text-muted-foreground">{mobile ? item.mobileLabel || item.label : item.label}</span>
        </div>
      ))}
      {additional.length > 0 && <div className="border-t border-border pt-1.5 space-y-1.5">
        {additional.map(item => (
          <div key={item.key} className="flex items-start gap-2 text-[10px] leading-4">
            <span className="flex h-4 w-5 shrink-0 items-center justify-center">{item.symbol}</span>
            <span className="text-muted-foreground">{item.label}</span>
          </div>
        ))}
      </div>}
    </div>
  );

  return <>
    <div className="absolute right-3 top-3 z-[800] hidden max-h-[calc(100dvh-8rem)] w-56 overflow-y-auto rounded-md border border-border bg-background/95 p-2.5 shadow-lg backdrop-blur-md md:block">
      {content(false)}
    </div>
    <div className="absolute right-3 top-[8rem] z-[800] md:hidden">
      <Popover>
        <PopoverTrigger asChild><Button variant="secondary" size="sm" className="h-9 w-9 p-0 shadow-lg" aria-label="Afficher la légende"><HelpCircle className="h-4 w-4" /></Button></PopoverTrigger>
        <PopoverContent side="left" align="start" sideOffset={8} className="max-h-[min(70dvh,440px)] w-56 overflow-y-auto rounded-md p-2.5">{content(true)}</PopoverContent>
      </Popover>
    </div>
  </>;
}
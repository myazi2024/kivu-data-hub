import { Building2, Ruler } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { PublicBuilding } from '@/lib/parcelBuildings';

interface Props {
  buildings: PublicBuilding[];
  selectedBuilding: number | null;
  onSelectBuilding: (index: number | null) => void;
}

export default function ParcelBuildingsDetails({ buildings, selectedBuilding, onSelectBuilding }: Props) {
  if (buildings.length === 0) return null;
  return (
    <section aria-label="Constructions de la parcelle" className="border-t border-border pt-3 mb-3">
      <div className="flex items-center gap-2 mb-2">
        <Building2 className="h-4 w-4 text-primary" aria-hidden="true" />
        <h3 className="text-xs font-semibold text-foreground">Constructions</h3>
        <span className="ml-auto text-[10px] text-muted-foreground">{buildings.length}</span>
      </div>
      <div className="space-y-2">
        {buildings.map((building, position) => {
          const active = selectedBuilding === position;
          return (
            <div key={position} className="border-l-2 border-primary bg-muted/30 px-2.5 py-2">
              <div className="flex items-center gap-2">
                <Button type="button" variant={active ? 'default' : 'outline'} size="sm"
                  className="h-7 w-7 shrink-0 p-0 text-xs" aria-pressed={active}
                  aria-label={`Repérer la construction ${building.index + 1} sur la carte`}
                  onClick={() => onSelectBuilding(active ? null : position)}>{building.index + 1}</Button>
                <span className="text-xs font-semibold text-foreground">
                  {building.index === 0 ? 'Construction principale' : `Construction ${building.index + 1}`}
                </span>
                <span className="ml-auto text-[11px] font-medium text-foreground whitespace-nowrap">
                  H · {building.heightM === null ? 'Non renseignée' : `${building.heightM.toLocaleString('fr-FR')} m`}
                </span>
              </div>
              <div className="mt-2 flex items-start gap-1.5 text-muted-foreground">
                <Ruler className="h-3.5 w-3.5 shrink-0 mt-0.5" aria-hidden="true" />
                <div className="flex flex-wrap gap-x-2 gap-y-1 text-[11px]">
                  {building.sides.map((side, index) => (
                    <span key={index} title={side.calculated ? 'Longueur calculée depuis les coordonnées' : 'Longueur déclarée'}>
                      C{index + 1} <strong className="text-foreground font-medium">{side.lengthM === null ? 'Non renseigné' : `${side.calculated ? '≈ ' : ''}${side.lengthM.toLocaleString('fr-FR', { maximumFractionDigits: 1 })} m`}</strong>
                    </span>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
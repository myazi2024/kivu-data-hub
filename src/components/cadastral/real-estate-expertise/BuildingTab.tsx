import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Building, Building2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import SectionHelpPopover from '../SectionHelpPopover';
import { ROOF_MATERIAL_OPTIONS, WINDOW_TYPE_OPTIONS, FLOOR_MATERIAL_OPTIONS } from './constants';

export interface BuildingTabProps {
  showBuildingBlocks: boolean;
  isMultiBuilding: boolean;
  buildingsToDescribe: { ref: string; label: string }[];
  activeFicheRef: string;
  onSelectFiche: (ref: string) => void;
  roofMaterial: string;
  setRoofMaterial: (value: string) => void;
  windowType: string;
  setWindowType: (value: string) => void;
  floorMaterial: string;
  setFloorMaterial: (value: string) => void;
  hasPlaster: boolean;
  setHasPlaster: (value: boolean) => void;
  hasPainting: boolean;
  setHasPainting: (value: boolean) => void;
  hasCeiling: boolean;
  setHasCeiling: (value: boolean) => void;
  hasDoubleGlazing: boolean;
  setHasDoubleGlazing: (value: boolean) => void;
}

const BuildingTab: React.FC<BuildingTabProps> = ({
  showBuildingBlocks,
  isMultiBuilding,
  buildingsToDescribe,
  activeFicheRef,
  onSelectFiche,
  roofMaterial,
  setRoofMaterial,
  windowType,
  setWindowType,
  floorMaterial,
  setFloorMaterial,
  hasPlaster,
  setHasPlaster,
  hasPainting,
  setHasPainting,
  hasCeiling,
  setHasCeiling,
  hasDoubleGlazing,
  setHasDoubleGlazing,
}) => (
  <>
    {!showBuildingBlocks && (
      <Card className="border rounded-xl">
        <CardContent className="p-3">
          <p className="text-xs text-muted-foreground">
            Aucune construction n'est concernée par cette expertise : il n'y a pas de matériaux à décrire.
          </p>
        </CardContent>
      </Card>
    )}
    {showBuildingBlocks && (
      <>
        {isMultiBuilding && (
          <Card className="border-2 border-primary/20 bg-primary/5 rounded-xl">
            <CardContent className="p-3 space-y-2">
              <h4 className="text-sm font-semibold flex items-center gap-2">
                <Building2 className="h-4 w-4 text-primary" />
                Fiche par construction
              </h4>
              <div className="flex flex-wrap gap-1.5">
                {buildingsToDescribe.map((b, i) => (
                  <button
                    key={b.ref}
                    type="button"
                    onClick={() => onSelectFiche(b.ref)}
                    className={cn(
                      'px-2.5 py-1.5 rounded-xl border-2 text-[11px] font-medium transition-colors',
                      activeFicheRef === b.ref
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border bg-background hover:border-primary/50',
                    )}
                  >
                    {i + 1}. {b.label}
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
        <Card className="border rounded-xl">
          <CardContent className="p-3 space-y-3">
            <h4 className="text-sm font-semibold flex items-center gap-2">
              <Building className="h-4 w-4 text-muted-foreground" />
              Matériaux & finitions
              <SectionHelpPopover
                title="Matériaux & finitions"
                description="Précisez les matériaux utilisés pour la toiture, les fenêtres et le sol. Les matériaux de murs/élévation sont définis dans le bloc Construction de l'onglet Général."
              />
            </h4>

            <div className="space-y-1.5">
              <Label className="text-xs">Toiture</Label>
              <Select value={roofMaterial} onValueChange={setRoofMaterial}>
                <SelectTrigger className="h-9 text-sm rounded-xl border-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ROOF_MATERIAL_OPTIONS.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Fenêtres</Label>
              <Select value={windowType} onValueChange={setWindowType}>
                <SelectTrigger className="h-9 text-sm rounded-xl border-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {WINDOW_TYPE_OPTIONS.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Sol / Revêtement</Label>
              <Select value={floorMaterial} onValueChange={setFloorMaterial}>
                <SelectTrigger className="h-9 text-sm rounded-xl border-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FLOOR_MATERIAL_OPTIONS.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Separator className="my-2" />

            <h5 className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
              Finitions
              <SectionHelpPopover
                title="Finitions"
                description="Indiquez l'état des finitions intérieures : crépi, peinture, plafond et isolation. Des finitions de qualité augmentent significativement la valeur du bien."
              />
            </h5>
            <div className="grid grid-cols-3 gap-2">
              <div className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted/50">
                <Checkbox checked={hasPlaster} onCheckedChange={(c) => setHasPlaster(c === true)} />
                <span className="text-sm">Crépi</span>
              </div>
              <div className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted/50">
                <Checkbox checked={hasPainting} onCheckedChange={(c) => setHasPainting(c === true)} />
                <span className="text-sm">Peinture</span>
              </div>
              <div className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted/50">
                <Checkbox checked={hasCeiling} onCheckedChange={(c) => setHasCeiling(c === true)} />
                <span className="text-sm">Plafond</span>
              </div>
            </div>

            <div className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted/50">
              <Checkbox checked={hasDoubleGlazing} onCheckedChange={(c) => setHasDoubleGlazing(c === true)} />
              <span className="text-sm">Double vitrage (isolation phonique)</span>
            </div>
          </CardContent>
        </Card>
      </>
    )}
  </>
);

export default BuildingTab;

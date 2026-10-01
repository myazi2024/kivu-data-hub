import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertTriangle } from 'lucide-react';
import SectionHelpPopover from '../SectionHelpPopover';
import SuggestivePicklist from '../SuggestivePicklist';
import { ROAD_ACCESS_OPTIONS } from './constants';

export interface EnvironmentTabProps {
  roadAccessType: string;
  setRoadAccessType: (value: string) => void;
  distanceToMainRoad: string;
  distanceToHospital: string;
  distanceToSchool: string;
  distanceToMarket: string;
  onNonNegativeChange: (setter: (value: string) => void) => (e: React.ChangeEvent<HTMLInputElement>) => void;
  setDistanceToMainRoad: (value: string) => void;
  setDistanceToHospital: (value: string) => void;
  setDistanceToSchool: (value: string) => void;
  setDistanceToMarket: (value: string) => void;
  nearbyAmenities: string[];
  setNearbyAmenities: (values: string[]) => void;
  floodRiskZone: boolean;
  setFloodRiskZone: (value: boolean) => void;
  erosionRiskZone: boolean;
  setErosionRiskZone: (value: boolean) => void;
}

const EnvironmentTab: React.FC<EnvironmentTabProps> = ({
  roadAccessType,
  setRoadAccessType,
  distanceToMainRoad,
  distanceToHospital,
  distanceToSchool,
  distanceToMarket,
  onNonNegativeChange,
  setDistanceToMainRoad,
  setDistanceToHospital,
  setDistanceToSchool,
  setDistanceToMarket,
  nearbyAmenities,
  setNearbyAmenities,
  floodRiskZone,
  setFloodRiskZone,
  erosionRiskZone,
  setErosionRiskZone,
}) => (
  <>
    <Card className="border rounded-xl">
      <CardContent className="p-3 space-y-3">
        <h4 className="text-sm font-semibold flex items-center gap-2">
          Accessibilité & distances
          <SectionHelpPopover
            title="Accessibilité & distances"
            description="Indiquez les distances vers les services essentiels (hôpital, école, marché) et le type d'accès routier. La proximité des commodités augmente la valeur du bien."
          />
        </h4>

        <div className="space-y-1.5">
          <Label className="text-xs">Type d'accès routier</Label>
          <Select value={roadAccessType} onValueChange={setRoadAccessType}>
            <SelectTrigger className="h-9 text-sm rounded-xl border-2">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ROAD_ACCESS_OPTIONS.map(opt => (
                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Route principale (m)</Label>
            <Input
              type="number"
              min="0"
              value={distanceToMainRoad}
              onChange={onNonNegativeChange(setDistanceToMainRoad)}
              placeholder="Ex: 50"
              className="h-9 text-sm rounded-xl border-2"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Hôpital (km)</Label>
            <Input
              type="number"
              min="0"
              value={distanceToHospital}
              onChange={onNonNegativeChange(setDistanceToHospital)}
              placeholder="Ex: 2"
              className="h-9 text-sm rounded-xl border-2"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">École (km)</Label>
            <Input
              type="number"
              min="0"
              value={distanceToSchool}
              onChange={onNonNegativeChange(setDistanceToSchool)}
              placeholder="Ex: 1"
              className="h-9 text-sm rounded-xl border-2"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Marché (km)</Label>
            <Input
              type="number"
              min="0"
              value={distanceToMarket}
              onChange={onNonNegativeChange(setDistanceToMarket)}
              placeholder="Ex: 0.5"
              className="h-9 text-sm rounded-xl border-2"
            />
          </div>
        </div>

        <SuggestivePicklist
          picklistKey="nearby_amenities"
          label="Commodités à proximité"
          placeholder="Rechercher ou ajouter..."
          selectedValues={nearbyAmenities}
          onSelectionChange={setNearbyAmenities}
        />
      </CardContent>
    </Card>

    <Card className="border rounded-xl border-amber-200 bg-amber-50/30 dark:border-amber-800 dark:bg-amber-950/20">
      <CardContent className="p-3 space-y-3">
        <h4 className="text-sm font-semibold flex items-center gap-2 text-amber-700 dark:text-amber-400">
          <AlertTriangle className="h-4 w-4" />
          Zones à risque
          <SectionHelpPopover
            title="Zones à risque"
            description="Signalez si le bien se trouve dans une zone inondable ou d'érosion. Ces facteurs de risque sont pris en compte dans l'évaluation et peuvent réduire la valeur estimée."
          />
        </h4>

        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <Checkbox checked={floodRiskZone} onCheckedChange={(c) => setFloodRiskZone(c === true)} />
            <span className="text-sm text-amber-700 dark:text-amber-300">Zone inondable</span>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox checked={erosionRiskZone} onCheckedChange={(c) => setErosionRiskZone(c === true)} />
            <span className="text-sm text-amber-700 dark:text-amber-300">Zone d'érosion</span>
          </div>
        </div>
      </CardContent>
    </Card>
  </>
);

export default EnvironmentTab;

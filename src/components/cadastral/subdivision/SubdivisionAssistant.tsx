import React, { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Wand2, Grid3X3, LayoutGrid, Rows, Columns, Info, Check, 
  Sparkles, ArrowRight, Zap, Target, RefreshCw
} from 'lucide-react';
import { LotData, SideDimension, ParentParcelData } from './types';

interface SubdivisionAssistantProps {
  parentParcel: ParentParcelData;
  onGenerateLots: (lots: LotData[]) => void;
  existingLots?: LotData[];
}

type LayoutType = 'grid' | 'horizontal' | 'vertical' | 'custom';
type UsageType = 'residential' | 'commercial' | 'industrial' | 'agricultural' | 'mixed';

interface LayoutOption {
  id: LayoutType;
  name: string;
  description: string;
  icon: React.ReactNode;
  minLots: number;
  maxLots: number;
}

const LAYOUT_OPTIONS: LayoutOption[] = [
  { 
    id: 'grid', 
    name: 'Grille', 
    description: 'Lots répartis en grille régulière',
    icon: <Grid3X3 className="h-5 w-5" />,
    minLots: 4,
    maxLots: 100
  },
  { 
    id: 'horizontal', 
    name: 'Bandes horizontales', 
    description: 'Lots alignés horizontalement',
    icon: <Rows className="h-5 w-5" />,
    minLots: 2,
    maxLots: 50
  },
  { 
    id: 'vertical', 
    name: 'Bandes verticales', 
    description: 'Lots alignés verticalement',
    icon: <Columns className="h-5 w-5" />,
    minLots: 2,
    maxLots: 50
  },
  { 
    id: 'custom', 
    name: 'Personnalisé', 
    description: 'Définir manuellement chaque lot',
    icon: <LayoutGrid className="h-5 w-5" />,
    minLots: 2,
    maxLots: 200
  }
];

const USAGE_TYPES: { id: UsageType; name: string; color: string }[] = [
  { id: 'residential', name: 'Résidentiel', color: 'bg-green-500' },
  { id: 'commercial', name: 'Commercial', color: 'bg-blue-500' },
  { id: 'industrial', name: 'Industriel', color: 'bg-amber-500' },
  { id: 'agricultural', name: 'Agricole', color: 'bg-lime-500' },
  { id: 'mixed', name: 'Mixte', color: 'bg-purple-500' }
];

export const SubdivisionAssistant: React.FC<SubdivisionAssistantProps> = ({
  parentParcel,
  onGenerateLots,
  existingLots = []
}) => {
  const [selectedLayout, setSelectedLayout] = useState<LayoutType>('grid');
  const [numberOfLots, setNumberOfLots] = useState<number>(4);
  const [defaultUsage, setDefaultUsage] = useState<UsageType>('residential');
  const [internalRoadWidth, setInternalRoadWidth] = useState<number>(6);
  const [includeInternalRoads, setIncludeInternalRoads] = useState<boolean>(true);
  const [lotAspectRatio, setLotAspectRatio] = useState<number>(1.5); // Longueur/Largeur
  const [isGenerating, setIsGenerating] = useState(false);

  // Calculer les dimensions de la parcelle mère
  const parentDimensions = useMemo(() => {
    if (!parentParcel.sides || parentParcel.sides.length < 4) {
      // Estimer à partir de la surface (parcelle carrée par défaut)
      const sideLength = Math.sqrt(parentParcel.area);
      return {
        width: sideLength,
        height: sideLength,
        isEstimated: true
      };
    }
    
    // Utiliser les dimensions réelles (Nord/Sud = largeur, Est/Ouest = hauteur)
    const sides = parentParcel.sides;
    const northSouth = sides.find(s => 
      s.id?.includes('north') || s.id?.includes('nord') || 
      sides.indexOf(s) === 0 || sides.indexOf(s) === 2
    );
    const eastWest = sides.find(s => 
      s.id?.includes('east') || s.id?.includes('est') || 
      sides.indexOf(s) === 1 || sides.indexOf(s) === 3
    );
    
    return {
      width: Math.max(sides[0]?.length || 0, sides[2]?.length || 0) || Math.sqrt(parentParcel.area),
      height: Math.max(sides[1]?.length || 0, sides[3]?.length || 0) || Math.sqrt(parentParcel.area),
      isEstimated: false
    };
  }, [parentParcel]);

  // Calculer la surface disponible après routes internes
  const availableArea = useMemo(() => {
    if (!includeInternalRoads) return parentParcel.area;
    
    // Estimer la surface occupée par les routes (approximation)
    const roadArea = numberOfLots > 1 
      ? (Math.ceil(Math.sqrt(numberOfLots)) - 1) * internalRoadWidth * 
        Math.max(parentDimensions.width, parentDimensions.height)
      : 0;
    
    return Math.max(parentParcel.area - roadArea, parentParcel.area * 0.7);
  }, [parentParcel.area, numberOfLots, internalRoadWidth, includeInternalRoads, parentDimensions]);

  // Surface moyenne par lot
  const avgLotArea = useMemo(() => {
    return availableArea / numberOfLots;
  }, [availableArea, numberOfLots]);

  // Générer la disposition des lots
  const generateLotLayout = () => {
    setIsGenerating(true);
    
    setTimeout(() => {
      const lots: LotData[] = [];
      
      const { width: parentWidth, height: parentHeight } = parentDimensions;
      const roadOffset = includeInternalRoads ? internalRoadWidth : 0;
      
      // Calculer la grille en fonction du layout
      let cols: number, rows: number;
      
      switch (selectedLayout) {
        case 'horizontal':
          cols = numberOfLots;
          rows = 1;
          break;
        case 'vertical':
          cols = 1;
          rows = numberOfLots;
          break;
        case 'grid':
        default:
          // Optimiser la grille en fonction de la forme de la parcelle
          const aspectRatio = parentWidth / parentHeight;
          cols = Math.max(1, Math.round(Math.sqrt(numberOfLots * aspectRatio)));
          rows = Math.ceil(numberOfLots / cols);
          break;
      }
      
      // Dimensions de chaque lot
      const lotWidth = (parentWidth - (cols - 1) * roadOffset) / cols;
      const lotHeight = (parentHeight - (rows - 1) * roadOffset) / rows;
      
      let lotIndex = 0;
      for (let row = 0; row < rows && lotIndex < numberOfLots; row++) {
        for (let col = 0; col < cols && lotIndex < numberOfLots; col++) {
          const lotNumber = `LOT-${String(lotIndex + 1).padStart(3, '0')}`;
          
          // Position du lot
          const x = col * (lotWidth + roadOffset) + lotWidth / 2;
          const y = row * (lotHeight + roadOffset) + lotHeight / 2;
          
          // Créer les côtés du lot
          const sides: SideDimension[] = [
            { id: crypto.randomUUID(), length: lotWidth, angle: 90, isShared: row > 0, isRoadBordering: row === 0, roadType: row === 0 && col === 0 ? 'existing' : 'none' },
            { id: crypto.randomUUID(), length: lotHeight, angle: 90, isShared: col < cols - 1 || (col === cols - 1 && lotIndex < numberOfLots - 1), isRoadBordering: col === cols - 1, roadType: col === cols - 1 ? 'existing' : 'none' },
            { id: crypto.randomUUID(), length: lotWidth, angle: 90, isShared: row < rows - 1, isRoadBordering: row === rows - 1, roadType: row === rows - 1 ? 'existing' : 'none' },
            { id: crypto.randomUUID(), length: lotHeight, angle: 90, isShared: col > 0, isRoadBordering: col === 0, roadType: col === 0 ? 'existing' : 'none' }
          ];
          
          // Ajouter les infos de route interne si applicable
          if (includeInternalRoads) {
            if (row > 0) {
              sides[0].roadType = 'created';
              sides[0].roadWidth = internalRoadWidth;
              sides[0].roadName = `Voie ${row}`;
            }
            if (col > 0) {
              sides[3].roadType = 'created';
              sides[3].roadWidth = internalRoadWidth;
              sides[3].roadName = `Allée ${col}`;
            }
          }
          
          const lot: LotData = {
            id: crypto.randomUUID(),
            lotNumber,
            sides,
            numberOfSides: 4,
            position: { x, y },
            rotation: 0,
            areaSqm: Math.round(lotWidth * lotHeight),
            perimeter: Math.round(2 * (lotWidth + lotHeight)),
            isBuilt: false,
            hasFence: false,
            intendedUse: defaultUsage,
            color: USAGE_TYPES.find(u => u.id === defaultUsage)?.color
          };
          
          lots.push(lot);
          lotIndex++;
        }
      }
      
      onGenerateLots(lots);
      setIsGenerating(false);
    }, 500);
  };

  return (
    <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <Wand2 className="h-4 w-4 text-primary" />
          </div>
          Assistant de création de lotissement
          <Badge variant="secondary" className="ml-auto text-xs">
            <Sparkles className="h-3 w-3 mr-1" />
            Automatique
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Info parcelle mère */}
        <div className="p-3 bg-muted/50 rounded-lg border">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Parcelle mère:</span>
            <span className="font-medium">{parentParcel.area.toLocaleString()} m²</span>
          </div>
          {parentDimensions.isEstimated ? (
            <div className="flex items-center gap-1 text-xs text-amber-600 mt-1">
              <Info className="h-3 w-3" />
              Dimensions estimées (carrée)
            </div>
          ) : (
            <div className="text-xs text-muted-foreground mt-1">
              ≈ {Math.round(parentDimensions.width)}m × {Math.round(parentDimensions.height)}m
            </div>
          )}
        </div>

        {/* Type de disposition */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Type de disposition</Label>
          <div className="grid grid-cols-2 gap-2">
            {LAYOUT_OPTIONS.map((layout) => (
              <button
                key={layout.id}
                onClick={() => setSelectedLayout(layout.id)}
                className={`p-3 rounded-lg border-2 transition-all text-left ${
                  selectedLayout === layout.id 
                    ? 'border-primary bg-primary/5' 
                    : 'border-muted hover:border-primary/30'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className={selectedLayout === layout.id ? 'text-primary' : 'text-muted-foreground'}>
                    {layout.icon}
                  </span>
                  <span className="font-medium text-sm">{layout.name}</span>
                </div>
                <p className="text-xs text-muted-foreground">{layout.description}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Nombre de lots */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium">Nombre de lots</Label>
            <Input
              type="number"
              value={numberOfLots}
              onChange={(e) => setNumberOfLots(Math.max(2, parseInt(e.target.value) || 2))}
              className="w-20 h-8 text-center"
              min={2}
              max={100}
            />
          </div>
          <Slider
            value={[numberOfLots]}
            onValueChange={([value]) => setNumberOfLots(value)}
            min={2}
            max={Math.min(50, Math.floor(parentParcel.area / 100))}
            step={1}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>2 lots</span>
            <span>{Math.min(50, Math.floor(parentParcel.area / 100))} lots</span>
          </div>
        </div>

        {/* Usage par défaut */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Usage prévu (par défaut)</Label>
          <Select value={defaultUsage} onValueChange={(v: UsageType) => setDefaultUsage(v)}>
            <SelectTrigger className="h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {USAGE_TYPES.map((usage) => (
                <SelectItem key={usage.id} value={usage.id}>
                  <div className="flex items-center gap-2">
                    <div className={`h-3 w-3 rounded-full ${usage.color}`} />
                    {usage.name}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Options routes internes */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium">Voies internes</Label>
            <button
              onClick={() => setIncludeInternalRoads(!includeInternalRoads)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                includeInternalRoads 
                  ? 'bg-primary text-primary-foreground' 
                  : 'bg-muted text-muted-foreground'
              }`}
            >
              {includeInternalRoads ? 'Incluses' : 'Non incluses'}
            </button>
          </div>
          
          {includeInternalRoads && (
            <div className="flex items-center gap-2">
              <Label className="text-xs text-muted-foreground">Largeur des voies:</Label>
              <Input
                type="number"
                value={internalRoadWidth}
                onChange={(e) => setInternalRoadWidth(Math.max(3, parseFloat(e.target.value) || 6))}
                className="w-16 h-7 text-xs text-center"
                min={3}
                max={15}
              />
              <span className="text-xs text-muted-foreground">m</span>
            </div>
          )}
        </div>

        {/* Aperçu des calculs */}
        <div className="p-3 bg-green-50 dark:bg-green-950/30 rounded-lg border border-green-200 dark:border-green-800">
          <div className="flex items-center gap-2 mb-2">
            <Target className="h-4 w-4 text-green-600" />
            <span className="font-medium text-sm text-green-700 dark:text-green-300">Aperçu</span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Surface disponible:</span>
              <span className="font-medium">{Math.round(availableArea).toLocaleString()} m²</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Surface/lot:</span>
              <span className="font-medium">≈ {Math.round(avgLotArea).toLocaleString()} m²</span>
            </div>
          </div>
        </div>

        {/* Avertissement si lots existants */}
        {existingLots.length > 0 && (
          <Alert className="bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800">
            <Info className="h-4 w-4 text-amber-600" />
            <AlertDescription className="text-xs text-amber-700 dark:text-amber-300">
              {existingLots.length} lot(s) existant(s) seront remplacés par la nouvelle disposition.
            </AlertDescription>
          </Alert>
        )}

        {/* Bouton générer */}
        <Button
          onClick={generateLotLayout}
          disabled={isGenerating}
          className="w-full gap-2"
          size="lg"
        >
          {isGenerating ? (
            <>
              <RefreshCw className="h-4 w-4 animate-spin" />
              Génération en cours...
            </>
          ) : (
            <>
              <Zap className="h-4 w-4" />
              Générer {numberOfLots} lots automatiquement
              <ArrowRight className="h-4 w-4" />
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
};

export default SubdivisionAssistant;

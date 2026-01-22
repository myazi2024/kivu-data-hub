import React, { useState, useMemo, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { 
  Wand2, Grid3X3, LayoutGrid, Rows, Columns, Info, 
  Sparkles, ArrowRight, Zap, Target, RefreshCw, Plus, Minus,
  HelpCircle, CheckCircle2, AlertCircle, Undo2
} from 'lucide-react';
import { LotData, ParentParcelData } from './types';
import { LayoutPreview } from './LayoutPreview';
import {
  LayoutType,
  UsageType,
  LayoutConfig,
  LAYOUT_OPTIONS,
  USAGE_TYPES,
  DEFAULT_LAYOUT_CONFIG,
  MIN_LOT_SURFACE_SQM,
  getParentDimensions,
  calculateAvailableArea,
  generateLotLayout,
  validateGeneratedLots
} from '@/utils/lotLayoutGenerator';

interface SubdivisionAssistantProps {
  parentParcel: ParentParcelData;
  onGenerateLots: (lots: LotData[]) => void;
  existingLots?: LotData[];
}

const LAYOUT_ICONS: Record<LayoutType, React.ReactNode> = {
  grid: <Grid3X3 className="h-4 w-4" />,
  horizontal: <Rows className="h-4 w-4" />,
  vertical: <Columns className="h-4 w-4" />,
  custom: <LayoutGrid className="h-4 w-4" />
};

export const SubdivisionAssistant: React.FC<SubdivisionAssistantProps> = ({
  parentParcel,
  onGenerateLots,
  existingLots = []
}) => {
  // Configuration state
  const [config, setConfig] = useState<LayoutConfig>({
    ...DEFAULT_LAYOUT_CONFIG,
    numberOfLots: Math.min(4, Math.floor(parentParcel.area / MIN_LOT_SURFACE_SQM))
  });
  
  // UI state
  const [isGenerating, setIsGenerating] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [previousLots, setPreviousLots] = useState<LotData[] | null>(null);

  // Parent parcel dimensions
  const parentDimensions = useMemo(() => 
    getParentDimensions(parentParcel),
    [parentParcel]
  );

  // Available area calculation
  const availableArea = useMemo(() => 
    calculateAvailableArea(
      parentParcel.area,
      config.numberOfLots,
      parentDimensions.width,
      parentDimensions.height,
      config.includeInternalRoads,
      config.internalRoadWidth
    ),
    [parentParcel.area, config.numberOfLots, parentDimensions, config.includeInternalRoads, config.internalRoadWidth]
  );

  // Average lot area
  const avgLotArea = useMemo(() => 
    availableArea / config.numberOfLots,
    [availableArea, config.numberOfLots]
  );

  // Maximum number of lots based on minimum surface
  const maxLots = useMemo(() => 
    Math.floor(parentParcel.area / MIN_LOT_SURFACE_SQM),
    [parentParcel.area]
  );

  // Preview lots (generated in real-time)
  const previewLots = useMemo(() => {
    if (config.layoutType === 'custom') return [];
    return generateLotLayout(parentParcel, config);
  }, [parentParcel, config]);

  // Validation status
  const validationStatus = useMemo(() => 
    validateGeneratedLots(previewLots, parentParcel.area),
    [previewLots, parentParcel.area]
  );

  // Update config helper
  const updateConfig = useCallback((updates: Partial<LayoutConfig>) => {
    setConfig(prev => ({ ...prev, ...updates }));
  }, []);

  // Increment/decrement lots
  const adjustLotCount = useCallback((delta: number) => {
    setConfig(prev => ({
      ...prev,
      numberOfLots: Math.max(2, Math.min(maxLots, prev.numberOfLots + delta))
    }));
  }, [maxLots]);

  // Generate lots
  const handleGenerate = useCallback(() => {
    if (existingLots.length > 0) {
      setShowConfirmDialog(true);
      return;
    }
    executeGeneration();
  }, [existingLots]);

  const executeGeneration = useCallback(() => {
    setIsGenerating(true);
    setPreviousLots(existingLots.length > 0 ? [...existingLots] : null);
    
    setTimeout(() => {
      const lots = generateLotLayout(parentParcel, config);
      onGenerateLots(lots);
      setIsGenerating(false);
      setShowConfirmDialog(false);
    }, 300);
  }, [parentParcel, config, existingLots, onGenerateLots]);

  // Undo generation
  const handleUndo = useCallback(() => {
    if (previousLots) {
      onGenerateLots(previousLots);
      setPreviousLots(null);
    }
  }, [previousLots, onGenerateLots]);

  return (
    <TooltipProvider>
      <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
        <CardHeader className="pb-2 px-3 pt-3">
          <CardTitle className="flex items-center gap-2 text-sm">
            <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center">
              <Wand2 className="h-3.5 w-3.5 text-primary" />
            </div>
            Assistant de création
            <Badge variant="secondary" className="ml-auto text-[10px] h-5">
              <Sparkles className="h-3 w-3 mr-0.5" />
              Auto
            </Badge>
          </CardTitle>
        </CardHeader>
        
        <CardContent className="space-y-4 px-3 pb-3">
          {/* Parent parcel info */}
          <div className="p-2.5 bg-muted/50 rounded-lg border text-xs">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Parcelle mère:</span>
              <span className="font-medium">{parentParcel.area.toLocaleString()} m²</span>
            </div>
            <div className="flex items-center justify-between mt-1">
              <span className="text-muted-foreground">Dimensions:</span>
              <span className="font-medium">
                ≈ {Math.round(parentDimensions.width)}m × {Math.round(parentDimensions.height)}m
                {parentDimensions.isEstimated && (
                  <Tooltip>
                    <TooltipTrigger>
                      <Info className="h-3 w-3 inline ml-1 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="text-xs">Dimensions estimées (forme carrée)</p>
                    </TooltipContent>
                  </Tooltip>
                )}
              </span>
            </div>
          </div>

          {/* Real-time preview */}
          <LayoutPreview
            parentParcel={parentParcel}
            lots={previewLots}
            internalRoadWidth={config.internalRoadWidth}
            includeInternalRoads={config.includeInternalRoads}
          />

          {/* Layout type selection */}
          <div className="space-y-2">
            <div className="flex items-center gap-1">
              <Label className="text-xs font-medium">Disposition</Label>
              <Tooltip>
                <TooltipTrigger>
                  <HelpCircle className="h-3 w-3 text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent className="max-w-[200px]">
                  <p className="text-xs">Choisissez comment les lots seront répartis sur la parcelle</p>
                </TooltipContent>
              </Tooltip>
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              {LAYOUT_OPTIONS.filter(l => l.id !== 'custom').map((layout) => (
                <button
                  key={layout.id}
                  onClick={() => updateConfig({ layoutType: layout.id })}
                  className={`p-2 rounded-lg border transition-all text-left ${
                    config.layoutType === layout.id 
                      ? 'border-primary bg-primary/5 ring-1 ring-primary/20' 
                      : 'border-muted hover:border-primary/30'
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    <span className={config.layoutType === layout.id ? 'text-primary' : 'text-muted-foreground'}>
                      {LAYOUT_ICONS[layout.id]}
                    </span>
                    <span className="font-medium text-xs">{layout.name}</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-1">{layout.description}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Number of lots */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1">
                <Label className="text-xs font-medium">Nombre de lots</Label>
                <Tooltip>
                  <TooltipTrigger>
                    <HelpCircle className="h-3 w-3 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-[200px]">
                    <p className="text-xs">Maximum {maxLots} lots pour respecter la surface minimum légale de {MIN_LOT_SURFACE_SQM} m²</p>
                  </TooltipContent>
                </Tooltip>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => adjustLotCount(-1)}
                  disabled={config.numberOfLots <= 2}
                >
                  <Minus className="h-3 w-3" />
                </Button>
                <Input
                  type="number"
                  value={config.numberOfLots}
                  onChange={(e) => updateConfig({ 
                    numberOfLots: Math.max(2, Math.min(maxLots, parseInt(e.target.value) || 2))
                  })}
                  className="w-14 h-7 text-center text-xs"
                  min={2}
                  max={maxLots}
                />
                <Button
                  variant="outline"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => adjustLotCount(1)}
                  disabled={config.numberOfLots >= maxLots}
                >
                  <Plus className="h-3 w-3" />
                </Button>
              </div>
            </div>
            <Slider
              value={[config.numberOfLots]}
              onValueChange={([value]) => updateConfig({ numberOfLots: value })}
              min={2}
              max={Math.min(50, maxLots)}
              step={1}
              className="w-full"
            />
            <div className="flex justify-between text-[10px] text-muted-foreground">
              <span>2 lots</span>
              <span className="text-primary font-medium">{config.numberOfLots} lots</span>
              <span>{Math.min(50, maxLots)} lots</span>
            </div>
          </div>

          {/* Usage type */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Usage prévu</Label>
            <Select 
              value={config.defaultUsage} 
              onValueChange={(v: UsageType) => updateConfig({ defaultUsage: v })}
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {USAGE_TYPES.map((usage) => (
                  <SelectItem key={usage.id} value={usage.id} className="text-xs">
                    <div className="flex items-center gap-2">
                      <div className={`h-2.5 w-2.5 rounded-full ${usage.color}`} />
                      {usage.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Internal roads */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1">
                <Label className="text-xs font-medium">Voies internes</Label>
                <Tooltip>
                  <TooltipTrigger>
                    <HelpCircle className="h-3 w-3 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-[200px]">
                    <p className="text-xs">Les voies internes garantissent un accès à chaque lot</p>
                  </TooltipContent>
                </Tooltip>
              </div>
              <button
                onClick={() => updateConfig({ includeInternalRoads: !config.includeInternalRoads })}
                className={`px-2.5 py-1 rounded-full text-[10px] font-medium transition-colors ${
                  config.includeInternalRoads 
                    ? 'bg-primary text-primary-foreground' 
                    : 'bg-muted text-muted-foreground'
                }`}
              >
                {config.includeInternalRoads ? 'Incluses' : 'Non incluses'}
              </button>
            </div>
            
            <div className={`flex items-center gap-2 transition-opacity ${config.includeInternalRoads ? 'opacity-100' : 'opacity-50'}`}>
              <Label className="text-[10px] text-muted-foreground">Largeur:</Label>
              <Input
                type="number"
                value={config.internalRoadWidth}
                onChange={(e) => updateConfig({ 
                  internalRoadWidth: Math.max(3, Math.min(15, parseFloat(e.target.value) || 6))
                })}
                className="w-14 h-6 text-[10px] text-center"
                min={3}
                max={15}
                disabled={!config.includeInternalRoads}
              />
              <span className="text-[10px] text-muted-foreground">m</span>
            </div>
          </div>

          {/* Calculation preview */}
          <div className={`p-2.5 rounded-lg border text-xs ${
            validationStatus.isValid 
              ? 'bg-secondary/50 border-border' 
              : 'bg-accent/50 border-border'
          }`}>
            <div className="flex items-center gap-2 mb-1.5">
              {validationStatus.isValid ? (
                <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
              ) : (
                <AlertCircle className="h-3.5 w-3.5 text-destructive" />
              )}
              <span className="font-medium text-xs text-foreground">
                {validationStatus.isValid ? 'Configuration valide' : 'À vérifier'}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-[10px]">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Surface disponible:</span>
                <span className="font-medium">{Math.round(availableArea).toLocaleString()} m²</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Surface/lot:</span>
                <span className={`font-medium ${avgLotArea < MIN_LOT_SURFACE_SQM ? 'text-destructive' : ''}`}>
                  ≈ {Math.round(avgLotArea).toLocaleString()} m²
                </span>
              </div>
            </div>
            {validationStatus.issues.length > 0 && (
              <div className="mt-1.5 pt-1.5 border-t border-border space-y-0.5">
                {validationStatus.issues.map((issue, i) => (
                  <p key={i} className="text-[10px] text-muted-foreground">
                    • {issue}
                  </p>
                ))}
              </div>
            )}
          </div>

          {/* Warning for existing lots */}
          {existingLots.length > 0 && (
            <Alert className="py-2 px-2.5 bg-accent/50 border-border">
              <AlertCircle className="h-3.5 w-3.5 text-destructive" />
              <AlertDescription className="text-[10px] text-muted-foreground ml-2">
                {existingLots.length} lot(s) existant(s) seront remplacés.
              </AlertDescription>
            </Alert>
          )}

          {/* Action buttons */}
          <div className="flex gap-2">
            {previousLots && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleUndo}
                className="gap-1 text-xs h-9"
              >
                <Undo2 className="h-3.5 w-3.5" />
                Annuler
              </Button>
            )}
            <Button
              onClick={handleGenerate}
              disabled={isGenerating || !validationStatus.isValid}
              className="flex-1 gap-2 h-9"
              size="sm"
            >
              {isGenerating ? (
                <>
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  Génération...
                </>
              ) : (
                <>
                  <Zap className="h-3.5 w-3.5" />
                  Générer {config.numberOfLots} lots
                  <ArrowRight className="h-3.5 w-3.5" />
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Confirmation dialog */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent className="max-w-xs">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base">Remplacer les lots existants ?</AlertDialogTitle>
            <AlertDialogDescription className="text-xs">
              Cette action remplacera les {existingLots.length} lot(s) existant(s) par une nouvelle disposition de {config.numberOfLots} lots.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel className="text-xs h-8">Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={executeGeneration} className="text-xs h-8">
              Remplacer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </TooltipProvider>
  );
};

export default SubdivisionAssistant;

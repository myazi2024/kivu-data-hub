import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Download,
  Grid3X3,
  Compass,
  Ruler,
  Move,
  MousePointer,
  Hand,
  Maximize2,
  Settings2,
  Layers,
  Eye,
  EyeOff
} from 'lucide-react';
import { LotData, InternalRoad, EnvironmentFeature, SketchSettings, DEFAULT_SKETCH_SETTINGS, SURFACE_TYPES, ENVIRONMENT_ICONS } from './types';
import { SideDimension } from './types';

interface ParentParcelData {
  area: number;
  location: string;
  owner: string;
  titleRef: string;
  titleType: string;
  titleIssueDate: string;
  gps: { lat: string; lng: string };
  sides: SideDimension[];
  numberOfSides: number;
}

interface ProfessionalSketchCanvasProps {
  lots: LotData[];
  internalRoads: InternalRoad[];
  environmentFeatures: EnvironmentFeature[];
  parentParcel: ParentParcelData;
  settings: SketchSettings;
  onSettingsChange: (settings: SketchSettings) => void;
  onLotSelect?: (index: number | null) => void;
  selectedLotIndex?: number | null;
}

export const ProfessionalSketchCanvas: React.FC<ProfessionalSketchCanvasProps> = ({
  lots,
  internalRoads,
  environmentFeatures,
  parentParcel,
  settings,
  onSettingsChange,
  onLotSelect,
  selectedLotIndex
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [selectedLotId, setSelectedLotId] = useState<string | null>(null);
  const [tool, setTool] = useState<'select' | 'pan' | 'move'>('select');
  const [showSettings, setShowSettings] = useState(false);
  const [canvasSize, setCanvasSize] = useState({ width: 800, height: 600 });
  
  // Responsive canvas dimensions
  useEffect(() => {
    const updateCanvasSize = () => {
      if (containerRef.current) {
        const containerWidth = containerRef.current.clientWidth;
        // Maintain 4:3 aspect ratio, but cap at max dimensions
        const maxWidth = Math.min(containerWidth - 32, 1200);
        const maxHeight = Math.min(maxWidth * 0.75, 700);
        setCanvasSize({
          width: Math.max(400, maxWidth),
          height: Math.max(300, maxHeight)
        });
      }
    };
    
    updateCanvasSize();
    window.addEventListener('resize', updateCanvasSize);
    return () => window.removeEventListener('resize', updateCanvasSize);
  }, []);
  
  const canvasWidth = canvasSize.width;
  const canvasHeight = canvasSize.height;
  
  // Calculer l'échelle basée sur la parcelle mère
  const calculateScale = useCallback(() => {
    const parentPerimeter = parentParcel.sides.reduce((sum, s) => sum + s.length, 0);
    const avgSide = parentPerimeter / parentParcel.sides.length || Math.sqrt(parentParcel.area);
    const margin = 80;
    const availableWidth = canvasWidth - margin * 2;
    const availableHeight = canvasHeight - margin * 2;
    return Math.min(availableWidth, availableHeight) / (avgSide * 1.5);
  }, [parentParcel.sides, parentParcel.area, canvasWidth, canvasHeight]);
  
  // Dessiner le croquis
  const drawSketch = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const scale = calculateScale() * zoom;
    const margin = 60;
    
    // Effacer
    ctx.fillStyle = settings.backgroundColor;
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);
    
    ctx.save();
    ctx.translate(pan.x, pan.y);
    
    // Grille
    if (settings.showGrid) {
      ctx.strokeStyle = '#e5e7eb';
      ctx.lineWidth = 0.5;
      const gridSpacing = settings.gridSize * scale;
      
      for (let x = margin; x < canvasWidth - margin; x += gridSpacing) {
        ctx.beginPath();
        ctx.moveTo(x, margin);
        ctx.lineTo(x, canvasHeight - margin);
        ctx.stroke();
      }
      for (let y = margin; y < canvasHeight - margin; y += gridSpacing) {
        ctx.beginPath();
        ctx.moveTo(margin, y);
        ctx.lineTo(canvasWidth - margin, y);
        ctx.stroke();
      }
    }
    
    // Parcelle mère
    const parentWidth = (parentParcel.sides[0]?.length || Math.sqrt(parentParcel.area)) * scale;
    const parentHeight = (parentParcel.sides[1]?.length || Math.sqrt(parentParcel.area)) * scale;
    const startX = (canvasWidth - parentWidth) / 2;
    const startY = (canvasHeight - parentHeight) / 2;
    
    // Contour parcelle mère
    ctx.strokeStyle = '#1e40af';
    ctx.lineWidth = 3;
    ctx.setLineDash([]);
    ctx.strokeRect(startX, startY, parentWidth, parentHeight);
    
    // Dimensions de la parcelle mère
    if (settings.showDimensions) {
      ctx.fillStyle = '#1e40af';
      ctx.font = 'bold 11px Inter, sans-serif';
      ctx.textAlign = 'center';
      
      parentParcel.sides.forEach((side, index) => {
        if (side.length <= 0) return;
        
        if (index === 0) { // Nord
          ctx.fillText(`${side.length}m`, startX + parentWidth / 2, startY - 8);
        } else if (index === 1) { // Est
          ctx.save();
          ctx.translate(startX + parentWidth + 16, startY + parentHeight / 2);
          ctx.rotate(Math.PI / 2);
          ctx.fillText(`${side.length}m`, 0, 0);
          ctx.restore();
        } else if (index === 2) { // Sud
          ctx.fillText(`${side.length}m`, startX + parentWidth / 2, startY + parentHeight + 16);
        } else if (index === 3) { // Ouest
          ctx.save();
          ctx.translate(startX - 8, startY + parentHeight / 2);
          ctx.rotate(-Math.PI / 2);
          ctx.fillText(`${side.length}m`, 0, 0);
          ctx.restore();
        }
      });
    }
    
    // Éléments d'environnement
    if (settings.showEnvironment && environmentFeatures.length > 0) {
      environmentFeatures.forEach(feature => {
        const icon = ENVIRONMENT_ICONS[feature.type] || '📍';
        let featureX = startX;
        let featureY = startY;
        
        switch (feature.direction) {
          case 'north':
            featureX = startX + parentWidth / 2;
            featureY = startY - 40 - (feature.distance || 0) * scale / 10;
            break;
          case 'south':
            featureX = startX + parentWidth / 2;
            featureY = startY + parentHeight + 40 + (feature.distance || 0) * scale / 10;
            break;
          case 'east':
            featureX = startX + parentWidth + 40 + (feature.distance || 0) * scale / 10;
            featureY = startY + parentHeight / 2;
            break;
          case 'west':
            featureX = startX - 40 - (feature.distance || 0) * scale / 10;
            featureY = startY + parentHeight / 2;
            break;
        }
        
        ctx.font = '20px serif';
        ctx.textAlign = 'center';
        ctx.fillText(icon, featureX, featureY);
        
        if (feature.name) {
          ctx.font = '9px Inter, sans-serif';
          ctx.fillStyle = feature.color || '#6b7280';
          ctx.fillText(feature.name, featureX, featureY + 16);
        }
      });
    }
    
    // Routes internes
    if (settings.showRoads && internalRoads.length > 0) {
      internalRoads.forEach(road => {
        const surfaceInfo = SURFACE_TYPES.find(s => s.value === road.surfaceType);
        ctx.strokeStyle = surfaceInfo?.color || '#6b7280';
        ctx.lineWidth = road.width * scale / 5;
        ctx.setLineDash(road.isExisting ? [] : [5, 5]);
        
        if (road.points.length >= 2) {
          ctx.beginPath();
          ctx.moveTo(startX + road.points[0].x * scale, startY + road.points[0].y * scale);
          road.points.slice(1).forEach(point => {
            ctx.lineTo(startX + point.x * scale, startY + point.y * scale);
          });
          ctx.stroke();
        }
        
        // Nom de la route
        if (road.name && road.points.length >= 2) {
          const midPoint = road.points[Math.floor(road.points.length / 2)];
          ctx.font = '9px Inter, sans-serif';
          ctx.fillStyle = '#374151';
          ctx.textAlign = 'center';
          ctx.fillText(road.name, startX + midPoint.x * scale, startY + midPoint.y * scale - 10);
        }
      });
      ctx.setLineDash([]);
    }
    
    // Lots
    const lotsPerRow = Math.ceil(Math.sqrt(lots.length));
    const lotSpacing = 4;
    const lotMaxWidth = (parentWidth - (lotsPerRow + 1) * lotSpacing) / lotsPerRow;
    const lotMaxHeight = (parentHeight - (Math.ceil(lots.length / lotsPerRow) + 1) * lotSpacing) / Math.ceil(lots.length / lotsPerRow);
    
    lots.forEach((lot, index) => {
      const row = Math.floor(index / lotsPerRow);
      const col = index % lotsPerRow;
      
      // Utiliser la position du lot ou calculer une position par défaut
      let lotX = startX + lotSpacing + col * (lotMaxWidth + lotSpacing);
      let lotY = startY + lotSpacing + row * (lotMaxHeight + lotSpacing);
      
      // Calculer les dimensions basées sur les côtés
      const lotWidth = lot.sides[0]?.length ? lot.sides[0].length * scale : lotMaxWidth;
      const lotHeight = lot.sides[1]?.length ? lot.sides[1].length * scale : lotMaxHeight;
      
      const isSelected = lot.id === selectedLotId;
      const lotColor = settings.lotColors[lot.intendedUse] || '#22c55e';
      
      // Appliquer la rotation
      ctx.save();
      ctx.translate(lotX + lotWidth / 2, lotY + lotHeight / 2);
      ctx.rotate((lot.rotation || 0) * Math.PI / 180);
      ctx.translate(-lotWidth / 2, -lotHeight / 2);
      
      // Fond
      ctx.fillStyle = `${lotColor}30`;
      if (lot.isBuilt) {
        ctx.fillStyle = `${lotColor}50`;
      }
      ctx.fillRect(0, 0, lotWidth, lotHeight);
      
      // Contour
      ctx.strokeStyle = isSelected ? '#3b82f6' : lotColor;
      ctx.lineWidth = isSelected ? 3 : 2;
      ctx.strokeRect(0, 0, lotWidth, lotHeight);
      
      // Côtés mitoyens
      lot.sides.forEach((side, sideIndex) => {
        if (side.isShared) {
          ctx.setLineDash([4, 4]);
          ctx.strokeStyle = '#f59e0b';
          ctx.lineWidth = 2;
          ctx.beginPath();
          
          if (sideIndex === 0) {
            ctx.moveTo(0, 0);
            ctx.lineTo(lotWidth, 0);
          } else if (sideIndex === 1) {
            ctx.moveTo(lotWidth, 0);
            ctx.lineTo(lotWidth, lotHeight);
          } else if (sideIndex === 2) {
            ctx.moveTo(0, lotHeight);
            ctx.lineTo(lotWidth, lotHeight);
          } else if (sideIndex === 3) {
            ctx.moveTo(0, 0);
            ctx.lineTo(0, lotHeight);
          }
          ctx.stroke();
          ctx.setLineDash([]);
        }
        
        if (side.isRoadBordering) {
          ctx.strokeStyle = '#8b5cf6';
          ctx.lineWidth = 4;
          ctx.beginPath();
          
          if (sideIndex === 0) {
            ctx.moveTo(0, 0);
            ctx.lineTo(lotWidth, 0);
          } else if (sideIndex === 1) {
            ctx.moveTo(lotWidth, 0);
            ctx.lineTo(lotWidth, lotHeight);
          } else if (sideIndex === 2) {
            ctx.moveTo(0, lotHeight);
            ctx.lineTo(lotWidth, lotHeight);
          } else if (sideIndex === 3) {
            ctx.moveTo(0, 0);
            ctx.lineTo(0, lotHeight);
          }
          ctx.stroke();
        }
      });
      
      // Numéro du lot
      ctx.fillStyle = '#1f2937';
      ctx.font = 'bold 12px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(lot.lotNumber, lotWidth / 2, lotHeight / 2 - 8);
      
      // Surface
      ctx.font = '10px Inter, sans-serif';
      ctx.fillText(`${lot.areaSqm.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} m²`, lotWidth / 2, lotHeight / 2 + 6);
      
      // Dimensions si showDimensions
      if (settings.showDimensions && lot.sides[0]?.length > 0) {
        ctx.font = '8px Inter, sans-serif';
        ctx.fillStyle = '#6b7280';
        const dims = `${lot.sides[0]?.length || 0}×${lot.sides[1]?.length || 0}m`;
        ctx.fillText(dims, lotWidth / 2, lotHeight / 2 + 18);
      }
      
      // Icône si construit
      if (lot.isBuilt) {
        ctx.font = '14px serif';
        ctx.fillText('🏠', lotWidth / 2, lotHeight - 12);
      }
      
      ctx.restore();
    });
    
    // Indicateur Nord
    if (settings.showNorthIndicator) {
      const northX = canvasWidth - 50;
      const northY = 50;
      
      ctx.beginPath();
      ctx.moveTo(northX, northY - 20);
      ctx.lineTo(northX - 8, northY);
      ctx.lineTo(northX + 8, northY);
      ctx.closePath();
      ctx.fillStyle = '#dc2626';
      ctx.fill();
      
      ctx.fillStyle = '#1f2937';
      ctx.font = 'bold 12px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('N', northX, northY - 25);
    }
    
    // Échelle
    if (settings.showScale) {
      const scaleBarLength = 50;
      const scaleValue = scaleBarLength / scale;
      const scaleY = canvasHeight - 30;
      
      ctx.strokeStyle = '#1f2937';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(20, scaleY);
      ctx.lineTo(20 + scaleBarLength, scaleY);
      ctx.moveTo(20, scaleY - 5);
      ctx.lineTo(20, scaleY + 5);
      ctx.moveTo(20 + scaleBarLength, scaleY - 5);
      ctx.lineTo(20 + scaleBarLength, scaleY + 5);
      ctx.stroke();
      
      ctx.fillStyle = '#1f2937';
      ctx.font = '10px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`${scaleValue.toFixed(1)}m`, 20 + scaleBarLength / 2, scaleY + 15);
    }
    
    // Légende
    if (settings.showLegend) {
      const legendX = 20;
      const legendY = canvasHeight - 80;
      
      ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
      ctx.fillRect(legendX - 5, legendY - 15, 280, 50);
      ctx.strokeStyle = '#e5e7eb';
      ctx.lineWidth = 1;
      ctx.strokeRect(legendX - 5, legendY - 15, 280, 50);
      
      ctx.font = '9px Inter, sans-serif';
      ctx.textAlign = 'left';
      
      // Légende items
      const legendItems = [
        { color: settings.lotColors.residential, label: 'Résidentiel' },
        { color: settings.lotColors.commercial, label: 'Commercial' },
        { color: '#f59e0b', label: 'Mitoyen', dash: true },
        { color: '#8b5cf6', label: 'Route' }
      ];
      
      legendItems.forEach((item, index) => {
        const itemX = legendX + (index % 4) * 70;
        const itemY = legendY + Math.floor(index / 4) * 20;
        
        if (item.dash) {
          ctx.setLineDash([3, 3]);
        }
        ctx.fillStyle = `${item.color}50`;
        ctx.fillRect(itemX, itemY, 12, 12);
        ctx.strokeStyle = item.color;
        ctx.lineWidth = 2;
        ctx.strokeRect(itemX, itemY, 12, 12);
        ctx.setLineDash([]);
        
        ctx.fillStyle = '#1f2937';
        ctx.fillText(item.label, itemX + 16, itemY + 10);
      });
    }
    
    ctx.restore();
  }, [lots, internalRoads, environmentFeatures, parentParcel.sides, parentParcel.area, settings, zoom, pan, selectedLotId, calculateScale]);
  
  useEffect(() => {
    drawSketch();
  }, [drawSketch]);
  
  const handleZoomIn = () => setZoom(z => Math.min(z * 1.2, 5));
  const handleZoomOut = () => setZoom(z => Math.max(z / 1.2, 0.2));
  const handleReset = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };
  
  const handleMouseDown = (e: React.MouseEvent) => {
    if (tool === 'pan') {
      setIsDragging(true);
      setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  };
  
  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging && tool === 'pan') {
      setPan({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      });
    }
  };
  
  const handleMouseUp = () => {
    setIsDragging(false);
  };
  
  const handleExportClick = (format: 'pdf' | 'png' | 'svg', resolution: 'standard' | 'hd' | 'print') => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    if (format === 'png') {
      const multiplier = resolution === 'hd' ? 2 : resolution === 'print' ? 4 : 1;
      const exportCanvas = document.createElement('canvas');
      exportCanvas.width = canvasWidth * multiplier;
      exportCanvas.height = canvasHeight * multiplier;
      const exportCtx = exportCanvas.getContext('2d');
      if (exportCtx) {
        exportCtx.scale(multiplier, multiplier);
        exportCtx.drawImage(canvas, 0, 0);
        const link = document.createElement('a');
        link.download = `croquis-lotissement-${resolution}.png`;
        link.href = exportCanvas.toDataURL('image/png');
        link.click();
      }
    } else if (format === 'pdf') {
      import('jspdf').then(({ jsPDF }) => {
        const multiplier = resolution === 'print' ? 4 : 2;
        const exportCanvas = document.createElement('canvas');
        exportCanvas.width = canvasWidth * multiplier;
        exportCanvas.height = canvasHeight * multiplier;
        const exportCtx = exportCanvas.getContext('2d');
        if (exportCtx) {
          exportCtx.scale(multiplier, multiplier);
          exportCtx.drawImage(canvas, 0, 0);
          
          const pdf = new jsPDF({
            orientation: 'landscape',
            unit: 'mm',
            format: resolution === 'print' ? 'a3' : 'a4'
          });
          
          const imgData = exportCanvas.toDataURL('image/png');
          const pdfWidth = pdf.internal.pageSize.getWidth();
          const pdfHeight = (canvasHeight / canvasWidth) * pdfWidth;
          
          pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
          pdf.save(`croquis-lotissement-${resolution}.pdf`);
        }
      });
    }
  };
  
  return (
    <div className="space-y-4">
      {/* Barre d'outils */}
      <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-muted/30 rounded-lg">
        <div className="flex items-center gap-1">
          <Button
            variant={tool === 'select' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setTool('select')}
            className="h-8 w-8 p-0"
          >
            <MousePointer className="h-4 w-4" />
          </Button>
          <Button
            variant={tool === 'pan' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setTool('pan')}
            className="h-8 w-8 p-0"
          >
            <Hand className="h-4 w-4" />
          </Button>
          <Separator orientation="vertical" className="h-6 mx-1" />
          <Button variant="outline" size="sm" onClick={handleZoomOut} className="h-8 w-8 p-0">
            <ZoomOut className="h-4 w-4" />
          </Button>
          <span className="text-xs w-12 text-center">{Math.round(zoom * 100)}%</span>
          <Button variant="outline" size="sm" onClick={handleZoomIn} className="h-8 w-8 p-0">
            <ZoomIn className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={handleReset} className="h-8 w-8 p-0">
            <RotateCcw className="h-4 w-4" />
          </Button>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowSettings(!showSettings)}
            className="h-8 gap-1"
          >
            <Settings2 className="h-4 w-4" />
            <span className="hidden sm:inline">Options</span>
          </Button>
          
          <div className="flex gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleExportClick('png', 'hd')}
              className="h-8 gap-1"
            >
              <Download className="h-4 w-4" />
              <span className="hidden sm:inline">PNG HD</span>
            </Button>
            <Button
              size="sm"
              onClick={() => handleExportClick('pdf', 'print')}
              className="h-8 gap-1"
            >
              <Download className="h-4 w-4" />
              <span className="hidden sm:inline">PDF Panneau</span>
            </Button>
          </div>
        </div>
      </div>
      
      {/* Options d'affichage */}
      {showSettings && (
        <Card className="p-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="flex items-center gap-2">
              <Switch
                checked={settings.showGrid}
                onCheckedChange={(v) => onSettingsChange({ ...settings, showGrid: v })}
              />
              <Label className="text-xs">Grille</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={settings.showScale}
                onCheckedChange={(v) => onSettingsChange({ ...settings, showScale: v })}
              />
              <Label className="text-xs">Échelle</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={settings.showNorthIndicator}
                onCheckedChange={(v) => onSettingsChange({ ...settings, showNorthIndicator: v })}
              />
              <Label className="text-xs">Nord</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={settings.showLegend}
                onCheckedChange={(v) => onSettingsChange({ ...settings, showLegend: v })}
              />
              <Label className="text-xs">Légende</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={settings.showDimensions}
                onCheckedChange={(v) => onSettingsChange({ ...settings, showDimensions: v })}
              />
              <Label className="text-xs">Dimensions</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={settings.showRoads}
                onCheckedChange={(v) => onSettingsChange({ ...settings, showRoads: v })}
              />
              <Label className="text-xs">Routes</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={settings.showEnvironment}
                onCheckedChange={(v) => onSettingsChange({ ...settings, showEnvironment: v })}
              />
              <Label className="text-xs">Environnement</Label>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Taille grille (m)</Label>
              <Input
                type="number"
                value={settings.gridSize}
                onChange={(e) => onSettingsChange({ ...settings, gridSize: parseInt(e.target.value) || 10 })}
                className="h-7 text-xs"
                min={1}
                max={50}
              />
            </div>
          </div>
        </Card>
      )}
      
      {/* Canvas */}
      <div 
        ref={containerRef}
        className="relative border rounded-lg overflow-hidden bg-white"
        style={{ cursor: tool === 'pan' ? (isDragging ? 'grabbing' : 'grab') : 'default' }}
      >
        <canvas
          ref={canvasRef}
          width={canvasWidth}
          height={canvasHeight}
          className="w-full h-auto max-h-[500px] object-contain"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        />
        
        {/* Indicateurs en superposition */}
        <div className="absolute bottom-2 left-2 flex gap-2">
          <Badge variant="secondary" className="text-[10px]">
            {lots.length} lots
          </Badge>
          <Badge variant="secondary" className="text-[10px]">
            {parentParcel.area.toLocaleString('fr-FR')} m² total
          </Badge>
        </div>
      </div>
      
      {/* Légende détaillée */}
      <Card className="p-3">
        <div className="flex flex-wrap items-center gap-4 text-xs">
          <div className="flex items-center gap-1">
            <div className="w-4 h-4 rounded border-2 border-primary" />
            <span>Parcelle mère</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-4 h-4 rounded" style={{ backgroundColor: `${settings.lotColors.residential}50` }} />
            <span>Résidentiel</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-4 h-4 rounded" style={{ backgroundColor: `${settings.lotColors.commercial}50` }} />
            <span>Commercial</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-4 h-4 rounded border-2 border-dashed border-amber-500" />
            <span>Mitoyen</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-4 h-1 bg-purple-600 rounded" />
            <span>Borde route</span>
          </div>
          <div className="flex items-center gap-1">
            <span>🏠</span>
            <span>Construit</span>
          </div>
        </div>
      </Card>
    </div>
  );
};

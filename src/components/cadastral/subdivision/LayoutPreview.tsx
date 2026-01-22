import React, { useRef, useEffect, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, CheckCircle2 } from 'lucide-react';
import { LotData, ParentParcelData } from './types';

interface LayoutPreviewProps {
  parentParcel: ParentParcelData;
  lots: LotData[];
  internalRoadWidth: number;
  includeInternalRoads: boolean;
  className?: string;
}

const USAGE_COLORS: Record<string, string> = {
  residential: '#22c55e',
  commercial: '#3b82f6',
  industrial: '#f59e0b',
  agricultural: '#84cc16',
  mixed: '#8b5cf6'
};

export const LayoutPreview: React.FC<LayoutPreviewProps> = ({
  parentParcel,
  lots,
  internalRoadWidth,
  includeInternalRoads,
  className = ''
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Calculate parent dimensions
  const parentDimensions = useMemo(() => {
    if (!parentParcel.sides || parentParcel.sides.length < 4) {
      const sideLength = Math.sqrt(parentParcel.area);
      return { width: sideLength, height: sideLength };
    }
    
    const sides = parentParcel.sides;
    const width = Math.max(sides[0]?.length || 0, sides[2]?.length || 0) || Math.sqrt(parentParcel.area);
    const height = Math.max(sides[1]?.length || 0, sides[3]?.length || 0) || Math.sqrt(parentParcel.area);
    
    return { width, height };
  }, [parentParcel]);

  // Validate lots
  const validationStatus = useMemo(() => {
    const totalArea = lots.reduce((sum, lot) => sum + lot.areaSqm, 0);
    const hasRoadAccess = lots.every(lot => 
      lot.sides.some(side => side.isRoadBordering)
    );
    const areaMatch = Math.abs(totalArea - parentParcel.area) / parentParcel.area < 0.05;
    
    return {
      totalArea,
      hasRoadAccess,
      areaMatch,
      isValid: hasRoadAccess && areaMatch
    };
  }, [lots, parentParcel.area]);

  // Draw preview
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container || lots.length === 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    const rect = container.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const canvasWidth = rect.width;
    const canvasHeight = rect.height;
    const padding = 12;

    // Calculate scale
    const scaleX = (canvasWidth - padding * 2) / parentDimensions.width;
    const scaleY = (canvasHeight - padding * 2) / parentDimensions.height;
    const scale = Math.min(scaleX, scaleY);

    // Center offset
    const offsetX = (canvasWidth - parentDimensions.width * scale) / 2;
    const offsetY = (canvasHeight - parentDimensions.height * scale) / 2;

    // Clear canvas
    ctx.clearRect(0, 0, canvasWidth, canvasHeight);

    // Draw parent parcel outline
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 4]);
    ctx.strokeRect(
      offsetX,
      offsetY,
      parentDimensions.width * scale,
      parentDimensions.height * scale
    );
    ctx.setLineDash([]);

    // Calculate grid layout
    const numberOfLots = lots.length;
    const aspectRatio = parentDimensions.width / parentDimensions.height;
    const cols = Math.max(1, Math.round(Math.sqrt(numberOfLots * aspectRatio)));
    const rows = Math.ceil(numberOfLots / cols);

    const roadOffset = includeInternalRoads ? internalRoadWidth * scale : 0;
    const lotWidth = (parentDimensions.width * scale - (cols - 1) * roadOffset) / cols;
    const lotHeight = (parentDimensions.height * scale - (rows - 1) * roadOffset) / rows;

    // Draw internal roads
    if (includeInternalRoads && numberOfLots > 1) {
      ctx.fillStyle = '#e2e8f0';
      
      // Horizontal roads
      for (let row = 1; row < rows; row++) {
        const y = offsetY + row * lotHeight + (row - 1) * roadOffset;
        ctx.fillRect(offsetX, y, parentDimensions.width * scale, roadOffset);
      }
      
      // Vertical roads
      for (let col = 1; col < cols; col++) {
        const x = offsetX + col * lotWidth + (col - 1) * roadOffset;
        ctx.fillRect(x, offsetY, roadOffset, parentDimensions.height * scale);
      }
    }

    // Draw lots
    let lotIndex = 0;
    for (let row = 0; row < rows && lotIndex < numberOfLots; row++) {
      for (let col = 0; col < cols && lotIndex < numberOfLots; col++) {
        const lot = lots[lotIndex];
        const x = offsetX + col * (lotWidth + roadOffset);
        const y = offsetY + row * (lotHeight + roadOffset);
        
        // Fill with usage color
        const color = USAGE_COLORS[lot.intendedUse] || USAGE_COLORS.mixed;
        ctx.fillStyle = color + '40';
        ctx.fillRect(x + 1, y + 1, lotWidth - 2, lotHeight - 2);
        
        // Draw border
        ctx.strokeStyle = color;
        ctx.lineWidth = 1.5;
        ctx.strokeRect(x + 1, y + 1, lotWidth - 2, lotHeight - 2);
        
        // Draw lot number
        ctx.fillStyle = '#1f2937';
        ctx.font = `${Math.min(10, lotWidth / 4)}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(
          String(lotIndex + 1),
          x + lotWidth / 2,
          y + lotHeight / 2
        );
        
        // Indicate road access on border sides
        if (lot.sides.some(s => s.isRoadBordering)) {
          ctx.fillStyle = '#3b82f6';
          const indicatorSize = 4;
          
          // Check each side for road access
          const isBorder = {
            north: row === 0,
            south: row === rows - 1,
            east: col === cols - 1,
            west: col === 0
          };
          
          if (isBorder.north) {
            ctx.beginPath();
            ctx.arc(x + lotWidth / 2, y + 2, indicatorSize, 0, Math.PI * 2);
            ctx.fill();
          }
          if (isBorder.south) {
            ctx.beginPath();
            ctx.arc(x + lotWidth / 2, y + lotHeight - 2, indicatorSize, 0, Math.PI * 2);
            ctx.fill();
          }
          if (isBorder.west) {
            ctx.beginPath();
            ctx.arc(x + 2, y + lotHeight / 2, indicatorSize, 0, Math.PI * 2);
            ctx.fill();
          }
          if (isBorder.east) {
            ctx.beginPath();
            ctx.arc(x + lotWidth - 2, y + lotHeight / 2, indicatorSize, 0, Math.PI * 2);
            ctx.fill();
          }
        }
        
        lotIndex++;
      }
    }

    // Draw scale
    ctx.fillStyle = '#64748b';
    ctx.font = '9px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`Échelle: 1:${Math.round(1 / scale)}`, 4, canvasHeight - 4);

  }, [lots, parentDimensions, includeInternalRoads, internalRoadWidth]);

  if (lots.length === 0) {
    return (
      <Card className={`p-3 bg-muted/30 border-dashed ${className}`}>
        <div className="h-28 flex items-center justify-center text-xs text-muted-foreground">
          Configurez les paramètres pour voir l'aperçu
        </div>
      </Card>
    );
  }

  return (
    <Card className={`overflow-hidden ${className}`}>
      <div className="p-2 border-b bg-muted/30">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium">Aperçu en temps réel</span>
          <div className="flex items-center gap-1">
            {validationStatus.isValid ? (
              <Badge variant="outline" className="text-[10px] h-5 bg-secondary text-secondary-foreground border-border">
                <CheckCircle2 className="h-3 w-3 mr-0.5" />
                Valide
              </Badge>
            ) : (
              <Badge variant="outline" className="text-[10px] h-5 bg-accent text-accent-foreground border-border">
                <AlertCircle className="h-3 w-3 mr-0.5" />
                À vérifier
              </Badge>
            )}
          </div>
        </div>
      </div>
      
      <div ref={containerRef} className="h-32 relative">
        <canvas 
          ref={canvasRef} 
          className="w-full h-full"
          style={{ imageRendering: 'crisp-edges' }}
        />
      </div>
      
      <div className="p-2 border-t bg-muted/20 text-[10px] text-muted-foreground">
        <div className="flex justify-between">
          <span>{lots.length} lots • {Math.round(validationStatus.totalArea).toLocaleString()} m²</span>
          <span>
            {!validationStatus.hasRoadAccess && '⚠️ Accès voirie '}
            {!validationStatus.areaMatch && '⚠️ Surface'}
          </span>
        </div>
      </div>
    </Card>
  );
};

export default LayoutPreview;

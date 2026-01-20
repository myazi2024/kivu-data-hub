import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { 
  Ruler, Upload, Pencil, Plus, Trash2, Save, RotateCcw, 
  Info, ArrowUp, ArrowDown, ArrowLeft, ArrowRight, Navigation,
  FileImage, FileText, Check, MousePointer, Move, ZoomIn, ZoomOut,
  Grid3X3, Compass, Mountain, Undo, Redo, Download, Eye, EyeOff
} from 'lucide-react';
import { SideDimension, PolygonPoint, DEFAULT_SKETCH_SETTINGS, SketchSettings } from './types';
import { useToast } from '@/hooks/use-toast';

interface ParcelSketchCreatorProps {
  initialSides?: SideDimension[];
  initialArea?: number;
  onSave: (sides: SideDimension[], gpsPoints?: Array<{ lat: number; lng: number; borne: string }>) => void;
  onCancel: () => void;
}

type CreationMode = 'draw' | 'import' | 'simple';
type DrawingTool = 'select' | 'draw' | 'move' | 'measure';
type PrecisionLevel = 'simple' | 'angles' | 'gps' | 'topo';

interface CanvasPoint {
  x: number;
  y: number;
}

interface DrawingState {
  points: CanvasPoint[];
  isDrawing: boolean;
  scale: number;
  offset: CanvasPoint;
  history: CanvasPoint[][];
  historyIndex: number;
}

const PRECISION_DESCRIPTIONS: Record<PrecisionLevel, { title: string; description: string; icon: React.ReactNode }> = {
  simple: {
    title: 'Forme + dimensions',
    description: 'Longueur de chaque côté uniquement',
    icon: <Ruler className="h-4 w-4" />
  },
  angles: {
    title: 'Dimensions + angles',
    description: 'Avec angles aux sommets (±0.1°)',
    icon: <Compass className="h-4 w-4" />
  },
  gps: {
    title: 'Géolocalisation GPS',
    description: 'Coordonnées de chaque borne (±5m)',
    icon: <Navigation className="h-4 w-4" />
  },
  topo: {
    title: 'Plan topographique',
    description: 'Altimétrie et courbes de niveau',
    icon: <Mountain className="h-4 w-4" />
  }
};

export const ParcelSketchCreator: React.FC<ParcelSketchCreatorProps> = ({
  initialSides,
  initialArea = 0,
  onSave,
  onCancel
}) => {
  const { toast } = useToast();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Mode et état principal
  const [mode, setMode] = useState<CreationMode>('simple');
  const [precisionLevel, setPrecisionLevel] = useState<PrecisionLevel>('simple');
  const [numberOfSides, setNumberOfSides] = useState(4);
  
  // Dimensions des côtés - quadrilatère = angles de 90° (car (4-2)*180/4 = 90)
  const [sides, setSides] = useState<SideDimension[]>(() => {
    if (initialSides && initialSides.length > 0) {
      return initialSides;
    }
    // Pour un quadrilatère, l'angle intérieur = (4-2)*180/4 = 90°
    return Array.from({ length: 4 }, (_, i) => ({
      id: crypto.randomUUID(),
      length: 0,
      angle: 90, // Correct: angle intérieur d'un rectangle
      isShared: false,
      isRoadBordering: false,
      roadType: 'none' as const
    }));
  });
  
  // Points GPS
  const [gpsPoints, setGpsPoints] = useState<Array<{ lat: string; lng: string; borne: string }>>([]);
  
  // Altimétrie (niveau topo)
  const [altimetryPoints, setAltimetryPoints] = useState<Array<{ borne: string; altitude: string }>>([]);
  
  // Import fichier
  const [importedFile, setImportedFile] = useState<File | null>(null);
  const [importPreviewUrl, setImportPreviewUrl] = useState<string>('');
  
  // État du dessin canvas
  const [drawingState, setDrawingState] = useState<DrawingState>({
    points: [],
    isDrawing: false,
    scale: 1,
    offset: { x: 0, y: 0 },
    history: [],
    historyIndex: -1
  });
  const [activeTool, setActiveTool] = useState<DrawingTool>('draw');
  const [showGrid, setShowGrid] = useState(true);
  const [showDimensions, setShowDimensions] = useState(true);
  const [metersPerPixel, setMetersPerPixel] = useState(0.1); // 10 pixels = 1 mètre

  // Initialiser les points GPS quand le nombre de côtés change
  useEffect(() => {
    setGpsPoints(prev => Array.from({ length: numberOfSides }, (_, i) => ({
      lat: prev[i]?.lat || '',
      lng: prev[i]?.lng || '',
      borne: `Borne ${i + 1}`
    })));
    
    setAltimetryPoints(prev => Array.from({ length: numberOfSides }, (_, i) => ({
      borne: `Borne ${i + 1}`,
      altitude: prev[i]?.altitude || ''
    })));
  }, [numberOfSides]);

  // Mettre à jour le nombre de côtés
  const updateNumberOfSides = (newCount: number) => {
    setNumberOfSides(newCount);
    const currentSides = [...sides];
    
    // Angles intérieurs d'un polygone régulier = (n-2) * 180 / n
    const interiorAngle = newCount >= 3 ? ((newCount - 2) * 180) / newCount : 90;
    const roundedAngle = Math.round(interiorAngle * 10) / 10;
    
    if (newCount > currentSides.length) {
      const newSides = Array.from({ length: newCount - currentSides.length }, () => ({
        id: crypto.randomUUID(),
        length: 0,
        angle: roundedAngle,
        isShared: false,
        isRoadBordering: false,
        roadType: 'none' as const
      }));
      // Mettre à jour les angles de tous les côtés
      const allSides = [...currentSides.map(s => ({ ...s, angle: roundedAngle })), ...newSides];
      setSides(allSides);
    } else {
      // Mettre à jour les angles des côtés restants
      setSides(currentSides.slice(0, newCount).map(s => ({ ...s, angle: roundedAngle })));
    }
  };

  // Mettre à jour un côté
  const updateSide = (index: number, updates: Partial<SideDimension>) => {
    setSides(sides.map((side, i) => i === index ? { ...side, ...updates } : side));
  };

  // Calculs géométriques
  const calculateApproxArea = useCallback(() => {
    if (sides.length < 3) return 0;
    
    const validSides = sides.filter(s => s.length > 0);
    if (validSides.length < 3) return 0;
    
    // Pour un quadrilatère
    if (sides.length === 4) {
      const avgLength = (sides[0].length + sides[2].length) / 2;
      const avgWidth = (sides[1].length + sides[3].length) / 2;
      return Math.round(avgLength * avgWidth);
    }
    
    // Pour un polygone régulier
    const avgSide = validSides.reduce((sum, s) => sum + s.length, 0) / validSides.length;
    const n = sides.length;
    return Math.round((n * avgSide * avgSide) / (4 * Math.tan(Math.PI / n)));
  }, [sides]);

  const calculatePerimeter = useCallback(() => {
    return sides.reduce((sum, side) => sum + (side.length || 0), 0);
  }, [sides]);

  // Calcul de surface à partir des points du dessin
  const calculateAreaFromPoints = useCallback((points: CanvasPoint[]): number => {
    if (points.length < 3) return 0;
    
    let area = 0;
    for (let i = 0; i < points.length; i++) {
      const j = (i + 1) % points.length;
      area += points[i].x * points[j].y;
      area -= points[j].x * points[i].y;
    }
    area = Math.abs(area) / 2;
    
    // Convertir en mètres carrés
    return Math.round(area * metersPerPixel * metersPerPixel);
  }, [metersPerPixel]);

  // Calcul du périmètre à partir des points
  const calculatePerimeterFromPoints = useCallback((points: CanvasPoint[]): number => {
    if (points.length < 2) return 0;
    
    let perimeter = 0;
    for (let i = 0; i < points.length; i++) {
      const j = (i + 1) % points.length;
      const dx = points[j].x - points[i].x;
      const dy = points[j].y - points[i].y;
      perimeter += Math.sqrt(dx * dx + dy * dy);
    }
    
    return Math.round(perimeter * metersPerPixel);
  }, [metersPerPixel]);

  // === GESTION DU CANVAS ===
  
  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Dessiner la grille
    if (showGrid) {
      ctx.strokeStyle = '#e5e7eb';
      ctx.lineWidth = 0.5;
      const gridSpacing = 20 * drawingState.scale;
      
      for (let x = 0; x <= canvas.width; x += gridSpacing) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
      }
      for (let y = 0; y <= canvas.height; y += gridSpacing) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
      }
    }
    
    // Dessiner les points et lignes
    const points = drawingState.points;
    if (points.length > 0) {
      // Remplir le polygone
      if (points.length >= 3) {
        ctx.beginPath();
        ctx.moveTo(points[0].x, points[0].y);
        for (let i = 1; i < points.length; i++) {
          ctx.lineTo(points[i].x, points[i].y);
        }
        ctx.closePath();
        ctx.fillStyle = 'rgba(34, 197, 94, 0.2)';
        ctx.fill();
      }
      
      // Dessiner les lignes
      ctx.beginPath();
      ctx.strokeStyle = '#16a34a';
      ctx.lineWidth = 2;
      ctx.moveTo(points[0].x, points[0].y);
      for (let i = 1; i < points.length; i++) {
        ctx.lineTo(points[i].x, points[i].y);
      }
      if (points.length >= 3) {
        ctx.closePath();
      }
      ctx.stroke();
      
      // Dessiner les sommets
      points.forEach((point, i) => {
        ctx.beginPath();
        ctx.arc(point.x, point.y, 6, 0, Math.PI * 2);
        ctx.fillStyle = '#16a34a';
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.stroke();
        
        // Numéro du sommet
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 10px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText((i + 1).toString(), point.x, point.y);
      });
      
      // Afficher les dimensions
      if (showDimensions && points.length >= 2) {
        ctx.fillStyle = '#374151';
        ctx.font = '12px sans-serif';
        
        for (let i = 0; i < points.length; i++) {
          const j = (i + 1) % points.length;
          if (j === 0 && points.length < 3) continue;
          
          const midX = (points[i].x + points[j].x) / 2;
          const midY = (points[i].y + points[j].y) / 2;
          const dx = points[j].x - points[i].x;
          const dy = points[j].y - points[i].y;
          const distance = Math.sqrt(dx * dx + dy * dy) * metersPerPixel;
          
          ctx.save();
          ctx.translate(midX, midY);
          
          // Fond blanc pour la lisibilité
          const text = `${distance.toFixed(1)}m`;
          const metrics = ctx.measureText(text);
          ctx.fillStyle = 'rgba(255,255,255,0.9)';
          ctx.fillRect(-metrics.width / 2 - 4, -8, metrics.width + 8, 16);
          
          ctx.fillStyle = '#374151';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(text, 0, 0);
          ctx.restore();
        }
      }
    }
    
    // Indicateur nord
    ctx.save();
    ctx.translate(canvas.width - 30, 30);
    ctx.beginPath();
    ctx.moveTo(0, -15);
    ctx.lineTo(5, 5);
    ctx.lineTo(0, 0);
    ctx.lineTo(-5, 5);
    ctx.closePath();
    ctx.fillStyle = '#ef4444';
    ctx.fill();
    ctx.fillStyle = '#374151';
    ctx.font = 'bold 10px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('N', 0, -20);
    ctx.restore();
    
    // Échelle
    ctx.save();
    ctx.translate(20, canvas.height - 20);
    const scaleLength = 50;
    const scaleMeters = Math.round(scaleLength * metersPerPixel);
    ctx.strokeStyle = '#374151';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(scaleLength, 0);
    ctx.moveTo(0, -5);
    ctx.lineTo(0, 5);
    ctx.moveTo(scaleLength, -5);
    ctx.lineTo(scaleLength, 5);
    ctx.stroke();
    ctx.fillStyle = '#374151';
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`${scaleMeters}m`, scaleLength / 2, 15);
    ctx.restore();
    
  }, [drawingState.points, drawingState.scale, showGrid, showDimensions, metersPerPixel]);

  useEffect(() => {
    if (mode === 'draw') {
      drawCanvas();
    }
  }, [mode, drawCanvas]);

  // Gestionnaires d'événements canvas
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (activeTool !== 'draw') return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const newPoints = [...drawingState.points, { x, y }];
    const newHistory = [...drawingState.history.slice(0, drawingState.historyIndex + 1), newPoints];
    
    setDrawingState(prev => ({
      ...prev,
      points: newPoints,
      history: newHistory,
      historyIndex: newHistory.length - 1
    }));
  };

  const handleUndo = () => {
    if (drawingState.historyIndex > 0) {
      setDrawingState(prev => ({
        ...prev,
        points: prev.history[prev.historyIndex - 1] || [],
        historyIndex: prev.historyIndex - 1
      }));
    } else if (drawingState.historyIndex === 0) {
      setDrawingState(prev => ({
        ...prev,
        points: [],
        historyIndex: -1
      }));
    }
  };

  const handleRedo = () => {
    if (drawingState.historyIndex < drawingState.history.length - 1) {
      setDrawingState(prev => ({
        ...prev,
        points: prev.history[prev.historyIndex + 1],
        historyIndex: prev.historyIndex + 1
      }));
    }
  };

  const handleClearCanvas = () => {
    setDrawingState({
      points: [],
      isDrawing: false,
      scale: 1,
      offset: { x: 0, y: 0 },
      history: [],
      historyIndex: -1
    });
  };

  const handleZoom = (delta: number) => {
    setDrawingState(prev => ({
      ...prev,
      scale: Math.max(0.5, Math.min(3, prev.scale + delta))
    }));
  };

  // Convertir les points du canvas en dimensions - retourne les nouveaux côtés
  const convertPointsToSides = useCallback((): SideDimension[] => {
    const points = drawingState.points;
    if (points.length < 3) return [];
    
    const n = points.length;
    const newSides: SideDimension[] = points.map((point, i) => {
      const nextPoint = points[(i + 1) % n];
      const prevPoint = points[(i - 1 + n) % n];
      
      // Longueur du côté
      const dx = nextPoint.x - point.x;
      const dy = nextPoint.y - point.y;
      const length = Math.sqrt(dx * dx + dy * dy) * metersPerPixel;
      
      // Calculer l'angle intérieur au sommet i
      // Vecteur vers le point précédent
      const v1x = prevPoint.x - point.x;
      const v1y = prevPoint.y - point.y;
      // Vecteur vers le point suivant
      const v2x = nextPoint.x - point.x;
      const v2y = nextPoint.y - point.y;
      
      // Produit scalaire et cross product pour l'angle
      const dot = v1x * v2x + v1y * v2y;
      const cross = v1x * v2y - v1y * v2x;
      const magnitude1 = Math.sqrt(v1x * v1x + v1y * v1y);
      const magnitude2 = Math.sqrt(v2x * v2x + v2y * v2y);
      
      let angleDegrees = 90; // default
      if (magnitude1 > 0 && magnitude2 > 0) {
        const cosAngle = Math.max(-1, Math.min(1, dot / (magnitude1 * magnitude2)));
        const angleRad = Math.acos(cosAngle);
        angleDegrees = angleRad * (180 / Math.PI);
        // Ajuster pour l'angle intérieur si le polygone est orienté dans le sens horaire
        if (cross < 0) {
          angleDegrees = 360 - angleDegrees;
        }
      }
      
      return {
        id: crypto.randomUUID(),
        length: Math.round(length * 10) / 10,
        angle: Math.round(angleDegrees * 10) / 10,
        isShared: false,
        isRoadBordering: false,
        roadType: 'none' as const
      };
    });
    
    setSides(newSides);
    setNumberOfSides(newSides.length);
    
    toast({
      title: 'Dimensions extraites',
      description: `${newSides.length} côtés détectés avec une surface de ${calculateAreaFromPoints(points)} m²`
    });
    
    return newSides;
  }, [drawingState.points, metersPerPixel, calculateAreaFromPoints, toast]);

  // Gérer l'import de fichier
  const handleFileImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Nettoyer l'ancienne URL si elle existe
      if (importPreviewUrl) {
        URL.revokeObjectURL(importPreviewUrl);
      }
      
      setImportedFile(file);
      
      // Créer preview pour les images
      if (file.type.startsWith('image/')) {
        const url = URL.createObjectURL(file);
        setImportPreviewUrl(url);
      } else {
        setImportPreviewUrl('');
      }
      
      toast({
        title: 'Fichier importé',
        description: `${file.name} sera analysé pour extraire les dimensions.`
      });
    }
    
    // Reset le champ pour permettre de réimporter le même fichier
    event.target.value = '';
  };
  
  // Cleanup URL on unmount
  React.useEffect(() => {
    return () => {
      if (importPreviewUrl) {
        URL.revokeObjectURL(importPreviewUrl);
      }
    };
  }, [importPreviewUrl]);

  // Sauvegarder
  const handleSave = () => {
    let finalSides = sides;
    
    // Si on est en mode dessin, convertir les points et utiliser le résultat directement
    if (mode === 'draw' && drawingState.points.length >= 3) {
      finalSides = convertPointsToSides();
      if (finalSides.length === 0) {
        toast({
          title: 'Erreur',
          description: 'Impossible de convertir les points en côtés.',
          variant: 'destructive'
        });
        return;
      }
    }
    
    const validSides = finalSides.filter(s => s.length > 0);
    if (validSides.length < 3) {
      toast({
        title: 'Dimensions insuffisantes',
        description: 'Veuillez renseigner au moins 3 côtés avec des dimensions valides.',
        variant: 'destructive'
      });
      return;
    }
    
    const gpsPointsFormatted = gpsPoints
      .filter(p => p.lat && p.lng)
      .map(p => ({
        lat: parseFloat(p.lat),
        lng: parseFloat(p.lng),
        borne: p.borne
      }));
    
    onSave(finalSides, gpsPointsFormatted.length > 0 ? gpsPointsFormatted : undefined);
    toast({
      title: 'Croquis enregistré',
      description: 'Les dimensions de la parcelle ont été sauvegardées.'
    });
  };

  const sideLabels = ['Nord', 'Est', 'Sud', 'Ouest', 'Nord-Est', 'Sud-Est', 'Sud-Ouest', 'Nord-Ouest'];
  const getSideLabel = (index: number) => sideLabels[index] || `Côté ${index + 1}`;
  const getSideIcon = (index: number) => {
    const icons = [
      <ArrowUp key="n" className="h-3 w-3" />,
      <ArrowRight key="e" className="h-3 w-3" />,
      <ArrowDown key="s" className="h-3 w-3" />,
      <ArrowLeft key="w" className="h-3 w-3" />
    ];
    return icons[index] || null;
  };

  return (
    <Card className="border-primary/20">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Ruler className="h-4 w-4 text-primary" />
          Créer le croquis de la parcelle
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Choix du mode de création */}
        <Tabs value={mode} onValueChange={(v) => setMode(v as CreationMode)}>
          <TabsList className="grid grid-cols-3 w-full">
            <TabsTrigger value="simple" className="gap-1 text-xs">
              <Pencil className="h-3 w-3" />
              Saisie simple
            </TabsTrigger>
            <TabsTrigger value="draw" className="gap-1 text-xs">
              <Ruler className="h-3 w-3" />
              Dessin
            </TabsTrigger>
            <TabsTrigger value="import" className="gap-1 text-xs">
              <Upload className="h-3 w-3" />
              Import
            </TabsTrigger>
          </TabsList>

          {/* Mode Saisie Simple */}
          <TabsContent value="simple" className="space-y-4 mt-4">
            {/* Niveau de précision - Cards visuelles */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">Niveau de précision</Label>
              <div className="grid grid-cols-2 gap-2">
                {(Object.keys(PRECISION_DESCRIPTIONS) as PrecisionLevel[]).map((level) => (
                  <button
                    key={level}
                    type="button"
                    onClick={() => setPrecisionLevel(level)}
                    className={`p-3 rounded-lg border-2 text-left transition-all ${
                      precisionLevel === level 
                        ? 'border-primary bg-primary/5' 
                        : 'border-muted hover:border-primary/50'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className={precisionLevel === level ? 'text-primary' : 'text-muted-foreground'}>
                        {PRECISION_DESCRIPTIONS[level].icon}
                      </span>
                      <span className="font-medium text-sm">{PRECISION_DESCRIPTIONS[level].title}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">{PRECISION_DESCRIPTIONS[level].description}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Nombre de côtés */}
            <div className="space-y-2">
              <Label className="text-sm">Nombre de côtés</Label>
              <Select value={numberOfSides.toString()} onValueChange={(v) => updateNumberOfSides(parseInt(v))}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[3, 4, 5, 6, 7, 8].map(n => (
                    <SelectItem key={n} value={n.toString()}>{n} côtés</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Dimensions des côtés */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">Dimensions des côtés (en mètres)</Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {sides.map((side, index) => (
                  <div key={side.id} className="flex items-center gap-2 p-2 bg-muted/30 rounded-lg">
                    <div className="flex items-center gap-1 min-w-[80px] text-sm">
                      {getSideIcon(index)}
                      <span className="font-medium">{getSideLabel(index)}</span>
                    </div>
                    <Input
                      type="number"
                      value={side.length || ''}
                      onChange={(e) => updateSide(index, { length: parseFloat(e.target.value) || 0 })}
                      placeholder="0"
                      className="h-9 flex-1"
                    />
                    {(precisionLevel === 'angles' || precisionLevel === 'gps' || precisionLevel === 'topo') && (
                      <div className="flex items-center gap-1">
                        <Input
                          type="number"
                          value={side.angle || 90}
                          onChange={(e) => updateSide(index, { angle: parseFloat(e.target.value) || 90 })}
                          placeholder="90"
                          className="h-9 w-16"
                          min={0}
                          max={180}
                        />
                        <span className="text-xs text-muted-foreground">°</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Coordonnées GPS si niveau GPS ou topo */}
            {(precisionLevel === 'gps' || precisionLevel === 'topo') && (
              <div className="space-y-3 pt-4 border-t">
                <Label className="text-sm font-medium flex items-center gap-2">
                  <Navigation className="h-4 w-4 text-primary" />
                  Coordonnées GPS des bornes
                </Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {gpsPoints.map((point, index) => (
                    <div key={index} className="p-3 bg-muted/30 rounded-lg space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium">{point.borne}</span>
                        {precisionLevel === 'topo' && (
                          <div className="flex items-center gap-1">
                            <Input
                              type="number"
                              value={altimetryPoints[index]?.altitude || ''}
                              onChange={(e) => {
                                const newPoints = [...altimetryPoints];
                                newPoints[index] = { ...altimetryPoints[index], altitude: e.target.value };
                                setAltimetryPoints(newPoints);
                              }}
                              placeholder="Alt."
                              className="h-7 w-16 text-xs"
                            />
                            <span className="text-xs text-muted-foreground">m</span>
                          </div>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <Input
                          type="number"
                          step="0.000001"
                          value={point.lat}
                          onChange={(e) => {
                            const newPoints = [...gpsPoints];
                            newPoints[index] = { ...point, lat: e.target.value };
                            setGpsPoints(newPoints);
                          }}
                          placeholder="Latitude"
                          className="h-8 text-xs"
                        />
                        <Input
                          type="number"
                          step="0.000001"
                          value={point.lng}
                          onChange={(e) => {
                            const newPoints = [...gpsPoints];
                            newPoints[index] = { ...point, lng: e.target.value };
                            setGpsPoints(newPoints);
                          }}
                          placeholder="Longitude"
                          className="h-8 text-xs"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Résumé calculé */}
            <div className="grid grid-cols-2 gap-3 pt-4 border-t">
              <div className="bg-primary/5 rounded-lg p-3 text-center">
                <div className="text-xs text-muted-foreground">Surface calculée</div>
                <div className="text-xl font-bold text-primary">{calculateApproxArea().toLocaleString()} m²</div>
              </div>
              <div className="bg-primary/5 rounded-lg p-3 text-center">
                <div className="text-xs text-muted-foreground">Périmètre</div>
                <div className="text-xl font-bold text-primary">{calculatePerimeter().toLocaleString()} m</div>
              </div>
            </div>
          </TabsContent>

          {/* Mode Dessin Interactif */}
          <TabsContent value="draw" className="space-y-4 mt-4">
            {/* Barre d'outils */}
            <div className="flex flex-wrap items-center gap-2 p-2 bg-muted/30 rounded-lg">
              <div className="flex gap-1">
                <Button
                  size="sm"
                  variant={activeTool === 'draw' ? 'default' : 'outline'}
                  onClick={() => setActiveTool('draw')}
                  className="h-8 w-8 p-0"
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant={activeTool === 'select' ? 'default' : 'outline'}
                  onClick={() => setActiveTool('select')}
                  className="h-8 w-8 p-0"
                >
                  <MousePointer className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant={activeTool === 'move' ? 'default' : 'outline'}
                  onClick={() => setActiveTool('move')}
                  className="h-8 w-8 p-0"
                >
                  <Move className="h-4 w-4" />
                </Button>
              </div>
              
              <div className="h-6 w-px bg-border" />
              
              <div className="flex gap-1">
                <Button size="sm" variant="outline" onClick={handleUndo} className="h-8 w-8 p-0" disabled={drawingState.historyIndex < 0}>
                  <Undo className="h-4 w-4" />
                </Button>
                <Button size="sm" variant="outline" onClick={handleRedo} className="h-8 w-8 p-0" disabled={drawingState.historyIndex >= drawingState.history.length - 1}>
                  <Redo className="h-4 w-4" />
                </Button>
              </div>
              
              <div className="h-6 w-px bg-border" />
              
              <div className="flex gap-1">
                <Button size="sm" variant="outline" onClick={() => handleZoom(0.25)} className="h-8 w-8 p-0">
                  <ZoomIn className="h-4 w-4" />
                </Button>
                <Button size="sm" variant="outline" onClick={() => handleZoom(-0.25)} className="h-8 w-8 p-0">
                  <ZoomOut className="h-4 w-4" />
                </Button>
              </div>
              
              <div className="h-6 w-px bg-border" />
              
              <Button
                size="sm"
                variant={showGrid ? 'secondary' : 'outline'}
                onClick={() => setShowGrid(!showGrid)}
                className="h-8 w-8 p-0"
              >
                <Grid3X3 className="h-4 w-4" />
              </Button>
              
              <Button
                size="sm"
                variant={showDimensions ? 'secondary' : 'outline'}
                onClick={() => setShowDimensions(!showDimensions)}
                className="h-8 w-8 p-0"
              >
                <Ruler className="h-4 w-4" />
              </Button>
              
              <div className="flex-1" />
              
              <Button size="sm" variant="destructive" onClick={handleClearCanvas} className="h-8">
                <Trash2 className="h-4 w-4 mr-1" />
                Effacer
              </Button>
            </div>
            
            {/* Échelle */}
            <div className="flex items-center gap-3">
              <Label className="text-xs whitespace-nowrap">Échelle: 1px =</Label>
              <Slider
                value={[metersPerPixel * 100]}
                onValueChange={([v]) => setMetersPerPixel(v / 100)}
                min={5}
                max={50}
                step={1}
                className="flex-1"
              />
              <span className="text-xs font-medium w-16">{metersPerPixel.toFixed(2)} m</span>
            </div>
            
            {/* Canvas */}
            <div ref={containerRef} className="relative border rounded-lg overflow-hidden bg-white">
              <canvas
                ref={canvasRef}
                width={600}
                height={400}
                onClick={handleCanvasClick}
                className="w-full cursor-crosshair"
                style={{ cursor: activeTool === 'draw' ? 'crosshair' : activeTool === 'move' ? 'move' : 'default' }}
              />
            </div>
            
            {/* Indicateurs */}
            <div className="flex flex-wrap gap-3">
              <Badge variant="outline" className="gap-1">
                <span className="text-muted-foreground">Points:</span>
                {drawingState.points.length}
              </Badge>
              {drawingState.points.length >= 3 && (
                <>
                  <Badge variant="outline" className="gap-1">
                    <span className="text-muted-foreground">Surface:</span>
                    {calculateAreaFromPoints(drawingState.points).toLocaleString()} m²
                  </Badge>
                  <Badge variant="outline" className="gap-1">
                    <span className="text-muted-foreground">Périmètre:</span>
                    {calculatePerimeterFromPoints(drawingState.points).toLocaleString()} m
                  </Badge>
                </>
              )}
            </div>
            
            {drawingState.points.length >= 3 && (
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  Cliquez pour ajouter des sommets. Les dimensions seront automatiquement calculées lors de l'enregistrement.
                </AlertDescription>
              </Alert>
            )}
          </TabsContent>

          {/* Mode Import */}
          <TabsContent value="import" className="space-y-4 mt-4">
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                Importez un plan géomètre au format PDF, image (JPG, PNG) ou fichier DXF pour extraire automatiquement les dimensions.
              </AlertDescription>
            </Alert>
            
            <div className="border-2 border-dashed rounded-lg p-6 text-center">
              <input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,.dxf"
                onChange={handleFileImport}
                className="hidden"
                id="file-import"
              />
              <label htmlFor="file-import" className="cursor-pointer">
                <div className="flex flex-col items-center gap-3">
                  {importedFile ? (
                    <>
                      <div className="h-12 w-12 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
                        <Check className="h-6 w-6 text-green-600" />
                      </div>
                      <p className="font-medium">{importedFile.name}</p>
                      <p className="text-sm text-muted-foreground">
                        Fichier prêt à être analysé
                      </p>
                    </>
                  ) : (
                    <>
                      <Upload className="h-10 w-10 text-muted-foreground" />
                      <div>
                        <p className="font-medium">Glissez un fichier ici</p>
                        <p className="text-sm text-muted-foreground">
                          ou cliquez pour sélectionner (PDF, Image, DXF)
                        </p>
                      </div>
                    </>
                  )}
                </div>
              </label>
            </div>
            
            {/* Preview de l'image importée */}
            {importPreviewUrl && (
              <div className="border rounded-lg overflow-hidden">
                <img src={importPreviewUrl} alt="Preview" className="w-full h-auto max-h-64 object-contain bg-muted/30" />
              </div>
            )}

            {importedFile && (
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => { setImportedFile(null); setImportPreviewUrl(''); }} className="flex-1">
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Changer de fichier
                </Button>
                <Button className="flex-1">
                  <FileText className="h-4 w-4 mr-2" />
                  Analyser
                </Button>
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Actions */}
        <div className="flex gap-3 pt-4 border-t">
          <Button variant="outline" onClick={onCancel} className="flex-1">
            Annuler
          </Button>
          <Button onClick={handleSave} className="flex-1 gap-2">
            <Save className="h-4 w-4" />
            Enregistrer le croquis
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default ParcelSketchCreator;

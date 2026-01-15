import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Ruler, Upload, Pencil, Plus, Trash2, Save, RotateCcw, 
  Info, ArrowUp, ArrowDown, ArrowLeft, ArrowRight, Navigation,
  FileImage, FileText, Check
} from 'lucide-react';
import { SideDimension } from './types';
import { useToast } from '@/hooks/use-toast';

interface ParcelSketchCreatorProps {
  initialSides?: SideDimension[];
  initialArea?: number;
  onSave: (sides: SideDimension[], gpsPoints?: Array<{ lat: number; lng: number; borne: string }>) => void;
  onCancel: () => void;
}

type CreationMode = 'draw' | 'import' | 'simple';

export const ParcelSketchCreator: React.FC<ParcelSketchCreatorProps> = ({
  initialSides,
  initialArea = 0,
  onSave,
  onCancel
}) => {
  const { toast } = useToast();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [mode, setMode] = useState<CreationMode>('simple');
  const [numberOfSides, setNumberOfSides] = useState(4);
  const [sides, setSides] = useState<SideDimension[]>(() => {
    if (initialSides && initialSides.length > 0) {
      return initialSides;
    }
    return Array.from({ length: 4 }, (_, i) => ({
      id: crypto.randomUUID(),
      length: 0,
      angle: 90,
      isShared: false,
      isRoadBordering: false,
      roadType: 'none' as const
    }));
  });
  const [gpsPoints, setGpsPoints] = useState<Array<{ lat: string; lng: string; borne: string }>>([]);
  const [precisionLevel, setPrecisionLevel] = useState<'simple' | 'angles' | 'gps' | 'topo'>('simple');
  const [importedFile, setImportedFile] = useState<File | null>(null);

  // Mettre à jour le nombre de côtés
  const updateNumberOfSides = (newCount: number) => {
    setNumberOfSides(newCount);
    const currentSides = [...sides];
    
    if (newCount > currentSides.length) {
      // Ajouter des côtés
      const newSides = Array.from({ length: newCount - currentSides.length }, () => ({
        id: crypto.randomUUID(),
        length: 0,
        angle: 360 / newCount,
        isShared: false,
        isRoadBordering: false,
        roadType: 'none' as const
      }));
      setSides([...currentSides, ...newSides]);
    } else {
      // Réduire le nombre
      setSides(currentSides.slice(0, newCount));
    }
    
    // Mettre à jour les bornes GPS
    setGpsPoints(Array.from({ length: newCount }, (_, i) => ({
      lat: gpsPoints[i]?.lat || '',
      lng: gpsPoints[i]?.lng || '',
      borne: `Borne ${i + 1}`
    })));
  };

  // Mettre à jour un côté
  const updateSide = (index: number, updates: Partial<SideDimension>) => {
    setSides(sides.map((side, i) => i === index ? { ...side, ...updates } : side));
  };

  // Calculer la surface approximative
  const calculateApproxArea = () => {
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
  };

  // Calculer le périmètre
  const calculatePerimeter = () => {
    return sides.reduce((sum, side) => sum + (side.length || 0), 0);
  };

  // Gérer l'import de fichier
  const handleFileImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setImportedFile(file);
      toast({
        title: 'Fichier importé',
        description: `${file.name} sera analysé pour extraire les dimensions.`
      });
    }
  };

  // Sauvegarder
  const handleSave = () => {
    const validSides = sides.filter(s => s.length > 0);
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
    
    onSave(sides, gpsPointsFormatted.length > 0 ? gpsPointsFormatted : undefined);
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
            {/* Niveau de précision */}
            <div className="space-y-2">
              <Label className="text-sm">Niveau de précision</Label>
              <Select value={precisionLevel} onValueChange={(v) => setPrecisionLevel(v as typeof precisionLevel)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="simple">Forme + dimensions des côtés</SelectItem>
                  <SelectItem value="angles">Dimensions + angles aux sommets</SelectItem>
                  <SelectItem value="gps">Géolocalisation GPS des bornes</SelectItem>
                  <SelectItem value="topo">Plan topographique complet</SelectItem>
                </SelectContent>
              </Select>
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
                    {precisionLevel !== 'simple' && (
                      <Input
                        type="number"
                        value={side.angle || 90}
                        onChange={(e) => updateSide(index, { angle: parseFloat(e.target.value) || 90 })}
                        placeholder="90"
                        className="h-9 w-16"
                        min={0}
                        max={180}
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Coordonnées GPS si niveau GPS ou topo */}
            {(precisionLevel === 'gps' || precisionLevel === 'topo') && (
              <div className="space-y-3 pt-4 border-t">
                <Label className="text-sm font-medium flex items-center gap-2">
                  <Navigation className="h-4 w-4" />
                  Coordonnées GPS des bornes
                </Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {gpsPoints.map((point, index) => (
                    <div key={index} className="p-2 bg-muted/30 rounded-lg space-y-2">
                      <div className="text-xs font-medium">{point.borne}</div>
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

          {/* Mode Dessin */}
          <TabsContent value="draw" className="space-y-4 mt-4">
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                Le mode dessin interactif sera disponible prochainement. Utilisez la saisie simple en attendant.
              </AlertDescription>
            </Alert>
            <div className="aspect-video bg-muted/30 rounded-lg border-2 border-dashed flex items-center justify-center">
              <div className="text-center text-muted-foreground">
                <Pencil className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>Zone de dessin</p>
              </div>
            </div>
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

            {importedFile && (
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setImportedFile(null)} className="flex-1">
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

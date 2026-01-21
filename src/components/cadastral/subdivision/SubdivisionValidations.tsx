import React, { useMemo, useState, useEffect } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { 
  Check, X, AlertTriangle, Info, 
  Route, Square, Ruler, Calendar, ChevronDown, ChevronUp,
  Calculator, Percent, MapPin, FileCheck, RefreshCw, ArrowRight,
  HelpCircle, Zap, Eye, Shield
} from 'lucide-react';
import { LotData } from './types';

// Validation result interface
export interface ValidationResult {
  id: string;
  category: 'surface' | 'access' | 'legal' | 'technical';
  label: string;
  status: 'valid' | 'invalid' | 'warning' | 'info' | 'pending';
  message: string;
  details?: string;
  value?: number | string;
  expected?: number | string;
  icon: React.ReactNode;
  fixSuggestion?: string;
  autoFixable?: boolean;
  priority: number; // 1 = critical, 2 = high, 3 = medium, 4 = low
}

// Configuration interface
export interface ValidationConfig {
  minLotAreaSqm: number;
  maxLotAreaSqm: number;
  tolerancePercent: number;
  requireRoadAccess: boolean;
  minRoadWidth: number;
  requireTerrainVisit: boolean;
  maxLotsCount: number;
  minLotsCount: number;
  maxRoadAccesslessPercent: number;
}

// Default validation configuration based on DRC regulations
const DEFAULT_CONFIG: ValidationConfig = {
  minLotAreaSqm: 150,
  maxLotAreaSqm: 50000,
  tolerancePercent: 2,
  requireRoadAccess: true,
  minRoadWidth: 6,
  requireTerrainVisit: true,
  maxLotsCount: 50,
  minLotsCount: 2,
  maxRoadAccesslessPercent: 20,
};

interface SubdivisionValidationsProps {
  lots: LotData[];
  parentParcelArea: number;
  internalRoadsArea?: number;
  reservedArea?: number;
  config?: Partial<ValidationConfig>;
  onValidationChange?: (isValid: boolean, validations: ValidationResult[]) => void;
  onAutoFix?: (validationId: string) => void;
  showDetails?: boolean;
  compact?: boolean;
}

export const SubdivisionValidations: React.FC<SubdivisionValidationsProps> = ({
  lots,
  parentParcelArea,
  internalRoadsArea = 0,
  reservedArea = 0,
  config: userConfig,
  onValidationChange,
  onAutoFix,
  showDetails = true,
  compact = false,
}) => {
  const [expandedCategories, setExpandedCategories] = useState<string[]>(
    compact ? [] : ['surface', 'access']
  );
  
  const config = { ...DEFAULT_CONFIG, ...userConfig };

  // Calculate validation results
  const validations = useMemo(() => {
    const results: ValidationResult[] = [];
    
    // ============ SURFACE VALIDATIONS ============
    
    // Calculate total lots area
    const totalLotsArea = lots.reduce((sum, lot) => sum + (lot.areaSqm || 0), 0);
    const availableArea = parentParcelArea - internalRoadsArea - reservedArea;
    const areaDifference = Math.abs(availableArea - totalLotsArea);
    const areaDifferencePercent = parentParcelArea > 0 
      ? (areaDifference / parentParcelArea) * 100 
      : 0;
    
    // V1: Total area match - CRITICAL
    const areaMatchStatus = totalLotsArea === 0 
      ? 'pending'
      : areaDifferencePercent <= config.tolerancePercent 
        ? 'valid' 
        : areaDifferencePercent <= config.tolerancePercent * 2.5 
          ? 'warning' 
          : 'invalid';
    
    results.push({
      id: 'total-area-match',
      category: 'surface',
      label: 'Correspondance des surfaces',
      status: areaMatchStatus,
      priority: 1,
      message: totalLotsArea === 0
        ? 'Aucune surface définie pour les lots'
        : areaMatchStatus === 'valid'
          ? `Les surfaces correspondent (écart: ${areaDifferencePercent.toFixed(2)}%)`
          : areaMatchStatus === 'warning'
            ? `Écart de ${areaDifferencePercent.toFixed(2)}% - vérification recommandée`
            : `Écart important: ${areaDifferencePercent.toFixed(2)}% (tolérance: ${config.tolerancePercent}%)`,
      details: `Parcelle mère: ${parentParcelArea.toLocaleString()} m² | Voiries internes: ${internalRoadsArea.toLocaleString()} m² | Réserves: ${reservedArea.toLocaleString()} m² | Disponible: ${availableArea.toLocaleString()} m² | Total lots: ${totalLotsArea.toLocaleString()} m²`,
      value: totalLotsArea,
      expected: availableArea,
      icon: <Calculator className="h-4 w-4" />,
      fixSuggestion: totalLotsArea > availableArea 
        ? 'Réduisez la surface de certains lots ou augmentez les voiries/réserves'
        : 'Augmentez la surface des lots ou répartissez les espaces résiduels',
    });

    // V2: Surface coverage ratio
    const coveragePercent = parentParcelArea > 0 
      ? (totalLotsArea / parentParcelArea) * 100 
      : 0;
    const roadsReservesPercent = parentParcelArea > 0
      ? ((internalRoadsArea + reservedArea) / parentParcelArea) * 100
      : 0;
    
    results.push({
      id: 'surface-coverage',
      category: 'surface',
      label: 'Taux d\'occupation',
      status: coveragePercent === 0 
        ? 'pending'
        : coveragePercent >= 70 && coveragePercent <= 95 
          ? 'valid' 
          : coveragePercent > 95
            ? 'warning'
            : 'info',
      priority: 3,
      message: coveragePercent === 0
        ? 'Calculez les surfaces des lots'
        : `${coveragePercent.toFixed(1)}% en lots, ${roadsReservesPercent.toFixed(1)}% en voiries/réserves`,
      details: `Lots: ${totalLotsArea.toLocaleString()} m² | Voiries: ${internalRoadsArea.toLocaleString()} m² | Réserves: ${reservedArea.toLocaleString()} m²`,
      value: `${coveragePercent.toFixed(1)}%`,
      icon: <Percent className="h-4 w-4" />,
    });

    // V3: Minimum lot area check
    const lotsBelowMinArea = lots.filter(lot => 
      lot.areaSqm > 0 && lot.areaSqm < config.minLotAreaSqm
    );
    
    results.push({
      id: 'min-lot-area',
      category: 'surface',
      label: 'Surface minimale',
      status: lots.length === 0 
        ? 'pending'
        : lotsBelowMinArea.length === 0 
          ? 'valid' 
          : 'invalid',
      priority: 1,
      message: lots.length === 0
        ? 'Ajoutez des lots pour valider'
        : lotsBelowMinArea.length === 0
          ? `Tous les lots ≥ ${config.minLotAreaSqm} m²`
          : `${lotsBelowMinArea.length} lot(s) < ${config.minLotAreaSqm} m² (min. réglementaire)`,
      details: lotsBelowMinArea.length > 0
        ? `Lots non conformes: ${lotsBelowMinArea.map(l => `${l.lotNumber} (${l.areaSqm.toLocaleString()} m²)`).join(', ')}`
        : lots.length > 0 
          ? `Plus petit lot: ${Math.min(...lots.filter(l => l.areaSqm > 0).map(l => l.areaSqm)).toLocaleString()} m²`
          : undefined,
      value: lotsBelowMinArea.length,
      expected: 0,
      icon: <Ruler className="h-4 w-4" />,
      fixSuggestion: 'Agrandissez les lots concernés ou fusionnez-les avec des lots adjacents',
      autoFixable: false,
    });

    // V4: Check for lots without defined area
    const lotsWithoutArea = lots.filter(lot => !lot.areaSqm || lot.areaSqm === 0);
    if (lots.length > 0) {
      results.push({
        id: 'lots-area-defined',
        category: 'surface',
        label: 'Surfaces définies',
        status: lotsWithoutArea.length === 0 ? 'valid' : lotsWithoutArea.length < lots.length ? 'warning' : 'invalid',
        priority: 2,
        message: lotsWithoutArea.length === 0
          ? `${lots.length} lot(s) avec surfaces calculées`
          : `${lotsWithoutArea.length}/${lots.length} lot(s) sans surface`,
        details: lotsWithoutArea.length > 0
          ? `Lots à compléter: ${lotsWithoutArea.map(l => l.lotNumber).join(', ')}`
          : undefined,
        icon: <Square className="h-4 w-4" />,
        fixSuggestion: 'Définissez les dimensions de chaque côté pour calculer la surface automatiquement',
      });
    }

    // ============ ACCESS VALIDATIONS ============
    
    // V5: Road access check - considère isRoadBordering uniquement (pas besoin de vérifier roadType !== 'none')
    // Si isRoadBordering est true, le lot a un accès à une route
    const lotsWithRoadAccess = lots.filter(lot => 
      lot.sides.some(side => side.isRoadBordering)
    );
    const lotsWithoutRoadAccess = lots.filter(lot => 
      !lot.sides.some(side => side.isRoadBordering)
    );
    const accessPercent = lots.length > 0 
      ? (lotsWithRoadAccess.length / lots.length) * 100 
      : 0;
    
    // Calcul du seuil maximum de lots sans accès
    const maxLotsWithoutAccess = Math.ceil(lots.length * (config.maxRoadAccesslessPercent / 100));
    
    results.push({
      id: 'road-access',
      category: 'access',
      label: 'Accès voirie directe',
      status: lots.length === 0 
        ? 'pending'
        : lotsWithoutRoadAccess.length === 0 
          ? 'valid' 
          : lotsWithoutRoadAccess.length <= maxLotsWithoutAccess
            ? 'warning'
            : config.requireRoadAccess 
              ? 'invalid' 
              : 'warning',
      priority: config.requireRoadAccess ? 1 : 2,
      message: lots.length === 0
        ? 'Ajoutez des lots pour valider'
        : lotsWithoutRoadAccess.length === 0
          ? 'Tous les lots ont un accès direct à la voirie'
          : `${lotsWithoutRoadAccess.length} lot(s) sans accès direct (${(100 - accessPercent).toFixed(0)}%)`,
      details: lotsWithoutRoadAccess.length > 0
        ? `Lots sans accès: ${lotsWithoutRoadAccess.map(l => l.lotNumber).join(', ')} - Prévoir des servitudes de passage ou voirie interne`
        : `${lotsWithRoadAccess.length} lot(s) desservi(s) par voirie`,
      value: lotsWithRoadAccess.length,
      expected: lots.length,
      icon: <Route className="h-4 w-4" />,
      fixSuggestion: lotsWithoutRoadAccess.length > 0 
        ? 'Créez une voirie interne ou marquez les côtés bordant une route existante'
        : undefined,
      autoFixable: false,
    });

    // V6: Access roads types
    const existingRoads = lots.flatMap(l => 
      l.sides.filter(s => s.isRoadBordering && s.roadType === 'existing')
    );
    const createdRoads = lots.flatMap(l => 
      l.sides.filter(s => s.isRoadBordering && s.roadType === 'created')
    );
    
    if (existingRoads.length > 0 || createdRoads.length > 0) {
      results.push({
        id: 'road-types',
        category: 'access',
        label: 'Types de voiries',
        status: 'info',
        priority: 4,
        message: `${existingRoads.length} accès sur voies existantes, ${createdRoads.length} sur voies à créer`,
        icon: <MapPin className="h-4 w-4" />,
      });
    }

    // ============ LEGAL VALIDATIONS ============
    
    // V7: Number of lots
    results.push({
      id: 'lots-count',
      category: 'legal',
      label: 'Nombre de lots',
      status: lots.length === 0 
        ? 'pending'
        : lots.length >= config.minLotsCount && lots.length <= config.maxLotsCount 
          ? 'valid' 
          : lots.length < config.minLotsCount
            ? 'invalid'
            : 'warning',
      priority: 2,
      message: lots.length === 0
        ? 'Aucun lot défini'
        : lots.length >= config.minLotsCount && lots.length <= config.maxLotsCount
          ? `${lots.length} lots (conforme: ${config.minLotsCount}-${config.maxLotsCount})`
          : lots.length < config.minLotsCount
            ? `${lots.length} lot(s) - minimum requis: ${config.minLotsCount}`
            : `${lots.length} lots - au-delà de ${config.maxLotsCount}, autorisation spéciale requise`,
      value: lots.length,
      icon: <FileCheck className="h-4 w-4" />,
    });

    // V8: Lot numbering validation
    const lotNumbers = lots.map(l => l.lotNumber);
    const uniqueNumbers = new Set(lotNumbers);
    const hasDuplicateNumbers = uniqueNumbers.size !== lotNumbers.length;
    const hasEmptyNumbers = lotNumbers.some(n => !n || n.trim() === '');
    
    if (lots.length > 0) {
      results.push({
        id: 'lot-numbering',
        category: 'legal',
        label: 'Numérotation',
        status: hasDuplicateNumbers || hasEmptyNumbers ? 'invalid' : 'valid',
        priority: 2,
        message: hasDuplicateNumbers 
          ? 'Numéros de lots en double détectés'
          : hasEmptyNumbers
            ? 'Certains lots n\'ont pas de numéro'
            : 'Numérotation unique et complète',
        icon: <RefreshCw className="h-4 w-4" />,
        autoFixable: hasDuplicateNumbers || hasEmptyNumbers,
        fixSuggestion: 'Renumérotez les lots de manière séquentielle (1, 2, 3...)',
      });
    }

    // ============ TECHNICAL VALIDATIONS ============
    
    // V9: Polygon angles validation
    if (lots.length > 0) {
      const lotsWithInvalidAngles = lots.filter(lot => {
        const expectedSum = (lot.sides.length - 2) * 180;
        const actualSum = lot.sides.reduce((sum, s) => sum + (s.angle || 0), 0);
        return Math.abs(actualSum - expectedSum) > 10; // 10° tolerance
      });
      
      results.push({
        id: 'polygon-angles',
        category: 'technical',
        label: 'Angles des polygones',
        status: lotsWithInvalidAngles.length === 0 ? 'valid' : 'warning',
        priority: 3,
        message: lotsWithInvalidAngles.length === 0
          ? 'Tous les polygones ont des angles cohérents'
          : `${lotsWithInvalidAngles.length} lot(s) avec des angles incorrects`,
        details: lotsWithInvalidAngles.length > 0
          ? `Lots à vérifier: ${lotsWithInvalidAngles.map(l => l.lotNumber).join(', ')} - La somme des angles intérieurs doit égaler (n-2)×180°`
          : 'La somme des angles intérieurs de chaque polygone est correcte',
        icon: <Ruler className="h-4 w-4" />,
        fixSuggestion: 'Vérifiez les angles de chaque côté. Pour un quadrilatère, la somme doit être 360°',
      });
    }
    
    // V10: Terrain visit requirement
    results.push({
      id: 'terrain-visit',
      category: 'technical',
      label: 'Visite terrain',
      status: 'info',
      priority: 4,
      message: config.requireTerrainVisit 
        ? 'Visite par géomètre agréé obligatoire après soumission'
        : 'Visite terrain optionnelle',
      details: 'Un géomètre assermenté validera les limites et bornera les lots sur site',
      icon: <Eye className="h-4 w-4" />,
    });

    // V11: Data completeness
    const completenessScore = lots.length > 0
      ? lots.reduce((score, lot) => {
          let lotScore = 0;
          if (lot.lotNumber) lotScore += 20;
          if (lot.areaSqm > 0) lotScore += 30;
          if (lot.sides.length >= 3) lotScore += 25;
          if (lot.intendedUse) lotScore += 15;
          if (lot.sides.some(s => s.isRoadBordering !== undefined)) lotScore += 10;
          return score + lotScore;
        }, 0) / lots.length
      : 0;

    if (lots.length > 0) {
      results.push({
        id: 'data-completeness',
        category: 'technical',
        label: 'Complétude des données',
        status: completenessScore >= 90 ? 'valid' : completenessScore >= 70 ? 'warning' : 'info',
        priority: 3,
        message: `${completenessScore.toFixed(0)}% des informations renseignées`,
        details: 'Numéro, surface, côtés, usage et accès pour chaque lot',
        value: `${completenessScore.toFixed(0)}%`,
        icon: <Shield className="h-4 w-4" />,
      });
    }

    // Sort by priority
    return results.sort((a, b) => a.priority - b.priority);
  }, [lots, parentParcelArea, internalRoadsArea, reservedArea, config]);

  // Calculate statistics
  const stats = useMemo(() => {
    const criticalValidations = validations.filter(v => 
      v.status !== 'info' && v.status !== 'pending'
    );
    const validCount = validations.filter(v => v.status === 'valid').length;
    const invalidCount = validations.filter(v => v.status === 'invalid').length;
    const warningCount = validations.filter(v => v.status === 'warning').length;
    const pendingCount = validations.filter(v => v.status === 'pending').length;
    const infoCount = validations.filter(v => v.status === 'info').length;
    
    const score = criticalValidations.length > 0 
      ? Math.round((validCount / criticalValidations.length) * 100) 
      : 0;
    
    const canSubmit = invalidCount === 0 && pendingCount === 0;
    
    return { validCount, invalidCount, warningCount, pendingCount, infoCount, score, canSubmit };
  }, [validations]);

  // Notify parent of validation changes
  useEffect(() => {
    onValidationChange?.(stats.canSubmit, validations);
  }, [stats.canSubmit, validations, onValidationChange]);

  // Group validations by category
  const groupedValidations = useMemo(() => {
    const groups: Record<string, ValidationResult[]> = {
      surface: [],
      access: [],
      legal: [],
      technical: [],
    };
    validations.forEach(v => {
      groups[v.category]?.push(v);
    });
    return groups;
  }, [validations]);

  // Category metadata
  const categoryInfo: Record<string, { label: string; icon: React.ReactNode; description: string }> = {
    surface: { 
      label: 'Surfaces', 
      icon: <Ruler className="h-4 w-4" />,
      description: 'Vérification des surfaces des lots et correspondance avec la parcelle mère'
    },
    access: { 
      label: 'Accessibilité', 
      icon: <Route className="h-4 w-4" />,
      description: 'Accès à la voirie pour chaque lot'
    },
    legal: { 
      label: 'Conformité', 
      icon: <FileCheck className="h-4 w-4" />,
      description: 'Respect des exigences réglementaires'
    },
    technical: { 
      label: 'Technique', 
      icon: <Info className="h-4 w-4" />,
      description: 'Validations techniques et informations'
    },
  };

  const getStatusIcon = (status: ValidationResult['status']) => {
    switch (status) {
      case 'valid': return <Check className="h-4 w-4 text-green-600" />;
      case 'invalid': return <X className="h-4 w-4 text-destructive" />;
      case 'warning': return <AlertTriangle className="h-4 w-4 text-amber-600" />;
      case 'info': return <Info className="h-4 w-4 text-blue-600" />;
      case 'pending': return <RefreshCw className="h-4 w-4 text-muted-foreground animate-spin" />;
    }
  };

  const getStatusBadge = (status: ValidationResult['status']) => {
    switch (status) {
      case 'valid': return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 text-xs">OK</Badge>;
      case 'invalid': return <Badge variant="destructive" className="text-xs">Erreur</Badge>;
      case 'warning': return <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 text-xs">Attention</Badge>;
      case 'info': return <Badge variant="secondary" className="text-xs">Info</Badge>;
      case 'pending': return <Badge variant="outline" className="text-xs">En attente</Badge>;
    }
  };

  const getCategoryStatus = (categoryValidations: ValidationResult[]) => {
    if (categoryValidations.some(v => v.status === 'invalid')) return 'invalid';
    if (categoryValidations.some(v => v.status === 'warning')) return 'warning';
    if (categoryValidations.some(v => v.status === 'pending')) return 'pending';
    return 'valid';
  };

  const toggleCategory = (category: string) => {
    setExpandedCategories(prev =>
      prev.includes(category)
        ? prev.filter(c => c !== category)
        : [...prev, category]
    );
  };

  // Compact mode
  if (compact) {
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Progress 
              value={stats.score} 
              className={`w-20 h-2 ${stats.invalidCount > 0 ? '[&>div]:bg-destructive' : stats.warningCount > 0 ? '[&>div]:bg-amber-500' : '[&>div]:bg-green-500'}`}
            />
            <span className="text-sm font-medium">{stats.score}%</span>
          </div>
          {stats.canSubmit ? (
            <Badge className="bg-green-100 text-green-700">
              <Check className="h-3 w-3 mr-1" />
              Valide
            </Badge>
          ) : (
            <Badge variant="destructive">
              {stats.invalidCount} erreur(s)
            </Badge>
          )}
        </div>
        {stats.invalidCount > 0 && (
          <div className="text-xs text-destructive">
            {validations.filter(v => v.status === 'invalid').map(v => v.label).join(', ')}
          </div>
        )}
      </div>
    );
  }

  return (
    <TooltipProvider>
      <Card className="border-2">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Zap className="h-5 w-5 text-primary" />
              Validations automatiques
            </CardTitle>
            <div className="flex items-center gap-2">
              <span className={`text-lg font-bold ${
                stats.score >= 80 ? 'text-green-600' : 
                stats.score >= 50 ? 'text-amber-600' : 
                'text-destructive'
              }`}>
                {stats.score}%
              </span>
              {stats.canSubmit ? (
                <Badge className="bg-green-100 text-green-700 border-green-300">
                  <Check className="h-3 w-3 mr-1" />
                  Prêt
                </Badge>
              ) : (
                <Badge variant="destructive">
                  <X className="h-3 w-3 mr-1" />
                  {stats.invalidCount + stats.pendingCount} à corriger
                </Badge>
              )}
            </div>
          </div>
          <Progress 
            value={stats.score} 
            className={`h-2 mt-2 ${
              stats.invalidCount > 0 ? '[&>div]:bg-destructive' : 
              stats.warningCount > 0 ? '[&>div]:bg-amber-500' : 
              '[&>div]:bg-green-500'
            }`}
          />
        </CardHeader>

        <CardContent className="space-y-3">
          {/* Stats summary */}
          <div className="grid grid-cols-5 gap-1 text-center text-xs">
            <div className="bg-green-50 rounded p-1.5">
              <div className="text-green-700 font-bold">{stats.validCount}</div>
              <div className="text-green-600">OK</div>
            </div>
            <div className="bg-red-50 rounded p-1.5">
              <div className="text-red-700 font-bold">{stats.invalidCount}</div>
              <div className="text-red-600">Erreurs</div>
            </div>
            <div className="bg-amber-50 rounded p-1.5">
              <div className="text-amber-700 font-bold">{stats.warningCount}</div>
              <div className="text-amber-600">Alertes</div>
            </div>
            <div className="bg-gray-50 rounded p-1.5">
              <div className="text-gray-700 font-bold">{stats.pendingCount}</div>
              <div className="text-gray-600">Attente</div>
            </div>
            <div className="bg-blue-50 rounded p-1.5">
              <div className="text-blue-700 font-bold">{stats.infoCount}</div>
              <div className="text-blue-600">Infos</div>
            </div>
          </div>

          {/* Validation categories */}
          {Object.entries(groupedValidations).map(([category, categoryValidations]) => {
            if (categoryValidations.length === 0) return null;
            
            const info = categoryInfo[category];
            const catStatus = getCategoryStatus(categoryValidations);
            const isExpanded = expandedCategories.includes(category);

            return (
              <Collapsible 
                key={category} 
                open={isExpanded}
                onOpenChange={() => toggleCategory(category)}
              >
                <CollapsibleTrigger asChild>
                  <Button 
                    variant="ghost" 
                    className={`w-full justify-between p-2 h-auto text-left ${
                      catStatus === 'invalid' ? 'bg-red-50 hover:bg-red-100' : 
                      catStatus === 'warning' ? 'bg-amber-50 hover:bg-amber-100' : 
                      catStatus === 'pending' ? 'bg-gray-50 hover:bg-gray-100' :
                      'bg-green-50 hover:bg-green-100'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {info.icon}
                      <span className="font-medium text-sm">{info.label}</span>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <HelpCircle className="h-3 w-3 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="text-xs max-w-[200px]">{info.description}</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <div className="flex items-center gap-2">
                      {catStatus === 'invalid' && <X className="h-4 w-4 text-destructive" />}
                      {catStatus === 'warning' && <AlertTriangle className="h-4 w-4 text-amber-500" />}
                      {catStatus === 'valid' && <Check className="h-4 w-4 text-green-600" />}
                      {catStatus === 'pending' && <RefreshCw className="h-4 w-4 text-muted-foreground" />}
                      {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </div>
                  </Button>
                </CollapsibleTrigger>
                
                <CollapsibleContent className="space-y-2 pt-2">
                  {categoryValidations.map((validation) => (
                    <div 
                      key={validation.id}
                      className={`rounded-lg border p-2.5 ${
                        validation.status === 'invalid' ? 'border-destructive/50 bg-destructive/5' :
                        validation.status === 'warning' ? 'border-amber-300 bg-amber-50/50' :
                        validation.status === 'valid' ? 'border-green-300 bg-green-50/50' :
                        validation.status === 'pending' ? 'border-gray-200 bg-gray-50/50' :
                        'border-blue-200 bg-blue-50/50'
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        <div className="mt-0.5 shrink-0">
                          {getStatusIcon(validation.status)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            {validation.icon}
                            <span className="font-medium text-sm">{validation.label}</span>
                            {getStatusBadge(validation.status)}
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">
                            {validation.message}
                          </p>
                          
                          {showDetails && validation.details && (
                            <p className="text-xs text-muted-foreground mt-1.5 bg-background/70 rounded px-2 py-1">
                              {validation.details}
                            </p>
                          )}

                          {validation.value !== undefined && validation.expected !== undefined && validation.status !== 'valid' && (
                            <div className="flex items-center gap-1.5 mt-1.5 text-xs">
                              <span>Actuel:</span>
                              <Badge variant="outline" className="text-xs py-0">{validation.value.toLocaleString()}</Badge>
                              <ArrowRight className="h-3 w-3" />
                              <span>Attendu:</span>
                              <Badge variant="outline" className="text-xs py-0">{validation.expected.toLocaleString()}</Badge>
                            </div>
                          )}

                          {validation.fixSuggestion && validation.status !== 'valid' && validation.status !== 'info' && (
                            <div className="mt-1.5 text-xs text-muted-foreground italic flex items-start gap-1">
                              <Zap className="h-3 w-3 mt-0.5 shrink-0" />
                              {validation.fixSuggestion}
                            </div>
                          )}
                        </div>

                        {validation.autoFixable && onAutoFix && (
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => onAutoFix(validation.id)}
                            className="shrink-0 h-7 text-xs"
                          >
                            <RefreshCw className="h-3 w-3 mr-1" />
                            Auto
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </CollapsibleContent>
              </Collapsible>
            );
          })}

          {/* Final status */}
          {!stats.canSubmit && stats.invalidCount > 0 && (
            <Alert variant="destructive" className="py-2">
              <X className="h-4 w-4" />
              <AlertTitle className="text-sm">Corrections requises</AlertTitle>
              <AlertDescription className="text-xs">
                Corrigez les {stats.invalidCount} erreur(s) avant de soumettre.
              </AlertDescription>
            </Alert>
          )}

          {stats.canSubmit && (
            <Alert className="border-green-300 bg-green-50 py-2">
              <Check className="h-4 w-4 text-green-600" />
              <AlertTitle className="text-sm text-green-700">Prêt pour soumission</AlertTitle>
              <AlertDescription className="text-xs text-green-600">
                Toutes les validations sont passées avec succès.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </TooltipProvider>
  );
};

export default SubdivisionValidations;

import React from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { 
  Check, X, AlertTriangle, Info, 
  Route, Square, Ruler, Calendar
} from 'lucide-react';
import { LotData } from './types';

interface ValidationResult {
  id: string;
  label: string;
  status: 'valid' | 'invalid' | 'warning' | 'info';
  message: string;
  icon: React.ReactNode;
}

interface SubdivisionValidationsProps {
  lots: LotData[];
  parentParcelArea: number;
  minLotArea?: number; // Surface minimum par lot en m²
  requireRoadAccess?: boolean;
  requireTerrainVisit?: boolean;
}

export const SubdivisionValidations: React.FC<SubdivisionValidationsProps> = ({
  lots,
  parentParcelArea,
  minLotArea = 200, // Par défaut 200m² minimum
  requireRoadAccess = true,
  requireTerrainVisit = true
}) => {
  // Calcul des métriques
  const totalLotsArea = lots.reduce((sum, lot) => sum + (lot.areaSqm || 0), 0);
  const areaPercentage = parentParcelArea > 0 ? (totalLotsArea / parentParcelArea) * 100 : 0;
  const areaDifference = Math.abs(parentParcelArea - totalLotsArea);
  const lotsWithRoadAccess = lots.filter(lot => 
    lot.sides.some(side => side.isRoadBordering)
  );
  const lotsWithoutRoadAccess = lots.filter(lot => 
    !lot.sides.some(side => side.isRoadBordering)
  );
  const lotsBelowMinArea = lots.filter(lot => lot.areaSqm > 0 && lot.areaSqm < minLotArea);

  // Générer les résultats de validation
  const validations: ValidationResult[] = [
    // Validation 1: Somme des surfaces
    {
      id: 'total_area',
      label: 'Surface totale',
      status: areaDifference <= parentParcelArea * 0.02 ? 'valid' : // 2% de tolérance
              areaDifference <= parentParcelArea * 0.05 ? 'warning' : 'invalid',
      message: totalLotsArea === 0 
        ? `Aucune surface définie (parcelle mère: ${parentParcelArea.toLocaleString()} m²)`
        : Math.abs(areaPercentage - 100) <= 2
          ? `Surface des lots (${totalLotsArea.toLocaleString()} m²) = parcelle mère`
          : areaPercentage > 100
            ? `Dépassement de ${areaDifference.toLocaleString()} m² (${(areaPercentage - 100).toFixed(1)}%)`
            : `Reste ${areaDifference.toLocaleString()} m² non attribués (${(100 - areaPercentage).toFixed(1)}%)`,
      icon: <Square className="h-4 w-4" />
    },
    // Validation 2: Surface minimum par lot
    {
      id: 'min_area',
      label: 'Surface minimum',
      status: lotsBelowMinArea.length === 0 ? 'valid' : 'invalid',
      message: lotsBelowMinArea.length === 0
        ? `Tous les lots respectent le minimum de ${minLotArea} m²`
        : `${lotsBelowMinArea.length} lot(s) sous le minimum de ${minLotArea} m²`,
      icon: <Ruler className="h-4 w-4" />
    },
    // Validation 3: Accès voirie
    {
      id: 'road_access',
      label: 'Accès voirie',
      status: !requireRoadAccess ? 'info' :
              lotsWithoutRoadAccess.length === 0 ? 'valid' : 
              lotsWithoutRoadAccess.length <= lots.length * 0.5 ? 'warning' : 'invalid',
      message: lotsWithoutRoadAccess.length === 0
        ? 'Tous les lots ont un accès à une voie'
        : `${lotsWithoutRoadAccess.length} lot(s) sans accès direct à une voie`,
      icon: <Route className="h-4 w-4" />
    },
    // Validation 4: Visite terrain (toujours en info car c'est post-soumission)
    {
      id: 'terrain_visit',
      label: 'Visite terrain',
      status: 'info',
      message: requireTerrainVisit 
        ? 'Une visite terrain par un géomètre agréé sera programmée après soumission'
        : 'Visite terrain optionnelle',
      icon: <Calendar className="h-4 w-4" />
    }
  ];

  // Calcul du score de validation
  const validCount = validations.filter(v => v.status === 'valid').length;
  const invalidCount = validations.filter(v => v.status === 'invalid').length;
  const warningCount = validations.filter(v => v.status === 'warning').length;
  const totalChecks = validations.filter(v => v.status !== 'info').length;
  const validationScore = totalChecks > 0 ? Math.round((validCount / totalChecks) * 100) : 0;

  const getStatusIcon = (status: ValidationResult['status']) => {
    switch (status) {
      case 'valid': return <Check className="h-4 w-4 text-green-600" />;
      case 'invalid': return <X className="h-4 w-4 text-destructive" />;
      case 'warning': return <AlertTriangle className="h-4 w-4 text-amber-600" />;
      case 'info': return <Info className="h-4 w-4 text-blue-600" />;
    }
  };

  const getStatusBg = (status: ValidationResult['status']) => {
    switch (status) {
      case 'valid': return 'bg-green-50 dark:bg-green-950 border-green-200';
      case 'invalid': return 'bg-red-50 dark:bg-red-950 border-red-200';
      case 'warning': return 'bg-amber-50 dark:bg-amber-950 border-amber-200';
      case 'info': return 'bg-blue-50 dark:bg-blue-950 border-blue-200';
    }
  };

  const canSubmit = invalidCount === 0;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            Validations techniques
            <Badge variant={canSubmit ? 'default' : 'destructive'} className="ml-2">
              {validationScore}%
            </Badge>
          </CardTitle>
          {!canSubmit && (
            <span className="text-xs text-destructive">
              {invalidCount} erreur(s) à corriger
            </span>
          )}
        </div>
        <Progress 
          value={validationScore} 
          className={`h-2 ${invalidCount > 0 ? 'bg-red-100' : warningCount > 0 ? 'bg-amber-100' : 'bg-green-100'}`}
        />
      </CardHeader>
      <CardContent className="space-y-2">
        {validations.map((validation) => (
          <div
            key={validation.id}
            className={`flex items-start gap-3 p-3 rounded-lg border ${getStatusBg(validation.status)}`}
          >
            <div className="mt-0.5">
              {getStatusIcon(validation.status)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                {validation.icon}
                <span className="font-medium text-sm">{validation.label}</span>
              </div>
              <p className="text-sm text-muted-foreground mt-0.5">
                {validation.message}
              </p>
            </div>
          </div>
        ))}

        {/* Lots problématiques */}
        {lotsBelowMinArea.length > 0 && (
          <Alert variant="destructive" className="mt-4">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <span className="font-medium">Lots sous la surface minimum :</span>
              <ul className="mt-1 text-sm">
                {lotsBelowMinArea.map(lot => (
                  <li key={lot.id}>
                    {lot.lotNumber}: {lot.areaSqm.toLocaleString()} m² (min. {minLotArea} m²)
                  </li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}

        {lotsWithoutRoadAccess.length > 0 && requireRoadAccess && (
          <Alert className="mt-4 bg-amber-50 dark:bg-amber-950 border-amber-200">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <AlertDescription>
              <span className="font-medium text-amber-700 dark:text-amber-300">
                Lots sans accès voirie direct :
              </span>
              <ul className="mt-1 text-sm text-amber-600 dark:text-amber-400">
                {lotsWithoutRoadAccess.map(lot => (
                  <li key={lot.id}>
                    {lot.lotNumber} - prévoir une servitude de passage
                  </li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}

        {/* Message de résumé */}
        <div className={`mt-4 p-3 rounded-lg text-center ${
          canSubmit 
            ? 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300' 
            : 'bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300'
        }`}>
          {canSubmit ? (
            <div className="flex items-center justify-center gap-2">
              <Check className="h-5 w-5" />
              <span className="font-medium">Prêt pour soumission</span>
            </div>
          ) : (
            <div className="flex items-center justify-center gap-2">
              <X className="h-5 w-5" />
              <span className="font-medium">Corrigez les erreurs avant de soumettre</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default SubdivisionValidations;

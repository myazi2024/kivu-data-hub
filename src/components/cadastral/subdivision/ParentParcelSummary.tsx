import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { 
  MapPin, User, FileText, Ruler, Square, Home, 
  Check, AlertTriangle, Loader2, RefreshCw, Pencil,
  Navigation, ArrowUp, ArrowDown, ArrowLeft, ArrowRight
} from 'lucide-react';
import { ParentParcelData, SideDimension } from './types';

interface ParcelSummaryData {
  parcelNumber: string;
  owner: string;
  area: number;
  location: string;
  titleType: string;
  titleRef: string;
  titleIssueDate: string;
  constructionType?: string;
  gps: { lat: string; lng: string };
  sides: SideDimension[];
  hasSketch: boolean;
}

interface RequesterData {
  firstName: string;
  lastName: string;
  middleName?: string;
  phone: string;
  email?: string;
  type: string;
  isOwner: boolean;
  hasProcuration?: boolean;
  procurationRef?: string;
}

interface ParentParcelSummaryProps {
  parcelData: ParcelSummaryData;
  requesterData: RequesterData;
  dataSource: 'synced' | 'manual' | 'loading';
  onRefreshData: () => void;
  onCreateSketch: () => void;
  onEditRequester: () => void;
  isMandataryValid?: boolean;
}

const TITLE_TYPE_LABELS: Record<string, string> = {
  'certificat_enregistrement': 'Certificat d\'enregistrement',
  'titre_foncier': 'Titre foncier',
  'attestation': 'Attestation de propriété',
  'contrat_location_emphyteotique': 'Contrat de location emphytéotique',
  'contrat_location_ordinaire': 'Contrat de location ordinaire',
  'contrat_occupation_provisoire': 'Contrat d\'occupation provisoire'
};

export const ParentParcelSummary: React.FC<ParentParcelSummaryProps> = ({
  parcelData,
  requesterData,
  dataSource,
  onRefreshData,
  onCreateSketch,
  onEditRequester,
  isMandataryValid = true
}) => {
  const calculatePerimeter = () => {
    return parcelData.sides.reduce((sum, side) => sum + (side.length || 0), 0);
  };

  const hasDimensions = parcelData.sides.some(s => s.length > 0);

  return (
    <div className="space-y-4">
      {/* Status Banner */}
      {dataSource === 'loading' ? (
        <Alert className="bg-blue-50 dark:bg-blue-950 border-blue-200">
          <Loader2 className="h-4 w-4 text-blue-600 animate-spin" />
          <AlertDescription className="text-blue-700 dark:text-blue-300">
            Synchronisation des données CCC en cours...
          </AlertDescription>
        </Alert>
      ) : dataSource === 'synced' ? (
        <Alert className="bg-green-50 dark:bg-green-950 border-green-200">
          <Check className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-700 dark:text-green-300 flex items-center justify-between">
            <span>Données synchronisées depuis le formulaire CCC</span>
            <Button variant="ghost" size="sm" onClick={onRefreshData} className="h-7 gap-1">
              <RefreshCw className="h-3 w-3" />
              Actualiser
            </Button>
          </AlertDescription>
        </Alert>
      ) : (
        <Alert className="bg-amber-50 dark:bg-amber-950 border-amber-200">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-amber-700 dark:text-amber-300">
            Cette parcelle n'a pas de données CCC validées. Complétez d'abord le formulaire CCC pour synchroniser les informations.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Récapitulatif Parcelle Mère */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <MapPin className="h-4 w-4 text-primary" />
              </div>
              Parcelle Mère
              <Badge variant="outline" className="ml-auto font-mono text-xs">
                {parcelData.parcelNumber}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Propriétaire */}
            <div className="flex items-start gap-3">
              <User className="h-4 w-4 text-muted-foreground mt-0.5" />
              <div className="flex-1">
                <div className="text-xs text-muted-foreground">Propriétaire actuel</div>
                <div className="font-medium">{parcelData.owner || 'Non renseigné'}</div>
              </div>
            </div>

            {/* Surface */}
            <div className="flex items-start gap-3">
              <Square className="h-4 w-4 text-muted-foreground mt-0.5" />
              <div className="flex-1">
                <div className="text-xs text-muted-foreground">Surface totale</div>
                <div className="font-medium">
                  {parcelData.area > 0 ? (
                    <>
                      {parcelData.area.toLocaleString()} m²
                      {parcelData.area >= 10000 && (
                        <span className="text-muted-foreground ml-1">
                          ({(parcelData.area / 10000).toFixed(2)} ha)
                        </span>
                      )}
                    </>
                  ) : (
                    'Non renseignée'
                  )}
                </div>
              </div>
            </div>

            {/* Titre Foncier */}
            <div className="flex items-start gap-3">
              <FileText className="h-4 w-4 text-muted-foreground mt-0.5" />
              <div className="flex-1">
                <div className="text-xs text-muted-foreground">Titre foncier</div>
                <div className="font-medium">
                  {parcelData.titleType ? (
                    <>
                      {TITLE_TYPE_LABELS[parcelData.titleType] || parcelData.titleType}
                      {parcelData.titleRef && (
                        <span className="text-muted-foreground ml-1">• {parcelData.titleRef}</span>
                      )}
                    </>
                  ) : (
                    'Non renseigné'
                  )}
                </div>
                {parcelData.titleIssueDate && (
                  <div className="text-xs text-muted-foreground mt-0.5">
                    Délivré le {new Date(parcelData.titleIssueDate).toLocaleDateString('fr-FR')}
                  </div>
                )}
              </div>
            </div>

            {/* Construction existante */}
            {parcelData.constructionType && (
              <div className="flex items-start gap-3">
                <Home className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div className="flex-1">
                  <div className="text-xs text-muted-foreground">Construction existante</div>
                  <div className="font-medium">{parcelData.constructionType}</div>
                </div>
              </div>
            )}

            {/* Localisation */}
            <div className="flex items-start gap-3">
              <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
              <div className="flex-1">
                <div className="text-xs text-muted-foreground">Localisation</div>
                <div className="font-medium">{parcelData.location || 'Non renseignée'}</div>
              </div>
            </div>

            {/* GPS */}
            {(parcelData.gps.lat || parcelData.gps.lng) && (
              <div className="flex items-start gap-3">
                <Navigation className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div className="flex-1">
                  <div className="text-xs text-muted-foreground">Coordonnées GPS</div>
                  <div className="font-mono text-sm">
                    {parcelData.gps.lat}, {parcelData.gps.lng}
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Croquis et Dimensions */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <Ruler className="h-4 w-4 text-primary" />
              </div>
              Croquis & Dimensions
              {hasDimensions ? (
                <Badge className="ml-auto bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">
                  <Check className="h-3 w-3 mr-1" />
                  Disponible
                </Badge>
              ) : (
                <Badge variant="destructive" className="ml-auto">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  Manquant
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {hasDimensions ? (
              <div className="space-y-4">
                {/* Visualisation du croquis simplifié */}
                <div className="relative aspect-square max-w-[200px] mx-auto bg-muted/30 rounded-lg border-2 border-dashed border-muted-foreground/20 p-2">
                  <div className="absolute inset-4 bg-primary/10 border-2 border-primary rounded flex items-center justify-center">
                    <span className="text-xs text-primary font-medium">Parcelle</span>
                  </div>
                  {/* Labels des côtés */}
                  <div className="absolute -top-1 left-1/2 -translate-x-1/2 text-[10px] font-mono flex items-center gap-1">
                    <ArrowUp className="h-2.5 w-2.5" />
                    {parcelData.sides[0]?.length || 0}m
                  </div>
                  <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 text-[10px] font-mono flex items-center gap-1">
                    <ArrowDown className="h-2.5 w-2.5" />
                    {parcelData.sides[2]?.length || 0}m
                  </div>
                  <div className="absolute -right-1 top-1/2 -translate-y-1/2 text-[10px] font-mono flex items-center gap-1 rotate-90">
                    <ArrowRight className="h-2.5 w-2.5" />
                    {parcelData.sides[1]?.length || 0}m
                  </div>
                  <div className="absolute -left-1 top-1/2 -translate-y-1/2 text-[10px] font-mono flex items-center gap-1 -rotate-90">
                    <ArrowLeft className="h-2.5 w-2.5" />
                    {parcelData.sides[3]?.length || 0}m
                  </div>
                </div>

                {/* Résumé dimensions */}
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="bg-muted/50 rounded-lg p-2 text-center">
                    <div className="text-muted-foreground text-xs">Périmètre</div>
                    <div className="font-bold">{calculatePerimeter().toLocaleString()} m</div>
                  </div>
                  <div className="bg-muted/50 rounded-lg p-2 text-center">
                    <div className="text-muted-foreground text-xs">Nombre de côtés</div>
                    <div className="font-bold">{parcelData.sides.length}</div>
                  </div>
                </div>

                {/* Tableau des côtés */}
                <div className="space-y-1">
                  {parcelData.sides.map((side, index) => (
                    <div key={side.id || index} className="flex items-center justify-between text-sm py-1 px-2 bg-muted/30 rounded">
                      <span className="text-muted-foreground">
                        {['Nord', 'Est', 'Sud', 'Ouest'][index] || `Côté ${index + 1}`}
                      </span>
                      <span className="font-mono font-medium">{side.length || 0} m</span>
                      {side.angle !== 90 && (
                        <span className="text-xs text-muted-foreground">({side.angle}°)</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-6 space-y-4">
                <div className="h-16 w-16 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center mx-auto">
                  <Ruler className="h-8 w-8 text-amber-600" />
                </div>
                <div>
                  <p className="font-medium text-amber-700 dark:text-amber-300">
                    Croquis non disponible
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Les dimensions de la parcelle mère sont nécessaires pour créer le plan de lotissement.
                  </p>
                </div>
                <Button onClick={onCreateSketch} className="gap-2">
                  <Pencil className="h-4 w-4" />
                  Créer le croquis
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Informations du Demandeur */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <User className="h-4 w-4 text-primary" />
              </div>
              Demandeur
              {requesterData.isOwner ? (
                <Badge className="ml-2 bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">
                  Propriétaire
                </Badge>
              ) : (
                <Badge variant="secondary" className="ml-2">
                  Mandataire
                </Badge>
              )}
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={onEditRequester} className="h-8 gap-1">
              <Pencil className="h-3 w-3" />
              Modifier
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Alerte pour mandataire non validé */}
          {!requesterData.isOwner && !isMandataryValid && (
            <Alert variant="destructive" className="mb-4">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                La procuration notariée doit être validée par le Conservateur avant de poursuivre.
              </AlertDescription>
            </Alert>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <div className="text-xs text-muted-foreground">Nom complet</div>
              <div className="font-medium">
                {requesterData.lastName} {requesterData.middleName} {requesterData.firstName}
              </div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Téléphone</div>
              <div className="font-medium">{requesterData.phone || 'Non renseigné'}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Email</div>
              <div className="font-medium">{requesterData.email || 'Non renseigné'}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Type</div>
              <div className="font-medium capitalize">{requesterData.type}</div>
            </div>
            {!requesterData.isOwner && requesterData.procurationRef && (
              <div className="md:col-span-2">
                <div className="text-xs text-muted-foreground">Référence procuration</div>
                <div className="font-medium font-mono">{requesterData.procurationRef}</div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ParentParcelSummary;

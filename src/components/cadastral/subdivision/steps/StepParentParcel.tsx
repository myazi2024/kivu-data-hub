import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { MapPin, Loader2, CheckCircle, Info } from 'lucide-react';
import { ParentParcelInfo, RequesterInfo } from '../types';
import { SUBDIVISION_PURPOSE_LABELS } from '../constants';

interface StepParentParcelProps {
  parentParcel: ParentParcelInfo | null;
  loadingParcel: boolean;
  requester: RequesterInfo;
  onRequesterChange: (r: RequesterInfo) => void;
  purpose: string;
  onPurposeChange: (p: string) => void;
}

const StepParentParcel: React.FC<StepParentParcelProps> = ({
  parentParcel, loadingParcel, requester, onRequesterChange, purpose, onPurposeChange
}) => {

  if (loadingParcel) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Chargement des données de la parcelle...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Parent parcel info */}
      <Card className="border-primary/20">
        <CardContent className="pt-4 space-y-3">
          <div className="flex items-center gap-2 mb-2">
            <MapPin className="h-4 w-4 text-primary" />
            <h3 className="font-semibold text-sm">Parcelle mère</h3>
            {parentParcel && (
              <Badge variant="secondary" className="text-[10px]">
                <CheckCircle className="h-3 w-3 mr-1" /> Chargée automatiquement
              </Badge>
            )}
          </div>
          
          {parentParcel ? (
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-muted-foreground text-xs">Numéro</span>
                <p className="font-medium">{parentParcel.parcelNumber}</p>
              </div>
              <div>
                <span className="text-muted-foreground text-xs">Superficie</span>
                <p className="font-medium">{parentParcel.areaSqm.toLocaleString()} m²</p>
              </div>
              <div>
                <span className="text-muted-foreground text-xs">Localisation</span>
                <p className="font-medium">{parentParcel.location || '—'}</p>
              </div>
              {parentParcel.gpsCoordinates.length > 0 && (
                <div className="col-span-2">
                  <Badge variant="outline" className="text-[10px] text-green-600">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    {parentParcel.gpsCoordinates.length} points GPS disponibles
                  </Badge>
                </div>
              )}
            </div>
          ) : (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription className="text-xs">
                Aucune donnée trouvée pour cette parcelle. Veuillez d'abord enregistrer la parcelle via une contribution CCC.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
      
      <Separator />
      
      {/* Qualité du demandeur */}
      <Card>
        <CardContent className="pt-4">
          <Label className="text-xs">Qualité du demandeur <span className="text-destructive">*</span></Label>
          <Select value={requester.type} onValueChange={(v: any) => onRequesterChange({ ...requester, type: v })}>
            <SelectTrigger className="mt-1 h-9 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="owner">Propriétaire</SelectItem>
              <SelectItem value="mandatary">Mandataire</SelectItem>
              <SelectItem value="notary">Notaire</SelectItem>
              <SelectItem value="other">Autre</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>
      
      {/* Purpose */}
      <Card>
        <CardContent className="pt-4">
          <Label className="text-xs">Motif du lotissement <span className="text-destructive">*</span></Label>
          <Select value={purpose || '_none'} onValueChange={(v) => onPurposeChange(v === '_none' ? '' : v)}>
            <SelectTrigger className="mt-1 h-9 text-sm">
              <SelectValue placeholder="Sélectionnez le motif" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="_none" disabled>Sélectionnez le motif</SelectItem>
              {Object.entries(SUBDIVISION_PURPOSE_LABELS).map(([key, label]) => (
                <SelectItem key={key} value={key}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>
    </div>
  );
};

export default StepParentParcel;

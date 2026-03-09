import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { MapPin, User, Loader2, CheckCircle, Info } from 'lucide-react';
import { ParentParcelInfo, RequesterInfo } from '../types';

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
                <span className="text-muted-foreground text-xs">Propriétaire</span>
                <p className="font-medium">{parentParcel.ownerName || '—'}</p>
              </div>
              <div>
                <span className="text-muted-foreground text-xs">Localisation</span>
                <p className="font-medium">{parentParcel.location || '—'}</p>
              </div>
              <div>
                <span className="text-muted-foreground text-xs">Type de titre</span>
                <p className="font-medium">{parentParcel.titleType || '—'}</p>
              </div>
              <div>
                <span className="text-muted-foreground text-xs">Référence titre</span>
                <p className="font-medium">{parentParcel.titleReference || '—'}</p>
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
      
      {/* Requester info - auto-filled from connected account */}
      <Card>
        <CardContent className="pt-4 space-y-3">
          <div className="flex items-center gap-2 mb-2">
            <User className="h-4 w-4 text-primary" />
            <h3 className="font-semibold text-sm">Demandeur</h3>
            <Badge variant="secondary" className="text-[10px]">
              <CheckCircle className="h-3 w-3 mr-1" /> Compte connecté
            </Badge>
          </div>
          
          <div className="grid grid-cols-2 gap-3 text-sm">
            {requester.firstName && (
              <div>
                <span className="text-muted-foreground text-xs">Prénom</span>
                <p className="font-medium">{requester.firstName}</p>
              </div>
            )}
            {requester.lastName && (
              <div>
                <span className="text-muted-foreground text-xs">Nom</span>
                <p className="font-medium">{requester.lastName}</p>
              </div>
            )}
            {requester.email && (
              <div>
                <span className="text-muted-foreground text-xs">Email</span>
                <p className="font-medium">{requester.email}</p>
              </div>
            )}
            {requester.phone && (
              <div>
                <span className="text-muted-foreground text-xs">Téléphone</span>
                <p className="font-medium">{requester.phone}</p>
              </div>
            )}
          </div>

          {!requester.firstName && !requester.lastName && (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription className="text-xs">
                Les informations du demandeur seront récupérées depuis votre compte utilisateur.
              </AlertDescription>
            </Alert>
          )}
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <div>
              <Label className="text-xs">Qualité du demandeur</Label>
              <Select value={requester.type} onValueChange={(v: any) => onRequesterChange({ ...requester, type: v })}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="owner">Propriétaire</SelectItem>
                  <SelectItem value="mandatary">Mandataire</SelectItem>
                  <SelectItem value="notary">Notaire</SelectItem>
                  <SelectItem value="other">Autre</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Purpose */}
      <Card>
        <CardContent className="pt-4">
          <Label className="text-xs">Motif du lotissement</Label>
          <Textarea
            placeholder="Décrivez brièvement l'objectif du lotissement (vente, succession, investissement...)"
            value={purpose}
            onChange={e => onPurposeChange(e.target.value)}
            className="mt-1 text-sm min-h-[60px]"
          />
        </CardContent>
      </Card>
    </div>
  );
};

export default StepParentParcel;

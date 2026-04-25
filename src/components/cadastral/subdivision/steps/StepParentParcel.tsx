import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { MapPin, Loader2, CheckCircle, Info, ShieldAlert, ShieldCheck } from 'lucide-react';
import { ParentParcelInfo, RequesterInfo } from '../types';
import { SUBDIVISION_PURPOSE_LABELS } from '../constants';
import RequesterIdentityBlock from '../RequesterIdentityBlock';
import type { EligibilityResult } from '../hooks/useParentParcelEligibility';

interface StepParentParcelProps {
  parentParcel: ParentParcelInfo | null;
  loadingParcel: boolean;
  requester: RequesterInfo;
  onRequesterChange: (r: RequesterInfo) => void;
  purpose: string;
  onPurposeChange: (p: string) => void;
  parentEligibility?: EligibilityResult;
}

const StepParentParcel: React.FC<StepParentParcelProps> = ({
  parentParcel, loadingParcel, requester, onRequesterChange, purpose, onPurposeChange, parentEligibility
}) => {

  if (loadingParcel) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Chargement des données de la parcelle...</p>
      </div>
    );
  }

  const showEligibility = parentParcel && parentEligibility && parentEligibility.ruleApplied;
  const blocked = showEligibility && !parentEligibility.eligible && !parentEligibility.loading;

  return (
    <div className="space-y-4">
      {/* Bandeau d'éligibilité — affiché en tête si des contraintes ne sont pas respectées */}
      {blocked && (
        <div className="rounded-xl border-2 border-destructive/40 bg-destructive/5 overflow-hidden shadow-sm">
          <div className="flex items-start gap-3 px-4 py-3 bg-destructive/10 border-b border-destructive/20">
            <ShieldAlert className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-sm text-destructive">
                Cette parcelle ne peut pas faire l'objet d'un lotissement
              </h3>
              <p className="text-xs text-destructive/80 mt-0.5">
                Les contraintes techniques suivantes, définies par les règles de zonage en vigueur, ne sont pas respectées :
              </p>
            </div>
          </div>
          <ul className="px-4 py-3 space-y-2">
            {parentEligibility!.issues.map((iss) => (
              <li key={iss.code} className="flex items-start gap-2 text-xs">
                <span className="mt-1 h-1.5 w-1.5 rounded-full bg-destructive shrink-0" />
                <span className="text-foreground/90 leading-relaxed">{iss.message}</span>
              </li>
            ))}
          </ul>
          <div className="px-4 py-2.5 bg-muted/40 border-t text-[11px] text-muted-foreground">
            Veuillez régulariser ces points (mise à jour du titre, levée du litige, complément GPS, etc.) avant de soumettre votre demande. Pour toute assistance, contactez le service cadastral.
          </div>
        </div>
      )}

      {/* Confirmation d'éligibilité */}
      {showEligibility && parentEligibility!.eligible && !parentEligibility!.loading && (
        <Alert className="border-emerald-500/40 bg-emerald-50/60">
          <ShieldCheck className="h-4 w-4 text-emerald-600" />
          <AlertDescription className="text-xs text-emerald-900">
            Cette parcelle respecte l'ensemble des contraintes techniques requises pour faire l'objet d'un lotissement.
          </AlertDescription>
        </Alert>
      )}

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

      {/* Identité du demandeur — bloc aligné sur le formulaire CCC */}
      <RequesterIdentityBlock requester={requester} onChange={onRequesterChange} />

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

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  FileText, MapPin, User, Grid3X3, Loader2, 
  CheckCircle, Copy, AlertTriangle, CreditCard
} from 'lucide-react';
import { SubdivisionLot, SubdivisionRoad, ParentParcelInfo, RequesterInfo, USAGE_LABELS, LOT_COLORS, FeeBreakdown } from '../types';
import { ValidationResult } from '../utils/geometry';
import { SUBDIVISION_PURPOSE_LABELS } from '../constants';
import { ZoningComplianceCard } from '../ZoningComplianceCard';
import type { ZoningComplianceResult } from '../hooks/useZoningCompliance';

interface StepSummaryProps {
  parentParcel: ParentParcelInfo | null;
  requester: RequesterInfo;
  lots: SubdivisionLot[];
  roads: SubdivisionRoad[];
  validation: ValidationResult;
  zoningCompliance: ZoningComplianceResult;
  purpose: string;
  submitted: boolean;
  referenceNumber: string;
  submitting: boolean;
  submissionFee: number | null;
  feeBreakdown: FeeBreakdown | null;
  onSubmit: () => void;
}

const REQUESTER_TYPE_LABELS: Record<string, string> = {
  owner: 'Propriétaire',
  mandatary: 'Mandataire',
  notary: 'Notaire',
  other: 'Autre',
};

const StepSummary: React.FC<StepSummaryProps> = ({
  parentParcel, requester, lots, roads, validation, zoningCompliance, purpose,
  submitted, referenceNumber, submitting, submissionFee, feeBreakdown, onSubmit
}) => {
  const totalArea = lots.reduce((s, l) => s + l.areaSqm, 0);
  const parentArea = parentParcel?.areaSqm || 0;
  const feeReady = submissionFee != null;
  const feeAmount = feeReady ? submissionFee.toFixed(2) : '…';

  if (submitted) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-4">
        <div className="h-16 w-16 rounded-full bg-green-100 flex items-center justify-center">
          <CheckCircle className="h-8 w-8 text-green-600" />
        </div>
        <h3 className="text-lg font-bold text-center">Demande soumise avec succès !</h3>
        <p className="text-sm text-muted-foreground text-center max-w-md">
          Votre demande de lotissement a été enregistrée. Vous recevrez une notification une fois qu'elle sera examinée par notre équipe.
        </p>
        <Card className="w-full max-w-sm">
          <CardContent className="pt-4 space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Référence</span>
              <div className="flex items-center gap-1">
                <span className="font-mono font-bold">{referenceNumber}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => navigator.clipboard.writeText(referenceNumber)}
                >
                  <Copy className="h-3 w-3" />
                </Button>
              </div>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Frais de dossier</span>
              <span className="font-bold">{feeAmount} USD</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Statut</span>
              <Badge className="bg-amber-100 text-amber-800">En attente d'examen</Badge>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <FileText className="h-4 w-4 text-primary" />
        <h3 className="font-semibold text-sm">Récapitulatif de la demande</h3>
      </div>

      {validation.errors.length > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="text-xs">
            {validation.errors.length} erreur(s) à corriger avant la soumission.
            Retournez à l'étape "Lots" pour les résoudre.
          </AlertDescription>
        </Alert>
      )}

      {/* Conformité aux règles de zonage admin */}
      <ZoningComplianceCard compliance={zoningCompliance} />

      {zoningCompliance.hasErrors && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="text-xs">
            Le plan ne respecte pas les règles de zonage en vigueur. Corrigez les
            violations ci-dessus à l'étape « Lots » avant de soumettre.
          </AlertDescription>
        </Alert>
      )}

      {/* Parent parcel */}
      <Card>
        <CardContent className="pt-3 space-y-2">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            <MapPin className="h-3 w-3" /> Parcelle mère
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div><span className="text-muted-foreground">Numéro:</span> <span className="font-medium">{parentParcel?.parcelNumber}</span></div>
            <div><span className="text-muted-foreground">Surface:</span> <span className="font-medium">{parentArea.toLocaleString()} m²</span></div>
            <div><span className="text-muted-foreground">Propriétaire:</span> <span className="font-medium">{parentParcel?.ownerName}</span></div>
            <div><span className="text-muted-foreground">Localisation:</span> <span className="font-medium">{parentParcel?.location}</span></div>
          </div>
        </CardContent>
      </Card>

      {/* Requester */}
      <Card>
        <CardContent className="pt-3 space-y-2">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            <User className="h-3 w-3" /> Demandeur
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            {requester.legalStatus && (
              <div className="col-span-2"><span className="text-muted-foreground">Statut juridique:</span> <span className="font-medium">{requester.legalStatus}</span></div>
            )}
            {requester.legalStatus === 'Personne morale' ? (
              <>
                <div className="col-span-2"><span className="text-muted-foreground">Dénomination / Raison sociale:</span> <span className="font-medium">{requester.lastName}</span></div>
                {requester.entityType && <div><span className="text-muted-foreground">Type d'entité:</span> <span className="font-medium">{requester.entityType}{requester.entitySubType ? ` — ${requester.entitySubType}` : ''}</span></div>}
                {requester.rccmNumber && <div><span className="text-muted-foreground">RCCM / Arrêté:</span> <span className="font-medium">{requester.rccmNumber}</span></div>}
              </>
            ) : requester.legalStatus === 'État' ? (
              <>
                {requester.rightType && <div><span className="text-muted-foreground">Type de droit:</span> <span className="font-medium">{requester.rightType}</span></div>}
                {requester.stateExploitedBy && <div className="col-span-2"><span className="text-muted-foreground">Exploitée par:</span> <span className="font-medium">{requester.stateExploitedBy}</span></div>}
              </>
            ) : (
              <div className="col-span-2">
                <span className="text-muted-foreground">Nom:</span>{' '}
                <span className="font-medium">{requester.lastName} {requester.middleName || ''} {requester.firstName}</span>
                {requester.gender && <span className="text-muted-foreground ml-2">({requester.gender})</span>}
              </div>
            )}
            {requester.nationality && <div><span className="text-muted-foreground">Nationalité:</span> <span className="font-medium">{requester.nationality}</span></div>}
            <div><span className="text-muted-foreground">Téléphone:</span> <span className="font-medium">{requester.phone}</span></div>
            <div><span className="text-muted-foreground">Qualité:</span> <span className="font-medium">{REQUESTER_TYPE_LABELS[requester.type] || requester.type}</span></div>
            {requester.email && <div><span className="text-muted-foreground">Email:</span> <span className="font-medium">{requester.email}</span></div>}
          </div>
          {purpose && (
            <div className="text-xs mt-1">
              <span className="text-muted-foreground">Motif:</span> <span>{SUBDIVISION_PURPOSE_LABELS[purpose] || purpose}</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Lots table */}
      <Card>
        <CardContent className="pt-3">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
            <Grid3X3 className="h-3 w-3" /> Lots ({lots.length})
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-1.5 px-2 font-medium">Lot</th>
                  <th className="text-right py-1.5 px-2 font-medium">Surface</th>
                  <th className="text-right py-1.5 px-2 font-medium">Périmètre</th>
                  <th className="text-left py-1.5 px-2 font-medium">Usage</th>
                  <th className="text-left py-1.5 px-2 font-medium">Propriétaire</th>
                </tr>
              </thead>
              <tbody>
                {lots.map(lot => (
                  <tr key={lot.id} className="border-b border-dashed last:border-0">
                    <td className="py-1.5 px-2">
                      <span className="flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-sm" style={{ backgroundColor: lot.color || LOT_COLORS[lot.intendedUse] }} />
                        {lot.lotNumber}
                      </span>
                    </td>
                    <td className="py-1.5 px-2 text-right font-mono">{lot.areaSqm.toLocaleString()} m²</td>
                    <td className="py-1.5 px-2 text-right font-mono">{lot.perimeterM} m</td>
                    <td className="py-1.5 px-2">{USAGE_LABELS[lot.intendedUse]}</td>
                    <td className="py-1.5 px-2 text-muted-foreground">{lot.ownerName || '—'}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2">
                  <td className="py-1.5 px-2 font-bold">Total</td>
                  <td className="py-1.5 px-2 text-right font-mono font-bold">{totalArea.toLocaleString()} m²</td>
                  <td className="py-1.5 px-2" />
                  <td className="py-1.5 px-2" />
                  <td className="py-1.5 px-2" />
                </tr>
              </tfoot>
            </table>
          </div>
          {roads.length > 0 && (
            <div className="mt-2 text-xs text-muted-foreground">
              + {roads.length} voie(s) d'accès interne(s) ({roads.map(r => `${r.widthM}m`).join(', ')})
            </div>
          )}
        </CardContent>
      </Card>

      {/* Payment — fee breakdown */}
      <Card className="border-primary/20">
        <CardContent className="pt-3 space-y-2">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            <CreditCard className="h-3 w-3" /> Frais de dossier
          </div>

          {feeBreakdown ? (
            <>
              <div className="text-xs text-muted-foreground mb-1">
                Tarif : <span className="font-medium text-foreground">{feeBreakdown.ratePerSqm} USD/m²</span>
                {' — '}
                {feeBreakdown.isDefault
                  ? <span className="italic">tarif par défaut ({feeBreakdown.sectionType === 'urban' ? 'Urbain' : 'Rural'})</span>
                  : <span>{feeBreakdown.locationName} ({feeBreakdown.sectionType === 'urban' ? 'Urbain' : 'Rural'})</span>
                }
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-1 px-2 font-medium">Lot</th>
                      <th className="text-right py-1 px-2 font-medium">Surface</th>
                      <th className="text-right py-1 px-2 font-medium">Frais</th>
                    </tr>
                  </thead>
                  <tbody>
                    {feeBreakdown.items.map(item => (
                      <tr key={item.lotId} className="border-b border-dashed last:border-0">
                        <td className="py-1 px-2">Lot {item.lotNumber}</td>
                        <td className="py-1 px-2 text-right font-mono">{item.areaSqm.toLocaleString()} m²</td>
                        <td className="py-1 px-2 text-right font-mono">{item.fee.toFixed(2)} USD</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2">
                      <td className="py-1 px-2 font-bold" colSpan={2}>Total</td>
                      <td className="py-1 px-2 text-right font-mono font-bold text-primary">{feeBreakdown.total.toFixed(2)} USD</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </>
          ) : (
            <div className="flex items-center justify-between">
              <span className="text-sm">Frais de soumission</span>
              <span className="text-lg font-bold text-primary">{feeAmount} USD</span>
            </div>
          )}

          <p className="text-[10px] text-muted-foreground">
            Des frais de traitement supplémentaires pourront être appliqués après examen de votre dossier par notre équipe.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default StepSummary;

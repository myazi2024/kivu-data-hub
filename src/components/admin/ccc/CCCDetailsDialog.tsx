import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  CheckCircle, XCircle, AlertTriangle, MessageSquare, Building2, FileText,
  Route, BrickWall, ExternalLink, RotateCcw,
} from 'lucide-react';
import { StatusBadge, StatusType } from '@/components/shared/StatusBadge';
import { Contribution } from './types';
import { readField as rr } from './cccHelpers';

interface CCCDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contribution: Contribution | null;
  rejectionReason: string;
  returnReason: string;
  onRejectionReasonChange: (v: string) => void;
  onReturnReasonChange: (v: string) => void;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  onReturn: (id: string) => void;
  onOpenAppeal: () => void;
  onOpenPermit: () => void;
  onOpenDocuments: () => void;
}

export const CCCDetailsDialog: React.FC<CCCDetailsDialogProps> = ({
  open,
  onOpenChange,
  contribution,
  rejectionReason,
  returnReason,
  onRejectionReasonChange,
  onReturnReasonChange,
  onApprove,
  onReject,
  onReturn,
  onOpenAppeal,
  onOpenPermit,
  onOpenDocuments,
}) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto p-3 md:p-6">
        <DialogHeader className="pb-2">
          <DialogTitle className="text-base md:text-lg">Détails Contribution</DialogTitle>
        </DialogHeader>
        {contribution && (
          <div className="space-y-2 md:space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 md:gap-4">
              <div>
                <Label className="text-xs md:text-sm">Numéro de parcelle</Label>
                <p className="font-mono text-xs md:text-sm">{contribution.parcel_number}</p>
              </div>
              <div>
                <Label className="text-xs md:text-sm">Statut</Label>
                <div className="mt-1"><StatusBadge status={contribution.status as StatusType} /></div>
              </div>
            </div>

            {contribution.is_suspicious && (
              <Alert variant="destructive" className="py-2">
                <AlertTriangle className="h-3 w-3 md:h-4 md:w-4" />
                <AlertDescription className="text-xs md:text-sm">
                  <strong>Suspecte (Score: {contribution.fraud_score})</strong>
                  <br />
                  <span className="text-xs">{contribution.fraud_reason}</span>
                </AlertDescription>
              </Alert>
            )}

            {/* Actions rapides */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-1 md:gap-2">
              {contribution.appeal_submitted && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onOpenAppeal}
                  className="gap-1 md:gap-2 w-full h-8 md:h-9 text-xs md:text-sm px-2 md:px-4"
                >
                  <MessageSquare className="h-3 w-3 md:h-4 md:w-4" />
                  <span className="truncate">Appel</span>
                  {contribution.appeal_status === 'pending' && (
                    <Badge variant="outline" className="ml-auto text-[10px] md:text-xs px-1 py-0">Attente</Badge>
                  )}
                </Button>
              )}

              {contribution.permit_request_data && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onOpenPermit}
                  className="gap-1 md:gap-2 w-full h-8 md:h-9 text-xs md:text-sm px-2 md:px-4"
                >
                  <Building2 className="h-3 w-3 md:h-4 md:w-4" />
                  <span className="truncate">Permis</span>
                  {contribution.permit_request_data.status === 'pending' && (
                    <Badge variant="outline" className="ml-auto text-[10px] md:text-xs px-1 py-0">Attente</Badge>
                  )}
                </Button>
              )}

              <Button
                variant="outline"
                size="sm"
                onClick={onOpenDocuments}
                className="gap-1 md:gap-2 w-full h-8 md:h-9 text-xs md:text-sm px-2 md:px-4"
              >
                <FileText className="h-3 w-3 md:h-4 md:w-4" />
                <span className="truncate">Documents</span>
              </Button>
            </div>

            <Tabs defaultValue="general" className="w-full">
              <TabsList className="grid w-full grid-cols-3 md:grid-cols-6 h-8 md:h-10">
                <TabsTrigger value="general" className="text-xs md:text-sm px-1 md:px-3">Général</TabsTrigger>
                <TabsTrigger value="location" className="text-xs md:text-sm px-1 md:px-3">Localisation</TabsTrigger>
                <TabsTrigger value="permits" className="text-xs md:text-sm px-1 md:px-3">Permis</TabsTrigger>
                <TabsTrigger value="history" className="text-xs md:text-sm px-1 md:px-3">Historiques</TabsTrigger>
                <TabsTrigger value="obligations" className="text-xs md:text-sm px-1 md:px-3">Obligations</TabsTrigger>
                <TabsTrigger value="documents" className="text-xs md:text-sm px-1 md:px-3">Documents</TabsTrigger>
              </TabsList>

              {/* Général */}
              <TabsContent value="general" className="space-y-2 md:space-y-3 mt-2">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 md:gap-3">
                  <div>
                    <Label className="text-xs text-muted-foreground">Type de titre</Label>
                    <p className="text-sm">{contribution.property_title_type || 'Non renseigné'}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Type de bail</Label>
                    <p className="text-sm">{contribution.lease_type === 'initial' ? 'Bail initial' : contribution.lease_type === 'renewal' ? 'Renouvellement' : 'Non renseigné'}{contribution.lease_years ? ` (${contribution.lease_years} ans)` : ''}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">N° de référence du titre</Label>
                    <p className="text-sm font-mono">{contribution.title_reference_number || 'Non renseigné'}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Date de délivrance du titre</Label>
                    <p className="text-sm">{contribution.title_issue_date ? new Date(contribution.title_issue_date).toLocaleDateString('fr-FR') : 'Non renseigné'}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Type de parcelle</Label>
                    <p className="text-sm">{contribution.parcel_type === 'SU' ? 'Section Urbaine (SU)' : contribution.parcel_type === 'SR' ? 'Section Rurale (SR)' : 'Non renseigné'}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Titre au nom du propriétaire actuel</Label>
                    <p className="text-sm">{contribution.is_title_in_current_owner_name === true ? 'Oui' : contribution.is_title_in_current_owner_name === false ? 'Non' : 'Non renseigné'}</p>
                  </div>
                </div>

                <div>
                  <Label className="text-xs text-muted-foreground">Propriétaire(s) actuel(s)</Label>
                  {contribution.current_owners_details ? (
                    <div className="space-y-1 mt-1">
                      {Array.isArray(contribution.current_owners_details) &&
                        contribution.current_owners_details.map((owner: any, idx: number) => (
                        <div key={idx} className="p-1.5 md:p-2 bg-secondary rounded text-xs md:text-sm">
                          <p className="text-xs md:text-sm"><strong>Nom:</strong> {owner.lastName} {owner.middleName || ''} {owner.firstName}</p>
                          <p className="text-xs md:text-sm"><strong>Statut:</strong> {owner.legalStatus}</p>
                          <p className="text-xs md:text-sm"><strong>Depuis:</strong> {new Date(owner.since).toLocaleDateString('fr-FR')}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs md:text-sm">{contribution.current_owner_name || 'Non renseigné'}</p>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 md:gap-3">
                  <div><Label className="text-xs text-muted-foreground">Catégorie de bien</Label><p className="text-sm">{contribution.property_category || 'Non renseigné'}</p></div>
                  <div><Label className="text-xs text-muted-foreground">Superficie</Label><p className="text-sm">{contribution.area_sqm ? `${contribution.area_sqm} m²` : 'Non renseigné'}</p></div>
                  <div><Label className="text-xs text-muted-foreground">Type de construction</Label><p className="text-sm">{contribution.construction_type || 'Non renseigné'}</p></div>
                  <div><Label className="text-xs text-muted-foreground">Nature</Label><p className="text-sm">{contribution.construction_nature || 'Non renseigné'}</p></div>
                  <div><Label className="text-xs text-muted-foreground">Matériaux</Label><p className="text-sm">{contribution.construction_materials || 'Non renseigné'}</p></div>
                  <div><Label className="text-xs text-muted-foreground">Usage déclaré</Label><p className="text-sm">{contribution.declared_usage || 'Non renseigné'}</p></div>
                  <div><Label className="text-xs text-muted-foreground">Standing</Label><p className="text-sm">{contribution.standing || 'Non renseigné'}</p></div>
                  <div><Label className="text-xs text-muted-foreground">Année de construction</Label><p className="text-sm">{contribution.construction_year || 'Non renseigné'}</p></div>
                  {contribution.apartment_number && (<div><Label className="text-xs text-muted-foreground">N° appartement</Label><p className="text-sm">{contribution.apartment_number}</p></div>)}
                  {contribution.floor_number && (<div><Label className="text-xs text-muted-foreground">Étage</Label><p className="text-sm">{contribution.floor_number}</p></div>)}
                  {contribution.house_number && (<div><Label className="text-xs text-muted-foreground">N° parcelle (voirie)</Label><p className="text-sm">{contribution.house_number}</p></div>)}
                </div>

                {contribution.additional_constructions && Array.isArray(contribution.additional_constructions) && contribution.additional_constructions.length > 0 && (
                  <div>
                    <Label className="text-xs text-muted-foreground">Constructions additionnelles ({contribution.additional_constructions.length})</Label>
                    <div className="space-y-1 mt-1">
                      {contribution.additional_constructions.map((c: any, idx: number) => (
                        <div key={idx} className="p-1.5 md:p-2 bg-secondary rounded text-xs md:text-sm">
                          <p><strong>{c.propertyCategory || c.constructionType}</strong> — {c.constructionNature || ''} / {c.declaredUsage || ''}</p>
                          {c.constructionMaterials && <p className="text-muted-foreground">Matériaux: {c.constructionMaterials}</p>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {contribution.parcel_sides && Array.isArray(contribution.parcel_sides) && contribution.parcel_sides.length > 0 && (
                  <div>
                    <Label className="text-xs text-muted-foreground">Dimensions des côtés</Label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 md:gap-2 mt-1">
                      {contribution.parcel_sides.map((side: any, idx: number) => {
                        const isRoad = side.borderType === 'route';
                        const isWall = side.borderType === 'mur_mitoyen';
                        return (
                          <div key={idx} className={`p-1.5 md:p-2 rounded text-xs md:text-sm ${
                            isRoad ? 'bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800' :
                            isWall ? 'bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800' :
                            'bg-secondary'
                          }`}>
                            <div className="flex items-center gap-1.5">
                              {isRoad && <Route className="h-3 w-3 text-green-600" />}
                              {isWall && <BrickWall className="h-3 w-3 text-amber-600" />}
                              <strong>{side.name}:</strong> {side.length} m
                            </div>
                            {isRoad && side.roadType && (
                              <p className="text-[10px] text-muted-foreground mt-0.5 ml-4">
                                Route: {side.roadType} {side.roadName ? `- ${side.roadName}` : ''} {side.roadWidth ? `(${side.roadWidth}m)` : ''}
                              </p>
                            )}
                            {isWall && side.wallMaterial && (
                              <p className="text-[10px] text-muted-foreground mt-0.5 ml-4">
                                Mur: {side.wallMaterial} {side.wallHeight ? `(H: ${side.wallHeight}m)` : ''}
                              </p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </TabsContent>

              {/* Localisation */}
              <TabsContent value="location" className="space-y-2 md:space-y-3 mt-2">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 md:gap-3">
                  <div><Label className="text-xs text-muted-foreground">Province</Label><p className="text-sm">{contribution.province || 'Non renseigné'}</p></div>
                  <div><Label className="text-xs text-muted-foreground">Ville</Label><p className="text-sm">{contribution.ville || 'Non renseigné'}</p></div>
                  <div><Label className="text-xs text-muted-foreground">Commune</Label><p className="text-sm">{contribution.commune || 'Non renseigné'}</p></div>
                  <div><Label className="text-xs text-muted-foreground">Quartier</Label><p className="text-sm">{contribution.quartier || 'Non renseigné'}</p></div>
                  <div><Label className="text-xs text-muted-foreground">Avenue</Label><p className="text-sm">{contribution.avenue || 'Non renseigné'}</p></div>
                  <div><Label className="text-xs text-muted-foreground">Territoire</Label><p className="text-sm">{contribution.territoire || 'Non renseigné'}</p></div>
                  <div><Label className="text-xs text-muted-foreground">Collectivité</Label><p className="text-sm">{contribution.collectivite || 'Non renseigné'}</p></div>
                  <div><Label className="text-xs text-muted-foreground">Groupement</Label><p className="text-sm">{contribution.groupement || 'Non renseigné'}</p></div>
                  <div><Label className="text-xs text-muted-foreground">Village</Label><p className="text-sm">{contribution.village || 'Non renseigné'}</p></div>
                </div>

                {contribution.gps_coordinates && Array.isArray(contribution.gps_coordinates) && contribution.gps_coordinates.length > 0 && (
                  <div>
                    <Label className="text-xs text-muted-foreground">Coordonnées GPS</Label>
                    <div className="space-y-1 mt-1">
                      {contribution.gps_coordinates.map((coord: any, idx: number) => (
                        <div key={idx} className="p-1.5 md:p-2 bg-secondary rounded text-xs md:text-sm">
                          <p className="text-xs md:text-sm"><strong>Borne {coord.borne}:</strong> {coord.lat}, {coord.lng}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {contribution.road_sides && Array.isArray(contribution.road_sides) && contribution.road_sides.length > 0 && (
                  <div>
                    <Label className="text-xs text-muted-foreground">Voirie des côtés</Label>
                    <div className="space-y-1 mt-1">
                      {contribution.road_sides.map((side: any, idx: number) => (
                        <div key={idx} className="p-1.5 bg-secondary rounded text-xs md:text-sm">
                          <p><strong>{side.name}:</strong> {side.bordersRoad ? '🛣️ Borde une route' : '🚫 Pas de route'}{side.hasEntrance ? ' — 🚪 Entrée' : ''}</p>
                          {side.bordersRoad && <p className="text-muted-foreground ml-4">{side.roadType || ''} {side.roadName ? `- ${side.roadName}` : ''} {side.roadWidth ? `(${side.roadWidth}m)` : ''}</p>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {contribution.servitude_data && (
                  <div>
                    <Label className="text-xs text-muted-foreground">Servitude de passage</Label>
                    <p className="text-sm">{contribution.servitude_data.hasServitude ? `Oui — Largeur: ${contribution.servitude_data.width || '?'}m` : 'Non'}</p>
                  </div>
                )}

                {contribution.building_shapes && Array.isArray(contribution.building_shapes) && contribution.building_shapes.length > 0 && (
                  <div>
                    <Label className="text-xs text-muted-foreground">Constructions tracées ({contribution.building_shapes.length})</Label>
                    <div className="space-y-1 mt-1">
                      {contribution.building_shapes.map((shape: any, idx: number) => (
                        <div key={idx} className="p-1.5 bg-secondary rounded text-xs md:text-sm">
                          <p><strong>{shape.label || `Construction ${idx + 1}`}</strong> — {shape.areaSqm?.toFixed(1) || '?'} m² — H: {shape.heightM || '?'}m</p>
                          <p className="text-muted-foreground">{shape.sides?.length || '?'} côtés, périmètre: {shape.perimeterM?.toFixed(1) || '?'}m</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </TabsContent>

              {/* Permis */}
              <TabsContent value="permits" className="space-y-2 md:space-y-3 mt-2">
                {contribution.building_permits && Array.isArray(contribution.building_permits) && contribution.building_permits.length > 0 ? (
                  <div>
                    <Label className="text-xs text-muted-foreground">Autorisations de bâtir existantes</Label>
                    <div className="space-y-1 md:space-y-2 mt-1">
                      {contribution.building_permits.map((permit: any, idx: number) => (
                        <div key={idx} className="p-2 md:p-3 bg-secondary rounded space-y-0.5 md:space-y-1 text-xs md:text-sm">
                          <p className="text-xs md:text-sm"><strong>Type:</strong> {permit.permitType === 'construction' ? 'Construction' : 'Régularisation'}</p>
                          <p className="text-xs md:text-sm"><strong>N° de permis:</strong> {permit.permitNumber}</p>
                          <p className="text-xs md:text-sm"><strong>Service émetteur:</strong> {permit.issuingService}</p>
                          <p className="text-xs md:text-sm"><strong>Date d'émission:</strong> {new Date(permit.issueDate).toLocaleDateString('fr-FR')}</p>
                          <p className="text-xs md:text-sm"><strong>Validité:</strong> {permit.validityMonths} mois</p>
                          <p className="text-xs md:text-sm"><strong>Statut:</strong> {permit.administrativeStatus}</p>
                          {permit.issuingServiceContact && <p className="text-xs md:text-sm"><strong>Contact:</strong> {permit.issuingServiceContact}</p>}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="text-xs md:text-sm text-muted-foreground">Aucun permis enregistré</p>
                )}

                {contribution.previous_permit_number && (
                  <div>
                    <Label className="text-xs text-muted-foreground">N° permis précédent</Label>
                    <p className="text-sm font-mono">{contribution.previous_permit_number}</p>
                  </div>
                )}

                {contribution.permit_request_data && (
                  <div className="mt-2 md:mt-4">
                    <Label className="text-xs text-muted-foreground">Demande d'autorisation</Label>
                    <div className="p-2 md:p-3 bg-secondary rounded space-y-0.5 md:space-y-1 text-xs md:text-sm mt-1">
                      <p><strong>Type:</strong> {contribution.permit_request_data.permitType === 'construction' ? 'Construction' : 'Régularisation'}</p>
                      <p><strong>Construction existante:</strong> {contribution.permit_request_data.hasExistingConstruction ? 'Oui' : 'Non'}</p>
                      <p><strong>Description:</strong> {contribution.permit_request_data.constructionDescription}</p>
                      <p><strong>Usage prévu:</strong> {contribution.permit_request_data.plannedUsage}</p>
                      {contribution.permit_request_data.estimatedArea && (
                        <p><strong>Surface estimée:</strong> {contribution.permit_request_data.estimatedArea} m²</p>
                      )}
                      <p><strong>Demandeur:</strong> {contribution.permit_request_data.applicantName}</p>
                      <p><strong>Téléphone:</strong> {contribution.permit_request_data.applicantPhone}</p>
                      {contribution.permit_request_data.applicantEmail && (
                        <p><strong>Email:</strong> {contribution.permit_request_data.applicantEmail}</p>
                      )}
                    </div>
                  </div>
                )}
              </TabsContent>

              {/* Historiques */}
              <TabsContent value="history" className="space-y-2 md:space-y-3 mt-2">
                {contribution.ownership_history && Array.isArray(contribution.ownership_history) && contribution.ownership_history.length > 0 ? (
                  <div>
                    <Label className="text-xs text-muted-foreground">Historique de propriété</Label>
                    <div className="space-y-2 mt-1">
                      {contribution.ownership_history.map((owner: any, idx: number) => (
                        <div key={idx} className="p-2 bg-secondary rounded text-sm">
                          <p><strong>Propriétaire:</strong> {rr(owner, 'owner_name', 'ownerName') || 'Non renseigné'}</p>
                          <p><strong>Statut:</strong> {rr(owner, 'legal_status', 'legalStatus') || 'Non renseigné'}</p>
                          <p><strong>Période:</strong> {new Date(rr(owner, 'ownership_start_date', 'startDate')).toLocaleDateString('fr-FR')} - {rr(owner, 'ownership_end_date', 'endDate') ? new Date(rr(owner, 'ownership_end_date', 'endDate')).toLocaleDateString('fr-FR') : 'Actuel'}</p>
                          {rr(owner, 'mutation_type', 'mutationType') && <p><strong>Type de mutation:</strong> {rr(owner, 'mutation_type', 'mutationType')}</p>}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Aucun historique de propriété</p>
                )}

                {contribution.boundary_history && Array.isArray(contribution.boundary_history) && contribution.boundary_history.length > 0 && (
                  <div className="mt-4">
                    <Label className="text-xs text-muted-foreground">Historique de bornage</Label>
                    <div className="space-y-2 mt-1">
                      {contribution.boundary_history.map((boundary: any, idx: number) => (
                        <div key={idx} className="p-2 bg-secondary rounded text-sm">
                          <p><strong>PV N°:</strong> {rr(boundary, 'pv_reference_number', 'pvReferenceNumber')}</p>
                          <p><strong>Objet:</strong> {rr(boundary, 'boundary_purpose', 'boundaryPurpose')}</p>
                          <p><strong>Géomètre:</strong> {rr(boundary, 'surveyor_name', 'surveyorName')}</p>
                          <p><strong>Date:</strong> {new Date(rr(boundary, 'survey_date', 'surveyDate') || '').toLocaleDateString('fr-FR')}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </TabsContent>

              {/* Obligations */}
              <TabsContent value="obligations" className="space-y-2 md:space-y-3 mt-2">
                {contribution.tax_history && Array.isArray(contribution.tax_history) && contribution.tax_history.length > 0 ? (
                  <div>
                    <Label className="text-xs text-muted-foreground">Historique fiscal</Label>
                    <div className="space-y-1 md:space-y-2 mt-1">
                      {contribution.tax_history.map((tax: any, idx: number) => (
                        <div key={idx} className="p-1.5 md:p-2 bg-secondary rounded text-xs md:text-sm">
                          <p><strong>Année:</strong> {tax.taxYear || tax.tax_year}</p>
                          <p><strong>Montant:</strong> ${tax.amountUsd || tax.amount_usd}</p>
                          <p><strong>Statut:</strong> {tax.paymentStatus || tax.payment_status}</p>
                          {(tax.paymentDate || tax.payment_date) && <p><strong>Date de paiement:</strong> {new Date(tax.paymentDate || tax.payment_date).toLocaleDateString('fr-FR')}</p>}
                          {(tax.taxType || tax.tax_type) && <p><strong>Type:</strong> {tax.taxType || tax.tax_type}</p>}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="text-xs md:text-sm text-muted-foreground">Aucun historique fiscal</p>
                )}

                {contribution.mortgage_history && Array.isArray(contribution.mortgage_history) && contribution.mortgage_history.length > 0 && (
                  <div className="mt-2 md:mt-4">
                    <Label className="text-xs text-muted-foreground">Historique hypothécaire</Label>
                    <div className="space-y-1 md:space-y-2 mt-1">
                      {contribution.mortgage_history.map((mortgage: any, idx: number) => (
                        <div key={idx} className="p-1.5 md:p-2 bg-secondary rounded text-xs md:text-sm">
                          <p><strong>Montant:</strong> ${rr(mortgage, 'mortgage_amount_usd', 'mortgageAmountUsd') || 0}</p>
                          <p><strong>Durée:</strong> {rr(mortgage, 'duration_months', 'durationMonths') || 0} mois</p>
                          <p><strong>Créancier:</strong> {rr(mortgage, 'creditor_name', 'creditorName') || 'Non renseigné'} ({rr(mortgage, 'creditor_type', 'creditorType') || ''})</p>
                          <p><strong>Date:</strong> {new Date(rr(mortgage, 'contract_date', 'contractDate') || '').toLocaleDateString('fr-FR')}</p>
                          <p><strong>Statut:</strong> {rr(mortgage, 'mortgage_status', 'mortgageStatus') || 'Non renseigné'}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {contribution.has_dispute !== null && (
                  <div className="mt-2 md:mt-4">
                    <Label className="text-xs text-muted-foreground">Litige foncier</Label>
                    <p className="text-sm">{contribution.has_dispute ? '⚠️ Oui — Litige déclaré' : '✅ Non'}</p>
                    {contribution.has_dispute && contribution.dispute_data && (
                      <div className="p-2 bg-secondary rounded text-xs md:text-sm mt-1">
                        {contribution.dispute_data.disputeType && <p><strong>Type:</strong> {contribution.dispute_data.disputeType}</p>}
                        {contribution.dispute_data.disputeNature && <p><strong>Nature:</strong> {contribution.dispute_data.disputeNature}</p>}
                        {contribution.dispute_data.description && <p><strong>Description:</strong> {contribution.dispute_data.description}</p>}
                      </div>
                    )}
                  </div>
                )}
              </TabsContent>

              {/* Documents */}
              <TabsContent value="documents" className="space-y-2 md:space-y-3 mt-2">
                {contribution.whatsapp_number && (
                  <div>
                    <Label className="text-xs text-muted-foreground">Numéro WhatsApp</Label>
                    <p className="text-xs md:text-sm font-mono">{contribution.whatsapp_number}</p>
                  </div>
                )}

                {contribution.owner_document_url && (
                  <div>
                    <Label className="text-xs text-muted-foreground">Document d'identité</Label>
                    <a
                      href={contribution.owner_document_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs md:text-sm text-primary hover:underline flex items-center gap-1"
                    >
                      Voir <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                )}

                {contribution.property_title_document_url && (
                  <div>
                    <Label className="text-xs text-muted-foreground">Titre de propriété</Label>
                    <a
                      href={contribution.property_title_document_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs md:text-sm text-primary hover:underline flex items-center gap-1"
                    >
                      Voir <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                )}

                {!contribution.owner_document_url && !contribution.property_title_document_url && !contribution.whatsapp_number && (
                  <p className="text-xs md:text-sm text-muted-foreground">Aucun document attaché</p>
                )}
              </TabsContent>
            </Tabs>

            {contribution.status === 'pending' && (
              <>
                <div className="space-y-3">
                  <div>
                    <Label htmlFor="return_reason" className="text-xs md:text-sm">Motif de renvoi pour correction (obligatoire si renvoi)</Label>
                    <Textarea
                      id="return_reason"
                      value={returnReason}
                      onChange={(e) => onReturnReasonChange(e.target.value)}
                      placeholder="Indiquez les corrections ou compléments nécessaires..."
                      rows={2}
                      className="text-xs md:text-sm"
                    />
                  </div>
                  <div>
                    <Label htmlFor="rejection_reason" className="text-xs md:text-sm">Raison de rejet définitif (obligatoire si rejet)</Label>
                    <Textarea
                      id="rejection_reason"
                      value={rejectionReason}
                      onChange={(e) => onRejectionReasonChange(e.target.value)}
                      placeholder="Expliquez pourquoi cette contribution est définitivement rejetée..."
                      rows={2}
                      className="text-xs md:text-sm"
                    />
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row justify-end gap-2">
                  <Button
                    variant="outline"
                    onClick={() => onReturn(contribution.id)}
                    size="sm"
                    className="w-full sm:w-auto border-amber-500 text-amber-600 hover:bg-amber-50"
                  >
                    <RotateCcw className="h-3 w-3 md:h-4 md:w-4 mr-2" />
                    Renvoyer
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => onReject(contribution.id)}
                    size="sm"
                    className="w-full sm:w-auto"
                  >
                    <XCircle className="h-3 w-3 md:h-4 md:w-4 mr-2" />
                    Rejeter
                  </Button>
                  <Button
                    onClick={() => onApprove(contribution.id)}
                    size="sm"
                    className="w-full sm:w-auto"
                  >
                    <CheckCircle className="h-3 w-3 md:h-4 md:w-4 mr-2" />
                    Approuver
                  </Button>
                </div>
              </>
            )}

            {contribution.status === 'returned' && contribution.rejection_reason && (
              <Alert className="py-2 border-amber-500 bg-amber-50">
                <RotateCcw className="h-3 w-3 md:h-4 md:w-4 text-amber-600" />
                <AlertDescription className="text-xs md:text-sm text-amber-800">
                  <strong>Motif du renvoi:</strong><br />
                  <span className="text-xs md:text-sm">{contribution.rejection_reason}</span>
                </AlertDescription>
              </Alert>
            )}

            {contribution.status === 'rejected' && contribution.rejection_reason && (
              <Alert variant="destructive" className="py-2">
                <XCircle className="h-3 w-3 md:h-4 md:w-4" />
                <AlertDescription className="text-xs md:text-sm">
                  <strong>Raison du rejet:</strong><br />
                  <span className="text-xs md:text-sm">{contribution.rejection_reason}</span>
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default CCCDetailsDialog;

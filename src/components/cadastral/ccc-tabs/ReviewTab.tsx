import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, CheckCircle2, Info, AlertTriangle, ChevronRight } from 'lucide-react';
import { MdRateReview } from 'react-icons/md';
import { CadastralContributionData } from '@/hooks/useCadastralContribution';
import { PROPERTY_TITLE_TYPES } from '../PropertyTitleTypeSelect';
import { CurrentOwner, BuildingPermit } from './GeneralTab';
import { AdditionalConstruction } from '../AdditionalConstructionBlock';
import { PreviousOwner } from './HistoryTab';
import { TaxRecord, MortgageRecord } from './ObligationsTab';
import { DISPUTE_NATURES_MAP, DECLARANT_QUALITIES_MAP, RESOLUTION_LEVELS } from '@/utils/disputeSharedTypes';
import { ParcelMapPreview } from '../ParcelMapPreview';

interface ReviewTabProps {
  formData: CadastralContributionData;
  sectionType: 'urbaine' | 'rurale' | '';
  currentOwners: CurrentOwner[];
  previousOwners: PreviousOwner[];
  taxRecords: TaxRecord[];
  mortgageRecords: MortgageRecord[];
  hasMortgage: boolean | null;
  hasDispute: boolean | null;
  buildingPermits: BuildingPermit[];
  permitMode: 'existing' | 'request';
  constructionMode: 'unique' | 'multiple';
  additionalConstructions: AdditionalConstruction[];
  ownerDocFile: File | null;
  titleDocFiles: File[];
  gpsCoordinates: Array<{ borne: string; lat: string; lng: string }>;
  parcelSides: Array<{ name: string; length: string }>;
  leaseYears: number;
  customTitleName: string;
  roadSides: any[];
  servitude: { hasServitude: boolean; width?: number };
  buildingShapes: any[];
  disputeFormData: any;
  mapConfig: any;
  // CCC value
  calculateCCCValue: { value: number };
  // Validation
  isFormValidForSubmission: () => boolean;
  getMissingFields: () => Array<{ label: string; tab: string }>;
  // Actions
  handleSubmit: () => void;
  handleTabChange: (tab: string) => void;
  saveFormDataToStorage: () => void;
  setShowQuickAuth: (v: boolean) => void;
  setPendingSubmission: (v: boolean) => void;
  // State
  loading: boolean;
  uploading: boolean;
  user: any;
}

const ReviewTab: React.FC<ReviewTabProps> = ({
  formData, sectionType, currentOwners, previousOwners,
  taxRecords, mortgageRecords, hasMortgage, hasDispute,
  buildingPermits, permitMode, constructionMode, additionalConstructions, ownerDocFile, titleDocFiles,
  gpsCoordinates, parcelSides, leaseYears, customTitleName,
  roadSides, servitude, buildingShapes, disputeFormData,
  calculateCCCValue, isFormValidForSubmission, getMissingFields,
  handleSubmit, handleTabChange, saveFormDataToStorage,
  setShowQuickAuth, setPendingSubmission,
  loading, uploading, user
}) => {
  return (
    <div className="space-y-3 py-3 max-w-[360px] mx-auto">
      {/* CCC Value header */}
      <Card className="rounded-2xl shadow-md border-border/50 overflow-hidden bg-gradient-to-br from-amber-50/50 to-amber-100/30 dark:from-amber-950/20 dark:to-amber-900/10">
        <CardContent className="p-3 space-y-2">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-md flex-shrink-0">
              <MdRateReview className="h-5 w-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-bold text-amber-900 dark:text-amber-100">Valeur CCC estimée</h3>
              <div className="flex items-baseline gap-1">
                <span className="text-xl font-bold text-amber-600 dark:text-amber-400">${calculateCCCValue.value.toFixed(2)}</span>
                <span className="text-xs text-amber-700 dark:text-amber-300">/ $5.00</span>
              </div>
            </div>
          </div>
          {calculateCCCValue.value < 5 && (
            <p className="text-xs text-amber-700 dark:text-amber-300 flex items-center gap-1">
              <Info className="h-3 w-3 flex-shrink-0" />
              <span>Complétez plus de champs pour maximiser votre CCC</span>
            </p>
          )}
        </CardContent>
      </Card>

      <div className="flex items-center gap-2">
        <CheckCircle2 className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-semibold">Récapitulatif</h3>
      </div>

      {/* ═══ INFOS GÉNÉRALES ═══ */}
      <Card className="rounded-2xl shadow-sm border-border/50">
        <CardContent className="p-3 space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-semibold flex items-center gap-1.5"><span>📋</span> Infos générales</h4>
            <Button type="button" variant="ghost" size="sm" onClick={() => handleTabChange('general')} className="text-xs h-6 px-2">Modifier</Button>
          </div>
          <div className="space-y-1 text-xs">
            {formData.parcelNumber && <ReviewLine label="Parcelle" value={formData.parcelNumber} />}
            {formData.propertyTitleType && <ReviewLine label="Titre" value={formData.propertyTitleType} />}
            {formData.leaseType && <ReviewLine label="Type bail" value={formData.leaseType === 'initial' ? 'Initial' : 'Renouvellement'} />}
            {formData.titleReferenceNumber && <ReviewLine label="Réf. titre" value={formData.titleReferenceNumber} />}
            {formData.titleIssueDate && <ReviewLine label="Date délivrance" value={new Date(formData.titleIssueDate).toLocaleDateString('fr-FR')} />}
            {formData.isTitleInCurrentOwnerName !== undefined && (
              <ReviewLine label="Titre au nom du propriétaire" value={formData.isTitleInCurrentOwnerName ? 'Oui' : 'Non'} />
            )}
            
            {/* Propriétaires */}
            {currentOwners.some(o => o.lastName || o.firstName) && (
              <div className="pt-1 border-t border-border/50">
                <div className="font-medium">Propriétaire(s):</div>
                {currentOwners.filter(o => o.lastName || o.firstName).map((owner, idx) => (
                  <div key={idx} className="ml-2 text-muted-foreground space-y-0.5">
                    <div>• {owner.lastName}{owner.middleName ? ` ${owner.middleName}` : ''} {owner.firstName}</div>
                    {owner.legalStatus && <div className="ml-3 text-[11px]">Statut: {owner.legalStatus}</div>}
                    {owner.gender && <div className="ml-3 text-[11px]">Genre: {owner.gender}</div>}
                    {owner.since && <div className="ml-3 text-[11px]">Depuis: {new Date(owner.since).toLocaleDateString('fr-FR')}</div>}
                    {owner.entityType && <div className="ml-3 text-[11px]">Type entité: {owner.entityType}</div>}
                  </div>
                ))}
              </div>
            )}

            {/* Construction */}
            {formData.propertyCategory && (
              <div className="pt-1 border-t border-border/50">
                <ReviewLine label="Catégorie" value={formData.propertyCategory} />
              </div>
            )}
            {formData.constructionType && <ReviewLine label="Type construction" value={formData.constructionType} />}
            {formData.constructionNature && <ReviewLine label="Nature" value={`Construction ${formData.constructionNature.toLowerCase()}`} />}
            {formData.constructionMaterials && <ReviewLine label="Matériaux" value={formData.constructionMaterials} />}
            {formData.declaredUsage && <ReviewLine label="Usage" value={formData.declaredUsage} />}
            {formData.standing && <ReviewLine label="Standing" value={formData.standing} />}
            {formData.constructionYear && <ReviewLine label="Année construction" value={String(formData.constructionYear)} />}
            {formData.floorNumber && <ReviewLine label="Nombre d'étages" value={formData.floorNumber} />}
            {formData.apartmentNumber && <ReviewLine label="N° appartement" value={formData.apartmentNumber} />}
            {formData.whatsappNumber && <ReviewLine label="WhatsApp" value={formData.whatsappNumber} />}

            {/* Permis */}
            {formData.constructionType !== 'Terrain nu' && (
              <div className="pt-1 border-t border-border/50">
                <div className="font-medium">Autorisation de bâtir:</div>
                {permitMode === 'existing' && buildingPermits.some(p => p.permitNumber) ? (
                  buildingPermits.filter(p => p.permitNumber).map((permit, idx) => (
                    <div key={idx} className="ml-2 text-muted-foreground space-y-0.5">
                      <div>• N° {permit.permitNumber} ({permit.permitType === 'regularization' ? 'Régularisation' : 'Construction'})</div>
                      {permit.issueDate && <div className="ml-3 text-[11px]">Date: {new Date(permit.issueDate).toLocaleDateString('fr-FR')}</div>}
                    </div>
                  ))
                ) : permitMode === 'request' ? (
                  <div className="ml-2 text-muted-foreground flex items-center gap-1">
                    <span className="text-amber-600 dark:text-amber-400">⚠</span> Pas de permis
                    <span className="text-xs italic">(demande possible après soumission)</span>
                  </div>
                ) : (
                  <div className="ml-2 text-destructive text-xs italic">Non renseigné</div>
                )}
              </div>
            )}

            {/* Constructions additionnelles */}
            {constructionMode === 'multiple' && additionalConstructions.length > 0 && (
              <div className="pt-1 border-t border-border/50">
                <div className="font-medium">Constructions additionnelles ({additionalConstructions.length}):</div>
                {additionalConstructions.map((c, idx) => (
                  <div key={idx} className="ml-2 mt-1 p-2 bg-muted/50 rounded-lg space-y-0.5">
                    <div className="font-medium text-foreground">Construction #{idx + 2}</div>
                    {c.propertyCategory && <div className="text-muted-foreground">Catégorie: {c.propertyCategory}</div>}
                    {c.constructionType && <div className="text-muted-foreground">Type: {c.constructionType}</div>}
                    {c.constructionNature && <div className="text-muted-foreground">Nature: Construction {c.constructionNature.toLowerCase()}</div>}
                    {c.constructionMaterials && <div className="text-muted-foreground">Matériaux: {c.constructionMaterials}</div>}
                    {c.declaredUsage && <div className="text-muted-foreground">Usage: {c.declaredUsage}</div>}
                    {c.standing && <div className="text-muted-foreground">Standing: {c.standing}</div>}
                    {c.constructionYear && <div className="text-muted-foreground">Année: {c.constructionYear}</div>}
                    {c.permit?.permitNumber && <div className="text-muted-foreground">Permis: N° {c.permit.permitNumber}</div>}
                  </div>
                ))}
              </div>
            )}
            {(!formData.propertyTitleType && !currentOwners.some(o => o.lastName || o.firstName)) && (
              <div className="text-muted-foreground italic">Aucune info renseignée</div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* ═══ LOCALISATION ═══ */}
      <Card className="rounded-2xl shadow-sm border-border/50">
        <CardContent className="p-3 space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-semibold flex items-center gap-1.5"><span>📍</span> Localisation</h4>
            <Button type="button" variant="ghost" size="sm" onClick={() => handleTabChange('location')} className="text-xs h-6 px-2">Modifier</Button>
          </div>
          <div className="space-y-1 text-xs">
            {formData.province && <ReviewLine label="Province" value={formData.province} />}
            {sectionType && <ReviewLine label="Section" value={sectionType === 'urbaine' ? 'Urbaine' : 'Rurale'} />}
            {sectionType === 'urbaine' && (<>
              {formData.ville && <ReviewLine label="Ville" value={formData.ville} />}
              {formData.commune && <ReviewLine label="Commune" value={formData.commune} />}
              {formData.quartier && <ReviewLine label="Quartier" value={formData.quartier} />}
              {formData.avenue && <ReviewLine label="Avenue" value={formData.avenue} />}
              {formData.houseNumber && <ReviewLine label="N° parcelle" value={formData.houseNumber} />}
            </>)}
            {sectionType === 'rurale' && (<>
              {formData.territoire && <ReviewLine label="Territoire" value={formData.territoire} />}
              {formData.collectivite && <ReviewLine label="Collectivité" value={formData.collectivite} />}
              {formData.groupement && <ReviewLine label="Groupement" value={formData.groupement} />}
              {formData.village && <ReviewLine label="Village" value={formData.village} />}
            </>)}
            {formData.areaSqm && (
              <div className="pt-1 border-t border-border/50">
                <ReviewLine label="Superficie" value={`${formData.areaSqm} m²`} />
              </div>
            )}

            {/* Mesures appartement */}
            {formData.apartmentLength && (
              <div className="pt-1 border-t border-border/50">
                <div className="font-medium">Mesures appartement:</div>
                <div className="ml-2 text-muted-foreground space-y-0.5">
                  <div>Longueur: {formData.apartmentLength}m × Largeur: {formData.apartmentWidth}m{formData.apartmentHeight ? ` × Hauteur: ${formData.apartmentHeight}m` : ''}</div>
                  {formData.apartmentOrientation && <div>Orientation: {formData.apartmentOrientation}</div>}
                </div>
              </div>
            )}

            {/* Croquis de la parcelle */}
            {(parcelSides.some(s => s.length) || gpsCoordinates.filter(g => g.lat && g.lng).length > 0 || buildingShapes.length > 0) && (
              <div className="pt-1 border-t border-border/50">
                <div className="font-medium">Croquis de la parcelle:</div>
                {parcelSides.filter(s => s.length).length > 0 && (
                  <div className="ml-2 text-muted-foreground">
                    <div className="font-medium text-foreground text-[11px] mt-1">Dimensions des côtés:</div>
                    {parcelSides.filter(s => s.length).map((side, idx) => (
                      <div key={idx}>• {side.name}: {side.length}m</div>
                    ))}
                  </div>
                )}
                {gpsCoordinates.filter(g => g.lat && g.lng).length > 0 && (
                  <div className="ml-2 text-muted-foreground mt-1">
                    <div className="font-medium text-foreground text-[11px]">Bornes GPS ({gpsCoordinates.filter(g => g.lat && g.lng).length}):</div>
                    {gpsCoordinates.filter(g => g.lat && g.lng).map((coord, idx) => (
                      <div key={idx} className="text-[11px]">• {coord.borne}: {Number(coord.lat).toFixed(6)}, {Number(coord.lng).toFixed(6)}</div>
                    ))}
                  </div>
                )}
                {buildingShapes.length > 0 && (
                  <div className="ml-2 text-muted-foreground mt-1">
                    <div className="font-medium text-foreground text-[11px]">Constructions tracées ({buildingShapes.length}):</div>
                    {buildingShapes.map((shape: any, idx: number) => {
                      const shapeLabels: Record<string, string> = { circle: 'Cercle', square: 'Carré', rectangle: 'Rectangle', trapeze: 'Trapèze', polygon: 'Polygone' };
                      return (
                        <div key={idx} className="text-[11px]">
                          • {shapeLabels[shape.type] || shape.type} — {shape.size}m
                          {shape.rotation ? ` (rotation: ${shape.rotation}°)` : ''}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Limites et entrées */}
            {roadSides.length > 0 && (
              <div className="pt-1 border-t border-border/50">
                <div className="font-medium">Limites et Entrées:</div>
                {roadSides.map((side: any, idx: number) => {
                  const details: string[] = [];
                  if (side.orientation) details.push(side.orientation);
                  if (side.bordersRoad) details.push(`Route: ${side.roadType || '?'}${side.roadName ? ` (${side.roadName})` : ''}${side.roadWidth ? ` [${side.roadWidth}m]` : ''}`);
                  if (side.hasEntrance) details.push('🚪 Entrée');
                  if (!side.bordersRoad) details.push('Mur mitoyen');
                  return (
                    <div key={idx} className="ml-2 text-muted-foreground">
                      • {side.name?.replace('Côté ', '') || `Côté ${idx + 1}`}: {details.join(' • ')}
                    </div>
                  );
                })}
                {servitude.hasServitude && (
                  <div className="ml-2 text-muted-foreground">
                    🛤️ Servitude de passage: {servitude.width ? `${servitude.width}m` : 'Non renseigné'}
                  </div>
                )}
              </div>
            )}

            {(!formData.province && !formData.areaSqm) && <div className="text-muted-foreground italic">Aucune localisation renseignée</div>}
          </div>
        </CardContent>
      </Card>

      {/* ═══ HISTORIQUE ═══ */}
      <Card className="rounded-2xl shadow-sm border-border/50">
        <CardContent className="p-3 space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-semibold flex items-center gap-1.5"><span>📜</span> Historique</h4>
            <Button type="button" variant="ghost" size="sm" onClick={() => handleTabChange('history')} className="text-xs h-6 px-2">Modifier</Button>
          </div>
          <div className="space-y-1 text-xs">
            {previousOwners.some(o => o.name) ? (
              previousOwners.filter(o => o.name).map((owner, idx) => (
                <div key={idx} className="border-l-2 border-primary/30 pl-2 space-y-0.5">
                  <div className="font-medium">Ancien #{idx + 1}: {owner.name}</div>
                  <div className="text-muted-foreground">
                    {owner.legalStatus && <span>{owner.legalStatus}</span>}
                    {owner.mutationType && <span> • {owner.mutationType}</span>}
                  </div>
                  {owner.startDate && (
                    <div className="text-muted-foreground text-[11px]">
                      {new Date(owner.startDate).toLocaleDateString('fr-FR')}
                      {owner.endDate && ` → ${new Date(owner.endDate).toLocaleDateString('fr-FR')}`}
                    </div>
                  )}
                </div>
              ))
            ) : <div className="text-muted-foreground italic">Aucun historique</div>}
          </div>
        </CardContent>
      </Card>

      {/* ═══ OBLIGATIONS ═══ */}
      <Card className="rounded-2xl shadow-sm border-border/50">
        <CardContent className="p-3 space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-semibold flex items-center gap-1.5"><span>💼</span> Obligations</h4>
            <Button type="button" variant="ghost" size="sm" onClick={() => handleTabChange('obligations')} className="text-xs h-6 px-2">Modifier</Button>
          </div>
          <div className="space-y-2 text-xs">
            <TaxSummary taxRecords={taxRecords} formData={formData} />
            
            {/* Hypothèque */}
            <div className="pt-1 border-t border-border/50">
              <div className="font-medium">Hypothèque:</div>
              {hasMortgage === null ? (
                <div className="ml-2 text-muted-foreground italic">Non renseigné</div>
              ) : hasMortgage === false ? (
                <div className="ml-2 text-green-600 flex items-center gap-1"><CheckCircle2 className="h-3 w-3" /> Aucune hypothèque - Parcelle libre</div>
              ) : mortgageRecords.some(m => m.mortgageAmount) ? (
                mortgageRecords.filter(m => m.mortgageAmount).map((mortgage, idx) => (
                  <div key={idx} className="ml-2 text-muted-foreground space-y-0.5">
                    <div>• {mortgage.mortgageAmount} USD - {mortgage.creditorName} ({mortgage.mortgageStatus})</div>
                    {mortgage.creditorType && <div className="ml-3 text-[11px]">Type créancier: {mortgage.creditorType}</div>}
                    {mortgage.duration && <div className="ml-3 text-[11px]">Durée: {mortgage.duration} mois</div>}
                    {mortgage.contractDate && <div className="ml-3 text-[11px]">Date contrat: {new Date(mortgage.contractDate).toLocaleDateString('fr-FR')}</div>}
                  </div>
                ))
              ) : (
                <div className="ml-2 text-amber-600">Hypothèque déclarée - détails à compléter</div>
              )}
            </div>

            {/* Litige */}
            <div className="pt-1 border-t border-border/50">
              <div className="font-medium">Litige foncier:</div>
              {hasDispute === null ? (
                <div className="ml-2 text-muted-foreground italic">Non renseigné</div>
              ) : hasDispute ? (
                <div className="ml-2 space-y-1">
                  <div className="text-amber-600 flex items-center gap-1"><AlertTriangle className="h-3 w-3" /> Litige déclaré</div>
                  {disputeFormData && (
                    <div className="ml-2 text-muted-foreground space-y-0.5">
                      {disputeFormData.disputeNature && (
                        <div>Nature: {DISPUTE_NATURES_MAP[disputeFormData.disputeNature] || disputeFormData.disputeNature}</div>
                      )}
                      {disputeFormData.disputeDescription && (
                        <div>Description: {disputeFormData.disputeDescription.length > 80 ? disputeFormData.disputeDescription.substring(0, 80) + '…' : disputeFormData.disputeDescription}</div>
                      )}
                      {disputeFormData.disputeStartDate && (
                        <div>Début: {new Date(disputeFormData.disputeStartDate).toLocaleDateString('fr-FR')}</div>
                      )}
                      {disputeFormData.declarantQuality && (
                        <div>Qualité: {DECLARANT_QUALITIES_MAP[disputeFormData.declarantQuality] || disputeFormData.declarantQuality}</div>
                      )}
                      {disputeFormData.hasResolutionStarted && disputeFormData.resolutionLevel && (
                        <div>Résolution: {RESOLUTION_LEVELS.find(r => r.value === disputeFormData.resolutionLevel)?.label || disputeFormData.resolutionLevel}</div>
                      )}
                      {disputeFormData.parties && disputeFormData.parties.length > 0 && (
                        <div>Parties impliquées: {disputeFormData.parties.map((p: any) => p.name).join(', ')}</div>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div className="ml-2 text-green-600 flex items-center gap-1"><CheckCircle2 className="h-3 w-3" /> Aucun litige</div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ═══ DOCUMENTS ═══ */}
      <Card className="rounded-2xl shadow-sm border-border/50">
        <CardContent className="p-3 space-y-2">
          <h4 className="text-xs font-semibold flex items-center gap-1.5"><span>📎</span> Documents joints</h4>
          <div className="space-y-1 text-xs">
            {/* Owner doc */}
            {(() => {
              const hasOwnerDoc = ownerDocFile || formData.ownerDocumentUrl;
              return (
                <div className={hasOwnerDoc ? "text-foreground flex items-center gap-1.5" : "text-muted-foreground flex items-center gap-1.5"}>
                  {hasOwnerDoc ? <CheckCircle2 className="h-3 w-3 text-primary" /> : <span>⭕</span>}
                  <span>{currentOwners[0]?.legalStatus === 'Personne morale' && currentOwners[0]?.entityType === 'Association' ? "Arrêté ministériel"
                    : currentOwners[0]?.legalStatus === 'Personne morale' && currentOwners[0]?.entityType === 'Société' ? "Certificat RCCM"
                    : currentOwners[0]?.legalStatus === 'État' && currentOwners[0]?.rightType === 'Concession' ? "Titre de concession"
                    : currentOwners[0]?.legalStatus === 'État' && currentOwners[0]?.rightType === 'Affectation' ? "Acte d'affectation"
                    : "Pièce d'identité"}: {hasOwnerDoc ? "✓" : "Non"}</span>
                </div>
              );
            })()}
            {/* Title docs */}
            {(() => {
              const existingTitleCount = formData.titleDocumentUrl ? formData.titleDocumentUrl.split(',').filter(u => u.trim()).length : 0;
              const totalTitleDocs = titleDocFiles.length + existingTitleCount;
              const hasTitleDoc = totalTitleDocs > 0;
              return (
                <div className={hasTitleDoc ? "text-foreground flex items-center gap-1.5" : "text-muted-foreground flex items-center gap-1.5"}>
                  {hasTitleDoc ? <CheckCircle2 className="h-3 w-3 text-primary" /> : <span>⭕</span>}
                  <span>Titre: {hasTitleDoc ? `${totalTitleDocs} fichier(s)` : "Non"}</span>
                </div>
              );
            })()}
            {/* Permits */}
            {(buildingPermits.some(p => p.attachmentFile) || buildingPermits.some(p => (p as any).existingAttachmentUrl)) && (
              <div className="text-foreground flex items-center gap-1.5">
                <CheckCircle2 className="h-3 w-3 text-primary" />
                <span>Permis: {buildingPermits.filter(p => p.attachmentFile || (p as any).existingAttachmentUrl).length} fichier(s)</span>
              </div>
            )}
            {/* Tax receipts */}
            {(taxRecords.some(t => t.receiptFile) || taxRecords.some(t => t.existingReceiptUrl)) && (
              <div className="text-foreground flex items-center gap-1.5">
                <CheckCircle2 className="h-3 w-3 text-primary" />
                <span>Reçus taxes: {taxRecords.filter(t => t.receiptFile || t.existingReceiptUrl).length} fichier(s)</span>
              </div>
            )}
            {/* Mortgage receipts */}
            {(mortgageRecords.some(m => m.receiptFile) || mortgageRecords.some(m => m.existingReceiptUrl)) && (
              <div className="text-foreground flex items-center gap-1.5">
                <CheckCircle2 className="h-3 w-3 text-primary" />
                <span>Hypothèques: {mortgageRecords.filter(m => m.receiptFile || m.existingReceiptUrl).length} fichier(s)</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Title expiration notification */}
      <TitleExpirationNotice formData={formData} leaseYears={leaseYears} />

      {/* Motivation message */}
      {calculateCCCValue.value < 5 && (
        <Card className="rounded-2xl shadow-sm border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/20">
          <CardContent className="p-3">
            <p className="text-xs text-blue-800 dark:text-blue-200 flex items-start gap-1.5">
              <Info className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
              <span>Complétez plus de champs pour maximiser votre CCC (5$)</span>
            </p>
          </CardContent>
        </Card>
      )}

      {/* Submit button */}
      {user ? (
        <div className="sticky bottom-0 bg-background/95 backdrop-blur-sm border-t pt-3 -mx-3 px-3 -mb-3 pb-3">
          <Button type="button" size="lg" onClick={handleSubmit} disabled={loading || uploading || !isFormValidForSubmission()} className="w-full h-11 text-sm font-semibold gap-2 shadow-lg hover:shadow-xl transition-all bg-gradient-to-r from-primary to-primary/80 rounded-xl">
            {loading || uploading ? (<><Loader2 className="h-4 w-4 animate-spin" />{uploading ? "Téléchargement..." : "Envoi..."}</>) : (<><CheckCircle2 className="h-4 w-4" />Soumettre</>)}
          </Button>
          <MissingFieldsList isFormValidForSubmission={isFormValidForSubmission} getMissingFields={getMissingFields} handleTabChange={handleTabChange} />
          <p className="text-xs text-center text-muted-foreground mt-2">En soumettant, vous acceptez la vérification des données</p>
        </div>
      ) : (
        <div className="sticky bottom-0 bg-background/95 backdrop-blur-sm border-t pt-3 -mx-3 px-3 -mb-3 pb-3">
          <div className="text-center mb-2">
            <p className="text-xs font-medium">Formulaire complété</p>
            <p className="text-xs text-muted-foreground">Connectez-vous pour soumettre</p>
          </div>
          <Button type="button" size="lg" onClick={() => { saveFormDataToStorage(); setShowQuickAuth(true); setPendingSubmission(true); }} disabled={!isFormValidForSubmission()} className="w-full h-11 text-sm font-semibold gap-2 shadow-lg hover:shadow-xl transition-all rounded-xl">
            <CheckCircle2 className="h-4 w-4" /> Soumettre
          </Button>
          <MissingFieldsList isFormValidForSubmission={isFormValidForSubmission} getMissingFields={getMissingFields} handleTabChange={handleTabChange} />
        </div>
      )}
    </div>
  );
};

/* ─── Helper: single review line ─── */
const ReviewLine: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div><span className="font-medium">{label}:</span> {value}</div>
);

/* ─── Tax Summary ─── */
const TaxSummary: React.FC<{ taxRecords: TaxRecord[]; formData: CadastralContributionData }> = ({ taxRecords, formData }) => {
  const currentYear = new Date().getFullYear();
  const requiredYears = [currentYear - 1, currentYear - 2, currentYear - 3];
  const hasLocationUsage = formData.declaredUsage === 'Location' || (Array.isArray(formData.additionalConstructions) && formData.additionalConstructions.some((c: any) => c.declaredUsage === 'Location'));
  const requiredTaxTypes = ['Impôt foncier annuel', ...(hasLocationUsage ? ['Impôt sur les revenus locatifs'] : [])];
  
  const taxStatusByYearType: { year: number; taxType: string; paid: boolean; amount?: string; status?: string }[] = [];
  for (const year of requiredYears) {
    for (const taxType of requiredTaxTypes) {
      const found = taxRecords.find(t => t.taxYear === year.toString() && t.taxType === taxType && t.taxAmount);
      taxStatusByYearType.push({ year, taxType, paid: !!found, amount: found?.taxAmount, status: found?.paymentStatus });
    }
  }
  
  const unpaidItems = taxStatusByYearType.filter(t => !t.paid);
  const paidItems = taxStatusByYearType.filter(t => t.paid);
  
  return (
    <div className="space-y-2">
      <div className="font-medium">Bilan fiscal (3 dernières années) :</div>
      {paidItems.length > 0 && (
        <div className="space-y-0.5">
          {paidItems.map((item, idx) => (
            <div key={idx} className="ml-2 flex items-center gap-1.5 text-green-700 dark:text-green-400">
              <CheckCircle2 className="h-3 w-3 flex-shrink-0" />
              <span>{item.year} — {item.taxType}: {item.amount} USD ({item.status})</span>
            </div>
          ))}
        </div>
      )}
      {unpaidItems.length > 0 && (
        <div className="space-y-0.5">
          {unpaidItems.map((item, idx) => (
            <div key={idx} className="ml-2 flex items-center gap-1.5 text-destructive">
              <AlertTriangle className="h-3 w-3 flex-shrink-0" />
              <span>{item.year} — {item.taxType}: Non renseigné</span>
            </div>
          ))}
        </div>
      )}
      {unpaidItems.length > 0 && (
        <div className="mt-1 p-2 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg">
          <p className="text-[11px] text-amber-800 dark:text-amber-200 flex items-start gap-1">
            <AlertTriangle className="h-3 w-3 mt-0.5 flex-shrink-0" />
            <span>{unpaidItems.length} taxe(s) non renseignée(s) sur les 3 dernières années. Les taxes non renseignées sont considérées comme non payées.</span>
          </p>
        </div>
      )}
      {unpaidItems.length === 0 && (
        <div className="mt-1 p-2 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-lg">
          <p className="text-[11px] text-green-800 dark:text-green-200 flex items-center gap-1">
            <CheckCircle2 className="h-3 w-3 flex-shrink-0" />
            <span>Conformité fiscale complète sur les 3 dernières années.</span>
          </p>
        </div>
      )}
    </div>
  );
};

/* ─── Title Expiration Notice ─── */
const TitleExpirationNotice: React.FC<{ formData: CadastralContributionData; leaseYears: number }> = ({ formData, leaseYears }) => {
  const selectedTitle = PROPERTY_TITLE_TYPES.find(t => t.value === formData.propertyTitleType);
  if (!selectedTitle?.isRenewable || !formData.titleIssueDate || !leaseYears || leaseYears <= 0) return null;
  
  const issueDate = new Date(formData.titleIssueDate);
  const expirationDate = new Date(issueDate);
  expirationDate.setFullYear(expirationDate.getFullYear() + leaseYears);
  const now = new Date();
  const remainingMs = expirationDate.getTime() - now.getTime();
  const remainingDays = Math.ceil(remainingMs / (1000 * 60 * 60 * 24));
  const remainingMonths = Math.round(remainingDays / 30.44);
  const isExpired = remainingDays <= 0;
  const isExpiringSoon = !isExpired && remainingMonths <= 3;
  const isInitial = formData.leaseType === 'initial' || !formData.leaseType;
  
  if (!isExpired && !isExpiringSoon) return null;

  const expirationDateStr = expirationDate.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
  const guidanceText = "Pour soumettre une demande de titre foncier, rendez-vous dans le Cadastre numérique, puis cliquez sur le bouton « Demander un titre foncier » dans la barre de recherche cadastrale.";

  let message = '';
  if (isExpired && isInitial) {
    message = `D'après la date de délivrance et le délai accordé, votre titre foncier « ${formData.propertyTitleType} » a expiré le ${expirationDateStr}. Après la soumission de votre parcelle au cadastre numérique, nous vous recommandons de demander un renouvellement du titre foncier existant ou un titre définitif dans un bref délai, sous réserve que les conditions établies par le titre expiré aient été respectées. ${guidanceText}`;
  } else if (isExpired && formData.leaseType === 'renewal') {
    message = `Le délai légal de validité accordé à votre titre foncier « ${formData.propertyTitleType} » est dépassé : ce titre a expiré le ${expirationDateStr}. Après la soumission de votre parcelle au cadastre numérique, nous vous recommandons de demander un titre définitif dans un bref délai, sous réserve que toutes les conditions établies dans le titre expiré aient été respectées. ${guidanceText}`;
  } else if (isExpiringSoon && isInitial) {
    message = `Le délai légal de votre titre foncier « ${formData.propertyTitleType} » arrive bientôt à expiration (le ${expirationDateStr}, soit dans environ ${remainingMonths > 0 ? remainingMonths + ' mois' : remainingDays + ' jours'}). Après la soumission de votre parcelle au cadastre numérique, nous vous recommandons de demander un renouvellement ou un titre définitif avant l'expiration, sous réserve que les conditions établies par le titre aient été respectées, afin d'éviter des complications administratives ou des frais complémentaires. ${guidanceText}`;
  } else if (isExpiringSoon && formData.leaseType === 'renewal') {
    message = `Le délai légal de validité accordé à votre titre foncier « ${formData.propertyTitleType} » tend à expirer (le ${expirationDateStr}, soit dans environ ${remainingMonths > 0 ? remainingMonths + ' mois' : remainingDays + ' jours'}). Après la soumission de votre parcelle au cadastre numérique, nous vous recommandons de demander un titre définitif dans un bref délai avant l'expiration, sous réserve que toutes les conditions établies par ce titre actuel aient été respectées. ${guidanceText}`;
  }

  if (!message) return null;

  return (
    <Card className={`rounded-2xl shadow-sm ${isExpired ? 'border-amber-300 dark:border-amber-700 bg-amber-50/50 dark:bg-amber-950/20' : 'border-blue-300 dark:border-blue-700 bg-blue-50/50 dark:bg-blue-950/20'}`}>
      <CardContent className="p-3">
        <div className="flex items-start gap-2">
          <Info className={`h-4 w-4 mt-0.5 flex-shrink-0 ${isExpired ? 'text-amber-600' : 'text-blue-600'}`} />
          <p className={`text-xs leading-relaxed ${isExpired ? 'text-amber-800 dark:text-amber-200' : 'text-blue-800 dark:text-blue-200'}`}>{message}</p>
        </div>
      </CardContent>
    </Card>
  );
};

/* ─── Missing Fields List ─── */
const MissingFieldsList: React.FC<{
  isFormValidForSubmission: () => boolean;
  getMissingFields: () => Array<{ label: string; tab: string }>;
  handleTabChange: (tab: string) => void;
}> = ({ isFormValidForSubmission, getMissingFields, handleTabChange }) => {
  if (isFormValidForSubmission()) return null;
  return (
    <div className="mt-3 p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl">
      <p className="text-xs font-medium text-amber-800 dark:text-amber-200 mb-2">Champs requis manquants :</p>
      <div className="flex flex-wrap gap-1.5">
        {getMissingFields().map((field, idx) => (
          <Button key={idx} type="button" variant="outline" size="sm" onClick={() => handleTabChange(field.tab)} className="h-6 px-2 text-xs font-normal text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-700 hover:bg-amber-100 dark:hover:bg-amber-900/50 rounded-lg gap-1">
            {field.label} <ChevronRight className="h-3 w-3" />
          </Button>
        ))}
      </div>
    </div>
  );
};

export default ReviewTab;

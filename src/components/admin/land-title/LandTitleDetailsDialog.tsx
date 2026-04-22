import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { FileText, Download } from 'lucide-react';
import { StatusBadge, StatusType } from '@/components/shared/StatusBadge';
import { LandTitleRequestRow, getRequestFullName } from '@/types/landTitleRequest';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedRequest: LandTitleRequestRow | null;
  detailData: LandTitleRequestRow | null;
  getPaymentBadge: (status: string) => React.ReactNode;
}

const REQUEST_TYPE_LABELS: Record<string, string> = {
  initial: 'Demande initiale',
  renouvellement: 'Renouvellement',
  conversion: 'Conversion',
};

const REQUESTER_TYPE_LABELS: Record<string, string> = {
  owner: 'Propriétaire',
  beneficiary: 'Ayant droit',
  representative: 'Mandataire',
};

const LandTitleDetailsDialog: React.FC<Props> = ({
  open,
  onOpenChange,
  selectedRequest,
  detailData,
  getPaymentBadge,
}) => {
  if (!selectedRequest) return null;
  const r = detailData || selectedRequest;
  const ad = r.additional_documents as any;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Demande {selectedRequest.reference_number}
          </DialogTitle>
          <DialogDescription>Détails de la demande de titre foncier</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex gap-2">
            <StatusBadge status={selectedRequest.status as StatusType} />
            {getPaymentBadge(selectedRequest.payment_status)}
          </div>

          <Tabs defaultValue="requester" className="w-full">
            <TabsList className="grid w-full grid-cols-4 h-auto">
              <TabsTrigger value="requester" className="text-xs py-2">Demandeur</TabsTrigger>
              <TabsTrigger value="location" className="text-xs py-2">Localisation</TabsTrigger>
              <TabsTrigger value="fees" className="text-xs py-2">Frais</TabsTrigger>
              <TabsTrigger value="docs" className="text-xs py-2">Documents</TabsTrigger>
            </TabsList>

            <TabsContent value="requester" className="space-y-3 mt-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs text-muted-foreground">Type de demande</p>
                  <p className="text-sm font-medium">{REQUEST_TYPE_LABELS[r.request_type || 'initial'] || r.request_type}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Titre déduit</p>
                  <p className="text-sm font-medium">{r.deduced_title_type || '-'}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Nom complet</p>
                  <p className="text-sm font-medium">{getRequestFullName(selectedRequest)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Qualité</p>
                  <p className="text-sm font-medium">{REQUESTER_TYPE_LABELS[selectedRequest.requester_type] || selectedRequest.requester_type}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Statut juridique</p>
                  <p className="text-sm font-medium">{selectedRequest.requester_legal_status || 'Personne physique'}</p>
                </div>
                {ad?.requester_entity_type && (
                  <div>
                    <p className="text-xs text-muted-foreground">Type d'entreprise</p>
                    <p className="text-sm font-medium">{ad.requester_entity_type}</p>
                  </div>
                )}
                {ad?.requester_entity_sub_type && (
                  <div>
                    <p className="text-xs text-muted-foreground">{ad.requester_entity_type === 'Société' ? 'Forme juridique' : "Type d'association"}</p>
                    <p className="text-sm font-medium">{ad.requester_entity_sub_type}{ad.requester_entity_sub_type === 'Autre' && ad.requester_entity_sub_type_other ? ` (${ad.requester_entity_sub_type_other})` : ''}</p>
                  </div>
                )}
                {ad?.requester_right_type && (
                  <div>
                    <p className="text-xs text-muted-foreground">Type de droit</p>
                    <p className="text-sm font-medium">{ad.requester_right_type}</p>
                  </div>
                )}
                <div>
                  <p className="text-xs text-muted-foreground">Téléphone</p>
                  <p className="text-sm font-medium">{selectedRequest.requester_phone}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Email</p>
                  <p className="text-sm font-medium">{selectedRequest.requester_email || '-'}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Type construction</p>
                  <p className="text-sm font-medium">{r.construction_type || '-'}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Nature construction</p>
                  <p className="text-sm font-medium">{r.construction_nature || '-'}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Matériaux</p>
                  <p className="text-sm font-medium">{r.construction_materials || '-'}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Usage déclaré</p>
                  <p className="text-sm font-medium">{r.declared_usage || '-'}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Nationalité</p>
                  <p className="text-sm font-medium">{r.nationality || '-'}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Durée d'occupation</p>
                  <p className="text-sm font-medium">{r.occupation_duration || '-'}</p>
                </div>
              </div>

              {!selectedRequest.is_owner_same_as_requester && (
                <>
                  <Separator />
                  <p className="text-xs font-semibold text-muted-foreground">Propriétaire (différent du demandeur)</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-xs text-muted-foreground">Nom</p>
                      <p className="text-sm font-medium">
                        {[r.owner_first_name, r.owner_middle_name, r.owner_last_name].filter(Boolean).join(' ')}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Statut juridique</p>
                      <p className="text-sm font-medium">{r.owner_legal_status || 'Personne physique'}</p>
                    </div>
                    {ad?.owner_entity_type && (
                      <div>
                        <p className="text-xs text-muted-foreground">Type d'entreprise</p>
                        <p className="text-sm font-medium">{ad.owner_entity_type}</p>
                      </div>
                    )}
                    {ad?.owner_entity_sub_type && (
                      <div>
                        <p className="text-xs text-muted-foreground">{ad.owner_entity_type === 'Société' ? 'Forme juridique' : "Type d'association"}</p>
                        <p className="text-sm font-medium">{ad.owner_entity_sub_type}{ad.owner_entity_sub_type === 'Autre' && ad.owner_entity_sub_type_other ? ` (${ad.owner_entity_sub_type_other})` : ''}</p>
                      </div>
                    )}
                    {ad?.owner_right_type && (
                      <div>
                        <p className="text-xs text-muted-foreground">Type de droit</p>
                        <p className="text-sm font-medium">{ad.owner_right_type}</p>
                      </div>
                    )}
                    <div>
                      <p className="text-xs text-muted-foreground">Téléphone</p>
                      <p className="text-sm font-medium">{r.owner_phone || '-'}</p>
                    </div>
                  </div>
                </>
              )}
            </TabsContent>

            <TabsContent value="location" className="space-y-3 mt-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs text-muted-foreground">Province</p>
                  <p className="text-sm font-medium">{selectedRequest.province}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Type de zone</p>
                  <Badge variant="outline" className="text-xs">
                    {selectedRequest.section_type === 'urbaine' ? 'Urbaine' : 'Rurale'}
                  </Badge>
                </div>
                {selectedRequest.section_type === 'urbaine' ? (
                  <>
                    <div>
                      <p className="text-xs text-muted-foreground">Ville</p>
                      <p className="text-sm font-medium">{selectedRequest.ville || '-'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Commune</p>
                      <p className="text-sm font-medium">{selectedRequest.commune || '-'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Quartier</p>
                      <p className="text-sm font-medium">{selectedRequest.quartier || '-'}</p>
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <p className="text-xs text-muted-foreground">Territoire</p>
                      <p className="text-sm font-medium">{selectedRequest.territoire || '-'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Collectivité</p>
                      <p className="text-sm font-medium">{selectedRequest.collectivite || '-'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Groupement</p>
                      <p className="text-sm font-medium">{selectedRequest.groupement || '-'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Village</p>
                      <p className="text-sm font-medium">{selectedRequest.village || '-'}</p>
                    </div>
                  </>
                )}
                <div>
                  <p className="text-xs text-muted-foreground">Superficie</p>
                  <p className="text-sm font-medium">{selectedRequest.area_sqm ? `${selectedRequest.area_sqm} m²` : '-'}</p>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="fees" className="space-y-3 mt-4">
              <div className="space-y-2">
                {detailData && Array.isArray(detailData.fee_items) && detailData.fee_items.map((fee: any, index: number) => (
                  <div key={index} className="flex justify-between items-center p-2 bg-muted/50 rounded-lg">
                    <span className="text-xs">{fee.name || fee.fee_name}</span>
                    <span className="text-xs font-semibold">${fee.amount}</span>
                  </div>
                ))}
                <Separator />
                <div className="flex justify-between items-center p-2 bg-primary/10 rounded-lg">
                  <span className="text-sm font-semibold">Total</span>
                  <span className="text-sm font-bold text-primary">${selectedRequest.total_amount_usd}</span>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="docs" className="space-y-3 mt-4">
              <div className="space-y-2">
                {detailData?.requester_id_document_url && (
                  <a href={detailData.requester_id_document_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg hover:bg-muted transition-colors">
                    <Download className="h-4 w-4" />
                    <span className="text-xs">Pièce d'identité demandeur</span>
                  </a>
                )}
                {detailData?.owner_id_document_url && (
                  <a href={detailData.owner_id_document_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg hover:bg-muted transition-colors">
                    <Download className="h-4 w-4" />
                    <span className="text-xs">Pièce d'identité propriétaire</span>
                  </a>
                )}
                {detailData?.procuration_document_url && (
                  <a href={detailData.procuration_document_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg hover:bg-muted transition-colors">
                    <Download className="h-4 w-4" />
                    <span className="text-xs">Procuration / Mandat</span>
                  </a>
                )}
                {detailData?.proof_of_ownership_url && (
                  <a href={detailData.proof_of_ownership_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg hover:bg-muted transition-colors">
                    <Download className="h-4 w-4" />
                    <span className="text-xs">Preuve de propriété</span>
                  </a>
                )}
                {!detailData?.requester_id_document_url && !detailData?.owner_id_document_url && !detailData?.proof_of_ownership_url && !detailData?.procuration_document_url && (
                  <p className="text-xs text-muted-foreground text-center py-4">Aucun document joint</p>
                )}
              </div>
            </TabsContent>
          </Tabs>

          {r.processing_notes && (
            <div className="p-3 bg-muted/50 rounded-lg">
              <p className="text-xs text-muted-foreground mb-1">Notes de traitement</p>
              <p className="text-sm">{r.processing_notes}</p>
            </div>
          )}

          {r.rejection_reason && (
            <div className="p-3 bg-destructive/10 rounded-lg">
              <p className="text-xs text-destructive mb-1">Motif de rejet</p>
              <p className="text-sm">{r.rejection_reason}</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default LandTitleDetailsDialog;

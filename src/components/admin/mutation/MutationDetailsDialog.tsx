import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { getMutationTypeLabel } from '@/components/cadastral/mutation/MutationConstants';
import type { MutationRequest } from '@/types/mutation';

interface MutationDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  request: MutationRequest | null;
  getPaymentBadge: (status: string) => { variant: any; label: string };
}

const safeProposedChanges = (request: MutationRequest | null): Record<string, any> => {
  if (!request?.proposed_changes) return {};
  return request.proposed_changes;
};

const MutationDetailsDialog: React.FC<MutationDetailsDialogProps> = ({
  open,
  onOpenChange,
  request,
  getPaymentBadge,
}) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-sm">Détails de la demande</DialogTitle>
        </DialogHeader>
        {request && (() => {
          const changes = safeProposedChanges(request);
          return (
            <ScrollArea className="max-h-[60vh]">
              <div className="space-y-4 pr-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs text-muted-foreground">Référence</Label>
                    <p className="font-mono font-bold">{request.reference_number || '-'}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Parcelle</Label>
                    <p className="font-mono">{request.parcel_number}</p>
                  </div>
                </div>

                <div>
                  <Label className="text-xs text-muted-foreground">Type de mutation</Label>
                  <p className="font-medium">{getMutationTypeLabel(request.mutation_type)}</p>
                </div>

                <Separator />

                <div>
                  <Label className="text-xs text-muted-foreground">Demandeur</Label>
                  <p className="font-medium">{request.requester_name}</p>
                  {request.requester_email && (
                    <p className="text-xs text-muted-foreground">{request.requester_email}</p>
                  )}
                  {request.requester_phone && (
                    <p className="text-xs text-muted-foreground">{request.requester_phone}</p>
                  )}
                </div>

                {request.beneficiary_name && (
                  <div>
                    <Label className="text-xs text-muted-foreground">Bénéficiaire</Label>
                    <p className="font-medium">{request.beneficiary_name}</p>
                  </div>
                )}

                <Separator />

                <div>
                  <Label className="text-xs text-muted-foreground">Modifications demandées</Label>
                  <p className="text-sm mt-1">{changes.description || 'Non spécifié'}</p>
                </div>

                {request.justification && (
                  <div>
                    <Label className="text-xs text-muted-foreground">Justification</Label>
                    <p className="text-sm mt-1">{request.justification}</p>
                  </div>
                )}

                {(() => {
                  const docs = Array.isArray(request.supporting_documents) && request.supporting_documents.length > 0
                    ? request.supporting_documents
                    : Array.isArray(changes.supporting_documents) ? changes.supporting_documents : [];
                  if (docs.length === 0) return null;
                  return (
                    <div>
                      <Label className="text-xs text-muted-foreground">Documents joints</Label>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {docs.map((url: string, i: number) => (
                          <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary underline">
                            Document {i + 1}
                          </a>
                        ))}
                      </div>
                    </div>
                  );
                })()}

                {(() => {
                  const certUrl = request.expertise_certificate_url || changes.expertise_certificate_url;
                  const marketVal = request.market_value_usd ?? changes.market_value_usd;
                  const certDate = request.expertise_certificate_date || changes.expertise_certificate_date;
                  if (!certUrl) return null;
                  return (
                    <div>
                      <Label className="text-xs text-muted-foreground">Certificat d'expertise</Label>
                      <div className="mt-1 space-y-1">
                        <a href={certUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-primary underline block">
                          Voir le certificat
                        </a>
                        {marketVal && (
                          <p className="text-xs">Valeur vénale: <strong>${Number(marketVal).toLocaleString()}</strong></p>
                        )}
                        {certDate && (
                          <p className="text-xs text-muted-foreground">Date: {certDate}</p>
                        )}
                        {request.title_age && (
                          <p className="text-xs text-muted-foreground">Ancienneté titre: {request.title_age === '10_or_more' ? '≥ 10 ans' : '< 10 ans'}</p>
                        )}
                      </div>
                    </div>
                  );
                })()}

                <Separator />

                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground font-semibold">Détail des frais</Label>

                  {Array.isArray(request.fee_items) && request.fee_items.map((item: any, i: number) => (
                    <div key={i} className="flex justify-between text-xs">
                      <span>{item.fee_name}</span>
                      <span className="font-mono">${Number(item.amount_usd).toFixed(2)}</span>
                    </div>
                  ))}

                  {(() => {
                    const mutFee = request.mutation_fee_amount ?? changes.mutation_fees?.mutation_fee;
                    const bankFee = request.bank_fee_amount ?? changes.mutation_fees?.bank_fee;
                    if (!mutFee) return null;
                    return (
                      <>
                        <div className="flex justify-between text-xs">
                          <span>Frais de mutation</span>
                          <span className="font-mono">${Number(mutFee).toFixed(2)}</span>
                        </div>
                        {Number(bankFee) > 0 && (
                          <div className="flex justify-between text-xs">
                            <span>Frais bancaires</span>
                            <span className="font-mono">${Number(bankFee).toFixed(2)}</span>
                          </div>
                        )}
                      </>
                    );
                  })()}

                  {(() => {
                    const lateFee = request.late_fee_amount ?? changes.late_fees?.fee;
                    const lateDays = request.late_fee_days ?? changes.late_fees?.days;
                    if (!lateFee) return null;
                    return (
                      <div className="flex justify-between text-xs text-orange-600">
                        <span>Retard ({lateDays}j)</span>
                        <span className="font-mono">${Number(lateFee).toFixed(2)}</span>
                      </div>
                    );
                  })()}

                  <Separator />
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold">Total</span>
                    <span className="text-lg font-bold text-primary">${Number(request.total_amount_usd).toFixed(2)}</span>
                  </div>
                </div>

                <div className="text-right">
                  <Label className="text-xs text-muted-foreground">Paiement</Label>
                  <div className="mt-1">
                    {(() => {
                      const badge = getPaymentBadge(request.payment_status);
                      return <Badge variant={badge.variant}>{badge.label}</Badge>;
                    })()}
                  </div>
                </div>
              </div>
            </ScrollArea>
          );
        })()}
      </DialogContent>
    </Dialog>
  );
};

export default MutationDetailsDialog;

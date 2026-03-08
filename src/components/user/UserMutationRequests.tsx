import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { FileEdit, Clock, MapPin, Hash, DollarSign, Loader2, Calendar, AlertCircle } from 'lucide-react';
import { useMutationRequest } from '@/hooks/useMutationRequest';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

const STATUS_MAP: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  pending: { label: 'En attente de paiement', variant: 'outline' },
  in_review: { label: 'En cours d\'examen', variant: 'secondary' },
  approved: { label: 'Approuvée', variant: 'default' },
  rejected: { label: 'Rejetée', variant: 'destructive' },
  on_hold: { label: 'En suspens', variant: 'outline' },
};

const PAYMENT_STATUS_MAP: Record<string, { label: string; color: string }> = {
  pending: { label: 'Non payé', color: 'text-orange-600' },
  paid: { label: 'Payé', color: 'text-green-600' },
  failed: { label: 'Échoué', color: 'text-destructive' },
};

export const UserMutationRequests: React.FC = () => {
  const { loading, userRequests } = useMutationRequest();

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (userRequests.length === 0) {
    return (
      <Card className="rounded-xl">
        <CardContent className="p-6 text-center">
          <FileEdit className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <h3 className="font-semibold text-sm">Aucune demande de mutation</h3>
          <p className="text-xs text-muted-foreground mt-1">
            Vos demandes de mutation apparaîtront ici après soumission depuis la carte cadastrale.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <FileEdit className="h-4 w-4 text-primary" />
          Mes demandes de mutation ({userRequests.length})
        </h3>
      </div>

      <ScrollArea className="max-h-[60vh]">
        <div className="space-y-3 pr-1">
          {userRequests.map((request) => {
            const status = STATUS_MAP[request.status] || { label: request.status, variant: 'outline' as const };
            const paymentStatus = PAYMENT_STATUS_MAP[request.payment_status] || { label: request.payment_status, color: 'text-muted-foreground' };
            const proposedChanges = request.proposed_changes as Record<string, any> || {};

            return (
              <Card key={request.id} className="rounded-xl border">
                <CardContent className="p-3 space-y-2">
                  {/* Header */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Hash className="h-3 w-3" />
                        <span className="font-mono font-bold">{request.reference_number || 'Référence en cours de génération'}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
                        <Calendar className="h-3 w-3" />
                        {format(new Date(request.created_at), 'd MMM yyyy', { locale: fr })}
                      </div>
                    </div>
                    <Badge variant={status.variant} className="text-[10px] whitespace-nowrap">
                      {status.label}
                    </Badge>
                  </div>

                  <Separator />

                  {/* Details */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground flex items-center gap-1">
                        <MapPin className="h-3 w-3" /> Parcelle
                      </span>
                      <span className="font-mono font-medium">{request.parcel_number}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Type</span>
                      <span className="font-medium capitalize">{request.mutation_type.replace(/_/g, ' ')}</span>
                    </div>
                    {request.beneficiary_name && (
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">Bénéficiaire</span>
                        <span className="font-medium truncate max-w-[60%] text-right">{request.beneficiary_name}</span>
                      </div>
                    )}
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground flex items-center gap-1">
                        <DollarSign className="h-3 w-3" /> Montant
                      </span>
                      <span className="font-bold text-primary">${Number(request.total_amount_usd || 0).toFixed(2)}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Paiement</span>
                      <span className={`font-medium ${paymentStatus.color}`}>{paymentStatus.label}</span>
                    </div>
                  </div>

                  {/* Rejection reason */}
                  {request.status === 'rejected' && request.rejection_reason && (
                    <Alert className="bg-destructive/10 border-destructive/20 rounded-lg py-2">
                      <AlertCircle className="h-3.5 w-3.5 text-destructive" />
                      <AlertDescription className="text-[10px] text-destructive">
                        {request.rejection_reason}
                      </AlertDescription>
                    </Alert>
                  )}

                  {/* Processing notes */}
                  {request.processing_notes && (
                    <div className="bg-muted/50 rounded-lg p-2">
                      <p className="text-[10px] text-muted-foreground">{request.processing_notes}</p>
                    </div>
                  )}

                  {/* Estimated processing */}
                  {request.status === 'in_review' && (
                    <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      Délai estimé : {request.estimated_processing_days || 14} jours ouvrables
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
};

export default UserMutationRequests;

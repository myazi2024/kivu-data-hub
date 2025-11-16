import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { CheckCircle, XCircle, FileText, Calendar, User, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';

interface AppealManagementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contributionId: string;
  appealData: any;
  appealStatus: string;
  appealSubmissionDate: string;
  parcelNumber: string;
  rejectionReasons: any;
  onAppealProcessed: () => void;
}

export const AppealManagementDialog: React.FC<AppealManagementDialogProps> = ({
  open,
  onOpenChange,
  contributionId,
  appealData,
  appealStatus,
  appealSubmissionDate,
  parcelNumber,
  rejectionReasons,
  onAppealProcessed
}) => {
  const [processing, setProcessing] = useState(false);
  const [adminResponse, setAdminResponse] = useState('');
  const [selectedAction, setSelectedAction] = useState<'accept' | 'reject' | null>(null);

  const handleProcessAppeal = async (action: 'accept' | 'reject') => {
    if (!adminResponse.trim()) {
      toast.error('Veuillez fournir une réponse à l\'appel');
      return;
    }

    setProcessing(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (action === 'accept') {
        // Accepter l'appel = remettre la contribution en pending
        const { error } = await supabase
          .from('cadastral_contributions')
          .update({
            status: 'pending',
            appeal_status: 'accepted',
            rejection_reason: null,
            rejection_reasons: null,
            reviewed_by: null,
            reviewed_at: null
          })
          .eq('id', contributionId);

        if (error) throw error;

        // Créer notification
        await supabase.from('notifications').insert({
          user_id: appealData?.user_id,
          type: 'success',
          title: 'Appel accepté',
          message: `Votre appel pour la parcelle ${parcelNumber} a été accepté. La contribution est en cours de révision.`,
          action_url: '/user-dashboard?tab=contributions'
        });

        toast.success('Appel accepté - Contribution remise en révision');
      } else {
        // Rejeter l'appel
        const { error } = await supabase
          .from('cadastral_contributions')
          .update({
            appeal_status: 'rejected'
          })
          .eq('id', contributionId);

        if (error) throw error;

        // Créer notification
        await supabase.from('notifications').insert({
          user_id: appealData?.user_id,
          type: 'error',
          title: 'Appel rejeté',
          message: `Votre appel pour la parcelle ${parcelNumber} a été rejeté. Motif: ${adminResponse}`,
          action_url: '/user-dashboard?tab=contributions'
        });

        toast.error('Appel rejeté');
      }

      onAppealProcessed();
      onOpenChange(false);
    } catch (error: any) {
      toast.error(`Erreur: ${error.message}`);
    } finally {
      setProcessing(false);
    }
  };

  const getStatusBadge = () => {
    switch (appealStatus) {
      case 'pending':
        return <Badge variant="outline" className="bg-yellow-50">En attente</Badge>;
      case 'accepted':
        return <Badge variant="outline" className="bg-green-50">Accepté</Badge>;
      case 'rejected':
        return <Badge variant="outline" className="bg-red-50">Rejeté</Badge>;
      default:
        return <Badge variant="outline">Aucun</Badge>;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            Gestion de l'appel - Parcelle {parcelNumber}
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-4">
          <div className="space-y-4">
            {/* Statut actuel */}
            <Card className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">
                    Soumis le {new Date(appealSubmissionDate).toLocaleDateString('fr-FR')}
                  </span>
                </div>
                {getStatusBadge()}
              </div>
            </Card>

            {/* Raisons initiales de rejet */}
            {rejectionReasons && Array.isArray(rejectionReasons) && rejectionReasons.length > 0 && (
              <Alert variant="destructive">
                <XCircle className="h-4 w-4" />
                <AlertDescription>
                  <p className="font-semibold mb-2">Raisons du rejet initial:</p>
                  <ul className="list-disc list-inside space-y-1">
                    {rejectionReasons.map((reason: any, idx: number) => (
                      <li key={idx} className="text-sm">
                        {reason.field}: {reason.reason}
                      </li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}

            {/* Justification de l'appel */}
            {appealData?.reason && (
              <Card className="p-4">
                <Label className="text-sm font-semibold mb-2 block">Justification de l'utilisateur</Label>
                <p className="text-sm whitespace-pre-wrap bg-muted p-3 rounded-md">
                  {appealData.reason}
                </p>
              </Card>
            )}

            {/* Documents justificatifs */}
            {appealData?.supportingDocuments && Array.isArray(appealData.supportingDocuments) && appealData.supportingDocuments.length > 0 && (
              <Card className="p-4">
                <Label className="text-sm font-semibold mb-2 block flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Documents justificatifs ({appealData.supportingDocuments.length})
                </Label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {appealData.supportingDocuments.map((doc: string, idx: number) => (
                    <a
                      key={idx}
                      href={doc}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-primary hover:underline flex items-center gap-1 p-2 bg-muted rounded"
                    >
                      <FileText className="h-3 w-3" />
                      Document {idx + 1}
                    </a>
                  ))}
                </div>
              </Card>
            )}

            {/* Réponse admin (si appel déjà traité) */}
            {appealStatus !== 'pending' && (
              <Card className="p-4 bg-muted">
                <Label className="text-sm font-semibold mb-2 block">Réponse de l'administrateur</Label>
                <p className="text-sm">
                  {appealStatus === 'accepted' 
                    ? "L'appel a été accepté et la contribution remise en révision." 
                    : "L'appel a été rejeté."}
                </p>
              </Card>
            )}

            {/* Interface de traitement (si en attente) */}
            {appealStatus === 'pending' && (
              <div className="space-y-4">
                <div>
                  <Label htmlFor="adminResponse">Réponse / Justification *</Label>
                  <Textarea
                    id="adminResponse"
                    value={adminResponse}
                    onChange={(e) => setAdminResponse(e.target.value)}
                    placeholder="Expliquez votre décision concernant cet appel..."
                    rows={4}
                    className="mt-2"
                  />
                </div>

                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Accepter l'appel</strong>: La contribution sera remise en statut "pending" pour révision.
                    <br />
                    <strong>Rejeter l'appel</strong>: La contribution restera rejetée définitivement.
                  </AlertDescription>
                </Alert>
              </div>
            )}
          </div>
        </ScrollArea>

        {appealStatus === 'pending' && (
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={processing}
            >
              Annuler
            </Button>
            <Button
              variant="destructive"
              onClick={() => handleProcessAppeal('reject')}
              disabled={processing || !adminResponse.trim()}
              className="gap-2"
            >
              <XCircle className="h-4 w-4" />
              Rejeter l'appel
            </Button>
            <Button
              onClick={() => handleProcessAppeal('accept')}
              disabled={processing || !adminResponse.trim()}
              className="gap-2"
            >
              <CheckCircle className="h-4 w-4" />
              Accepter l'appel
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
};

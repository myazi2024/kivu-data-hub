import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { FileText, CheckCircle, XCircle, Building2, User, Phone, Mail, AlertCircle, Image, History } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { PermitActionsHistory } from './PermitActionsHistory';
import { useAuth } from '@/hooks/useAuth';

interface PermitRequestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contributionId: string;
  permitRequestData: any;
  parcelNumber: string;
  userId: string;
  onProcessed: () => void;
}

export const PermitRequestDialog: React.FC<PermitRequestDialogProps> = ({
  open,
  onOpenChange,
  contributionId,
  permitRequestData,
  parcelNumber,
  userId,
  onProcessed
}) => {
  const { user } = useAuth();
  const [processing, setProcessing] = useState(false);
  const [response, setResponse] = useState('');
  const [selectedImages, setSelectedImages] = useState<number[]>([]);

  if (!permitRequestData) return null;

  const handleProcessRequest = async (action: 'approve' | 'reject') => {
    if (!response.trim()) {
      toast.error('Veuillez fournir une réponse');
      return;
    }

    if (!user) {
      toast.error('Erreur d\'authentification');
      return;
    }

    setProcessing(true);
    try {
      // Mettre à jour les données de la demande
      const updatedPermitData = {
        ...permitRequestData,
        status: action === 'approve' ? 'approved' : 'rejected',
        adminResponse: response,
        processedAt: new Date().toISOString()
      };

      // Si approuvé, générer un numéro de permis et créer l'enregistrement
      if (action === 'approve') {
        // Récupérer les infos de la contribution et trouver la parcelle associée
        const { data: contribution } = await supabase
          .from('cadastral_contributions')
          .select('province, parcel_number')
          .eq('id', contributionId)
          .single();

        if (!contribution) {
          throw new Error('Contribution non trouvée');
        }

        // Trouver la parcelle correspondante
        const { data: parcel } = await supabase
          .from('cadastral_parcels')
          .select('id')
          .eq('parcel_number', contribution.parcel_number)
          .single();

        if (!parcel) {
          throw new Error('Parcelle non trouvée. Assurez-vous que la contribution a été approuvée.');
        }

        // Générer numéro de permis
        const { data: permitNumber } = await supabase.rpc('generate_permit_number', {
          permit_type: permitRequestData.permitType,
          province: contribution?.province || 'RDC'
        });

        // Créer le permis dans cadastral_building_permits
        const { error: permitError } = await supabase
          .from('cadastral_building_permits')
          .insert({
            parcel_id: parcel.id,
            permit_number: permitNumber,
            issuing_service: permitRequestData.issuingService || 'Service de l\'Urbanisme',
            issue_date: new Date().toISOString().split('T')[0],
            validity_period_months: 36,
            administrative_status: 'Délivré',
            is_current: true
          });

        if (permitError) {
          console.error('Error creating permit:', permitError);
          throw permitError;
        }

        // Mettre à jour building_permits dans la contribution
        updatedPermitData.permitNumber = permitNumber;
        updatedPermitData.parcelId = parcel.id;
      }

      const { error } = await supabase
        .from('cadastral_contributions')
        .update({
          permit_request_data: updatedPermitData,
          status: action === 'approve' ? 'approved' : 'rejected'
        })
        .eq('id', contributionId);

      if (error) throw error;

      // Enregistrer l'action admin
      await supabase.from('permit_admin_actions').insert({
        contribution_id: contributionId,
        admin_user_id: user.id,
        action_type: action === 'approve' ? 'approved' : 'rejected',
        comment: response
      });

      // Créer notification
      await supabase.from('notifications').insert({
        user_id: userId,
        type: action === 'approve' ? 'success' : 'error',
        title: action === 'approve' ? 'Permis délivré !' : 'Demande rejetée',
        message: action === 'approve'
          ? `Votre permis ${updatedPermitData.permitNumber} a été délivré pour la parcelle ${parcelNumber}. Vous pouvez le télécharger depuis votre espace.`
          : `Votre demande de permis pour la parcelle ${parcelNumber} a été rejetée. ${response}`,
        action_url: '/user-dashboard?tab=building-permits'
      });

      toast.success(action === 'approve' ? 'Permis délivré avec succès' : 'Demande rejetée');
      onProcessed();
      onOpenChange(false);
    } catch (error: any) {
      toast.error(`Erreur: ${error.message}`);
    } finally {
      setProcessing(false);
    }
  };

  const permitTypeBadge = permitRequestData.permitType === 'construction' 
    ? <Badge variant="outline" className="bg-blue-50">Permis de construire</Badge>
    : <Badge variant="outline" className="bg-orange-50">Permis de régularisation</Badge>;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Demande de permis - Parcelle {parcelNumber}
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-4">
          <div className="space-y-4">
            {/* Type et statut */}
            <div className="flex items-center justify-between">
              {permitTypeBadge}
              {permitRequestData.status && (
                <Badge variant={
                  permitRequestData.status === 'approved' ? 'default' : 
                  permitRequestData.status === 'rejected' ? 'destructive' : 'outline'
                }>
                  {permitRequestData.status === 'approved' ? 'Approuvé' : 
                   permitRequestData.status === 'rejected' ? 'Rejeté' : 'En attente'}
                </Badge>
              )}
            </div>

            {/* Informations demandeur */}
            <Card className="p-4">
              <Label className="text-sm font-semibold mb-3 block">Demandeur</Label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span>{permitRequestData.applicantName || 'Non renseigné'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span>{permitRequestData.applicantPhone || 'Non renseigné'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span>{permitRequestData.applicantEmail || 'Non renseigné'}</span>
                </div>
              </div>
            </Card>

            {/* Détails du projet */}
            <Card className="p-4">
              <Label className="text-sm font-semibold mb-3 block">Détails du projet</Label>
              <div className="space-y-2 text-sm">
                {permitRequestData.hasExistingConstruction && (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      Construction existante sur la parcelle
                    </AlertDescription>
                  </Alert>
                )}
                {permitRequestData.constructionDescription && (
                  <div>
                    <span className="font-medium">Description:</span>
                    <p className="text-muted-foreground mt-1">{permitRequestData.constructionDescription}</p>
                  </div>
                )}
                {permitRequestData.plannedUsage && (
                  <div>
                    <span className="font-medium">Usage prévu:</span> {permitRequestData.plannedUsage}
                  </div>
                )}
                {permitRequestData.estimatedArea && (
                  <div>
                    <span className="font-medium">Surface estimée:</span> {permitRequestData.estimatedArea} m²
                  </div>
                )}
              </div>
            </Card>

            {/* Détails spécifiques selon le type */}
            {permitRequestData.permitType === 'construction' && (
              <Card className="p-4">
                <Label className="text-sm font-semibold mb-3 block">Détails construction</Label>
                <div className="space-y-2 text-sm">
                  {permitRequestData.numberOfFloors && (
                    <div><span className="font-medium">Nombre d'étages:</span> {permitRequestData.numberOfFloors}</div>
                  )}
                  {permitRequestData.buildingMaterials && (
                    <div><span className="font-medium">Matériaux:</span> {permitRequestData.buildingMaterials}</div>
                  )}
                </div>
                {/* Plans architecturaux */}
                {permitRequestData.architecturalPlanImages && Array.isArray(permitRequestData.architecturalPlanImages) && permitRequestData.architecturalPlanImages.length > 0 && (
                  <div className="mt-4">
                    <Label className="text-sm font-medium mb-2 block flex items-center gap-2">
                      <Image className="h-4 w-4" />
                      Plans architecturaux ({permitRequestData.architecturalPlanImages.length})
                    </Label>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                      {permitRequestData.architecturalPlanImages.map((img: string, idx: number) => (
                        <a
                          key={idx}
                          href={img}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="relative aspect-square bg-muted rounded-lg overflow-hidden hover:opacity-80 transition-opacity"
                        >
                          <img src={img} alt={`Plan ${idx + 1}`} className="w-full h-full object-cover" />
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </Card>
            )}

            {permitRequestData.permitType === 'regularization' && (
              <Card className="p-4">
                <Label className="text-sm font-semibold mb-3 block">Détails régularisation</Label>
                <div className="space-y-2 text-sm">
                  {permitRequestData.constructionYear && (
                    <div><span className="font-medium">Année de construction:</span> {permitRequestData.constructionYear}</div>
                  )}
                  {permitRequestData.regularizationReason && (
                    <div>
                      <span className="font-medium">Raison de la régularisation:</span>
                      <p className="text-muted-foreground mt-1">{permitRequestData.regularizationReason}</p>
                    </div>
                  )}
                  {permitRequestData.originalPermitNumber && (
                    <div><span className="font-medium">N° permis original:</span> {permitRequestData.originalPermitNumber}</div>
                  )}
                </div>
                {/* Photos de la construction */}
                {permitRequestData.constructionPhotos && Array.isArray(permitRequestData.constructionPhotos) && permitRequestData.constructionPhotos.length > 0 && (
                  <div className="mt-4">
                    <Label className="text-sm font-medium mb-2 block flex items-center gap-2">
                      <Image className="h-4 w-4" />
                      Photos de la construction ({permitRequestData.constructionPhotos.length})
                    </Label>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                      {permitRequestData.constructionPhotos.map((img: string, idx: number) => (
                        <a
                          key={idx}
                          href={img}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="relative aspect-square bg-muted rounded-lg overflow-hidden hover:opacity-80 transition-opacity"
                        >
                          <img src={img} alt={`Photo ${idx + 1}`} className="w-full h-full object-cover" />
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </Card>
            )}

            {/* Réponse admin (si déjà traité) */}
            {permitRequestData.status && permitRequestData.status !== 'pending' && (
              <Card className="p-4 bg-muted">
                <Label className="text-sm font-semibold mb-2 block">Réponse de l'administrateur</Label>
                <p className="text-sm whitespace-pre-wrap">{permitRequestData.adminResponse}</p>
                <p className="text-xs text-muted-foreground mt-2">
                  Traité le {new Date(permitRequestData.processedAt).toLocaleDateString('fr-FR')}
                </p>
              </Card>
            )}

            {/* Historique des actions */}
            <PermitActionsHistory contributionId={contributionId} />

            {/* Interface de traitement */}
            {(!permitRequestData.status || permitRequestData.status === 'pending') && (
              <div className="space-y-4">
                <div>
                  <Label htmlFor="response">Réponse / Commentaires *</Label>
                  <Textarea
                    id="response"
                    value={response}
                    onChange={(e) => setResponse(e.target.value)}
                    placeholder="Expliquez votre décision..."
                    rows={4}
                    className="mt-2"
                  />
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        {(!permitRequestData.status || permitRequestData.status === 'pending') && (
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={processing}>
              Annuler
            </Button>
            <Button
              variant="destructive"
              onClick={() => handleProcessRequest('reject')}
              disabled={processing || !response.trim()}
              className="gap-2"
            >
              <XCircle className="h-4 w-4" />
              Rejeter
            </Button>
            <Button
              onClick={() => handleProcessRequest('approve')}
              disabled={processing || !response.trim()}
              className="gap-2"
            >
              <CheckCircle className="h-4 w-4" />
              Approuver
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
};

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { FileText, CheckCircle, XCircle, Building2, User, Phone, Mail, AlertCircle, Image, History, DollarSign, RotateCcw, MapPin, Droplets, Zap, Home, Ruler, Layers } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { PermitActionsHistory } from './PermitActionsHistory';
import { useAuth } from '@/hooks/useAuth';
import { usePermitPayment } from '@/hooks/usePermitPayment';
import { generateAndUploadCertificate } from '@/utils/certificateService';
import { useAdminAnalytics } from '@/lib/adminAnalytics';

interface PermitRequestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contributionId: string;
  permitRequestData: any;
  parcelNumber: string;
  userId: string;
  onProcessed: () => void;
}

/** Helper to resolve key names — supports both old and new JSON formats */
const r = (data: any, newKey: string, oldKey?: string) => {
  if (data[newKey] !== undefined && data[newKey] !== null && data[newKey] !== '') return data[newKey];
  if (oldKey && data[oldKey] !== undefined && data[oldKey] !== null && data[oldKey] !== '') return data[oldKey];
  return null;
};

/** Resolve the request type across formats */
const getRequestType = (data: any): 'construction' | 'regularization' => {
  const v = r(data, 'requestType', 'permitType');
  return v === 'regularization' || v === 'new' ? (v === 'new' ? 'construction' : 'regularization') : 'construction';
};

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
  const { checkPaymentStatus } = usePermitPayment();
  const { trackAdminAction } = useAdminAnalytics();
  const [processing, setProcessing] = useState(false);
  const [response, setResponse] = useState('');
  const [paymentStatus, setPaymentStatus] = useState<'paid' | 'pending' | 'not_found' | 'failed' | null>(null);
  const [ownerName, setOwnerName] = useState<string | null>(null);

  React.useEffect(() => {
    if (open && contributionId) {
      loadPaymentStatus();
      loadOwnerName();
    }
  }, [open, contributionId]);

  const loadPaymentStatus = async () => {
    const status = await checkPaymentStatus(contributionId);
    setPaymentStatus(status);
  };

  const loadOwnerName = async () => {
    const { data } = await supabase
      .from('cadastral_parcels')
      .select('current_owner_name')
      .eq('parcel_number', parcelNumber)
      .maybeSingle();
    setOwnerName(data?.current_owner_name || null);
  };

  if (!permitRequestData) return null;

  const d = permitRequestData;
  const requestType = getRequestType(d);
  const isConstruction = requestType === 'construction';

  const handleProcessRequest = async (action: 'approve' | 'reject' | 'return') => {
    if (!response.trim()) {
      toast.error('Veuillez fournir une réponse');
      return;
    }

    if (!user) {
      toast.error('Erreur d\'authentification');
      return;
    }

    // Vérifier le paiement avant d'approuver
    if (action === 'approve' && paymentStatus !== 'paid') {
      if (paymentStatus === 'pending') {
        toast.error('Le paiement des frais d\'autorisation est en attente. Veuillez attendre la confirmation du paiement.');
        return;
      } else if (paymentStatus === 'failed') {
        toast.error('Le paiement des frais d\'autorisation a échoué. Le demandeur doit effectuer le paiement à nouveau.');
        return;
      } else if (paymentStatus === 'not_found') {
        toast.error('Aucun paiement trouvé pour cette demande. Le demandeur doit d\'abord payer les frais d\'autorisation.');
        return;
      }
    }

    setProcessing(true);
    try {
      const newStatus = action === 'approve' ? 'approved' : action === 'reject' ? 'rejected' : 'returned';
      const updatedPermitData = {
        ...permitRequestData,
        status: newStatus,
        adminResponse: response,
        processedAt: new Date().toISOString()
      };

      // Si approuvé, générer un numéro de permis et créer l'enregistrement
      if (action === 'approve') {
        const { data: contribution } = await supabase
          .from('cadastral_contributions')
          .select('province, parcel_number')
          .eq('id', contributionId)
          .single();

        if (!contribution) throw new Error('Contribution non trouvée');

        const { data: parcel } = await supabase
          .from('cadastral_parcels')
          .select('id')
          .eq('parcel_number', contribution.parcel_number)
          .single();

        if (!parcel) throw new Error('Parcelle non trouvée. Assurez-vous que la contribution a été approuvée.');

        const { data: permitNumber } = await supabase.rpc('generate_permit_number', {
          permit_type: requestType,
          province: contribution?.province || 'RDC'
        });

        const { error: permitError } = await supabase
          .from('cadastral_building_permits')
          .insert({
            parcel_id: parcel.id,
            permit_number: permitNumber,
            issuing_service: 'Service de l\'Urbanisme',
            issue_date: new Date().toISOString().split('T')[0],
            validity_period_months: 36,
            administrative_status: 'Délivré',
            is_current: true
          });

        if (permitError) throw permitError;

        updatedPermitData.permitNumber = permitNumber;
        updatedPermitData.parcelId = parcel.id;
      }

      const { error } = await supabase
        .from('cadastral_contributions')
        .update({
          permit_request_data: updatedPermitData,
          status: newStatus
        })
        .eq('id', contributionId);

      if (error) throw error;

      // Auto-generate certificate on approval
      if (action === 'approve') {
        toast.info('Génération automatique du certificat de permis...');
        const certResult = await generateAndUploadCertificate(
          'permis_construire',
          {
            referenceNumber: updatedPermitData.permitNumber || `PERM-${Date.now()}`,
            recipientName: r(d, 'applicantName') || 'N/A',
            recipientEmail: r(d, 'applicantEmail') || undefined,
            parcelNumber: parcelNumber,
            issueDate: new Date().toISOString(),
            expiryDate: new Date(Date.now() + 36 * 30 * 24 * 60 * 60 * 1000).toISOString(),
            approvedBy: 'Bureau d\'Information Cadastrale',
            additionalData: { requestId: contributionId },
          },
          [
            { label: 'Type permis:', value: isConstruction ? 'Construction' : 'Régularisation' },
            { label: 'Demandeur:', value: r(d, 'applicantName') || 'N/A' },
            { label: 'Service émetteur:', value: "Service de l'Urbanisme" },
            { label: 'Validité:', value: '36 mois' },
          ],
          user?.id
        );
        if (certResult) {
          toast.success('Certificat d\'autorisation de bâtir généré');
        }
      }

      // Enregistrer l'action admin
      await supabase.from('permit_admin_actions').insert({
        contribution_id: contributionId,
        admin_user_id: user.id,
        action_type: action === 'approve' ? 'approved' : action === 'reject' ? 'rejected' : 'returned',
        comment: response
      });

      // Créer notification
      const notifMap = {
        approve: { type: 'success', title: 'Autorisation délivrée !', message: `Votre autorisation ${updatedPermitData.permitNumber} a été délivrée pour la parcelle ${parcelNumber}. Le certificat est disponible dans votre espace.` },
        reject: { type: 'error', title: 'Demande rejetée', message: `Votre demande d'autorisation pour la parcelle ${parcelNumber} a été rejetée. ${response}` },
        return: { type: 'warning', title: 'Demande renvoyée pour correction', message: `Votre demande d'autorisation pour la parcelle ${parcelNumber} a été renvoyée pour correction. ${response}` },
      };
      const notif = notifMap[action];
      await supabase.from('notifications').insert({
        user_id: userId,
        type: notif.type,
        title: notif.title,
        message: notif.message,
        action_url: '/user-dashboard?tab=building-permits'
      });

      toast.success(action === 'approve' ? 'Autorisation délivrée avec succès' : action === 'reject' ? 'Demande rejetée' : 'Demande renvoyée pour correction');
      trackAdminAction({
        module: 'permits',
        action,
        ref: { contribution_id: contributionId, parcel_number: parcelNumber },
        meta: { certificate_generated: action === 'approve' },
      });
      onProcessed();
      onOpenChange(false);
    } catch (error: any) {
      toast.error(`Erreur: ${error.message}`);
    } finally {
      setProcessing(false);
    }
  };

  const permitTypeBadge = isConstruction
    ? <Badge variant="outline" className="bg-blue-50">Autorisation de bâtir</Badge>
    : <Badge variant="outline" className="bg-orange-50">Autorisation de régularisation</Badge>;

  // Resolve all fields with compatibility
  const applicantName = r(d, 'applicantName');
  const applicantPhone = r(d, 'applicantPhone');
  const applicantEmail = r(d, 'applicantEmail');
  const applicantAddress = r(d, 'applicantAddress');
  const constructionType = r(d, 'constructionType');
  const constructionNature = r(d, 'constructionNature', 'buildingMaterials');
  const declaredUsage = r(d, 'declaredUsage', 'plannedUsage');
  const plannedArea = r(d, 'plannedArea', 'estimatedArea');
  const numberOfFloors = r(d, 'numberOfFloors');
  const numberOfRooms = r(d, 'numberOfRooms');
  const roofingType = r(d, 'roofingType');
  const waterSupply = r(d, 'waterSupply');
  const electricitySupply = r(d, 'electricitySupply');
  const estimatedCost = r(d, 'estimatedCost');
  const projectDescription = r(d, 'projectDescription', 'constructionDescription');
  const architectName = r(d, 'architectName');
  const architectLicense = r(d, 'architectLicense');
  const startDate = r(d, 'startDate');
  const estimatedDuration = r(d, 'estimatedDuration');
  const constructionDate = r(d, 'constructionDate', 'constructionYear');
  const currentState = r(d, 'currentState');
  const complianceIssues = r(d, 'complianceIssues');
  const regularizationReason = r(d, 'regularizationReason');
  const originalPermitNumber = r(d, 'originalPermitNumber');

  // Attachments: new format is object { key: url }, old format may be arrays
  const attachments = d.attachments || {};
  const hasAttachments = typeof attachments === 'object' && Object.keys(attachments).some(k => attachments[k]);
  const oldArchPlans = Array.isArray(d.architecturalPlanImages) ? d.architecturalPlanImages : [];
  const oldPhotos = Array.isArray(d.constructionPhotos) ? d.constructionPhotos : [];

  const attachmentLabels: Record<string, string> = {
    architectural_plans: 'Plans architecturaux',
    id_document: 'Pièce d\'identité',
    property_title: 'Titre de propriété',
    environmental_study: 'Étude environnementale',
    site_photos: 'Photos du site',
    other: 'Autre document',
  };

  const InfoRow = ({ label, value, icon }: { label: string; value: string | null; icon?: React.ReactNode }) => {
    if (!value) return null;
    return (
      <div className="flex items-start gap-2">
        {icon && <span className="text-muted-foreground mt-0.5">{icon}</span>}
        <div>
          <span className="font-medium text-foreground">{label}:</span>{' '}
          <span className="text-muted-foreground">{value}</span>
        </div>
      </div>
    );
  };

  const isPending = !d.status || d.status === 'pending' || d.status === 'returned';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Demande d'autorisation - Parcelle {parcelNumber}
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-4">
          <div className="space-y-4">
            {/* Type et statut */}
            <div className="flex items-center justify-between">
              {permitTypeBadge}
              {d.status && (
                <Badge variant={
                  d.status === 'approved' ? 'default' : 
                  d.status === 'rejected' ? 'destructive' : 
                  d.status === 'returned' ? 'secondary' : 'outline'
                }>
                  {d.status === 'approved' ? 'Approuvé' : 
                   d.status === 'rejected' ? 'Rejeté' : 
                   d.status === 'returned' ? 'Renvoyé' : 'En attente'}
                </Badge>
              )}
            </div>

            {/* Propriétaire */}
            {ownerName && (
              <Card className="p-3 bg-muted/30">
                <div className="flex items-center gap-2 text-sm">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">Propriétaire actuel:</span>
                  <span>{ownerName}</span>
                </div>
              </Card>
            )}

            {/* Informations demandeur */}
            <Card className="p-4">
              <Label className="text-sm font-semibold mb-3 block">Demandeur</Label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span>{applicantName || 'Non renseigné'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span>{applicantPhone || 'Non renseigné'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span>{applicantEmail || 'Non renseigné'}</span>
                </div>
                {applicantAddress && (
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span>{applicantAddress}</span>
                  </div>
                )}
              </div>
            </Card>

            {/* Détails de la construction */}
            <Card className="p-4">
              <Label className="text-sm font-semibold mb-3 block">Détails de la construction</Label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                <InfoRow label="Type" value={constructionType} />
                <InfoRow label="Nature" value={constructionNature} />
                <InfoRow label="Usage déclaré" value={declaredUsage} />
                <InfoRow label="Surface" value={plannedArea ? `${plannedArea} m²` : null} icon={<Ruler className="h-3.5 w-3.5" />} />
                <InfoRow label="Étages" value={numberOfFloors} icon={<Layers className="h-3.5 w-3.5" />} />
                <InfoRow label="Pièces" value={numberOfRooms} />
                <InfoRow label="Toiture" value={roofingType} icon={<Home className="h-3.5 w-3.5" />} />
                <InfoRow label="Eau" value={waterSupply} icon={<Droplets className="h-3.5 w-3.5" />} />
                <InfoRow label="Électricité" value={electricitySupply} icon={<Zap className="h-3.5 w-3.5" />} />
                <InfoRow label="Coût estimé" value={estimatedCost ? `${Number(estimatedCost).toLocaleString('fr-FR')} USD` : null} icon={<DollarSign className="h-3.5 w-3.5" />} />
              </div>
              {projectDescription && (
                <div className="mt-3 text-sm">
                  <span className="font-medium">Description:</span>
                  <p className="text-muted-foreground mt-1">{projectDescription}</p>
                </div>
              )}
            </Card>

            {/* Architecte */}
            {(architectName || architectLicense) && (
              <Card className="p-4">
                <Label className="text-sm font-semibold mb-3 block">Architecte / Maître d'œuvre</Label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                  <InfoRow label="Nom" value={architectName} />
                  <InfoRow label="N° d'agrément" value={architectLicense} />
                </div>
              </Card>
            )}

            {/* Planification (construction) */}
            {isConstruction && (startDate || estimatedDuration) && (
              <Card className="p-4">
                <Label className="text-sm font-semibold mb-3 block">Planification</Label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                  <InfoRow label="Date de début" value={startDate} />
                  <InfoRow label="Durée estimée" value={estimatedDuration ? `${estimatedDuration} mois` : null} />
                </div>
              </Card>
            )}

            {/* Régularisation */}
            {!isConstruction && (
              <Card className="p-4 border-orange-200 dark:border-orange-800">
                <Label className="text-sm font-semibold mb-3 block text-orange-700 dark:text-orange-400">Détails régularisation</Label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                  <InfoRow label="Date de construction" value={constructionDate} />
                  <InfoRow label="État actuel" value={currentState} />
                  <InfoRow label="Problèmes de conformité" value={complianceIssues} />
                  <InfoRow label="N° permis original" value={originalPermitNumber} />
                </div>
                {regularizationReason && (
                  <div className="mt-2 text-sm">
                    <span className="font-medium">Raison:</span>
                    <p className="text-muted-foreground mt-1">{regularizationReason}</p>
                  </div>
                )}
              </Card>
            )}

            {/* Documents joints */}
            {(hasAttachments || oldArchPlans.length > 0 || oldPhotos.length > 0) && (
              <Card className="p-4">
                <Label className="text-sm font-semibold mb-3 block flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Documents joints
                </Label>
                <div className="space-y-2">
                  {/* New format attachments */}
                  {hasAttachments && Object.entries(attachments).map(([key, url]) => {
                    if (!url) return null;
                    return (
                      <a key={key} href={url as string} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-2 text-sm text-primary hover:underline p-2 rounded-lg bg-muted/50">
                        <FileText className="h-4 w-4" />
                        {attachmentLabels[key] || key}
                      </a>
                    );
                  })}
                  {/* Old format: architectural plans */}
                  {oldArchPlans.length > 0 && (
                    <div>
                      <p className="text-xs font-medium mb-1">Plans architecturaux ({oldArchPlans.length})</p>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                        {oldArchPlans.map((img: string, idx: number) => (
                          <a key={idx} href={img} target="_blank" rel="noopener noreferrer"
                            className="relative aspect-square bg-muted rounded-lg overflow-hidden hover:opacity-80 transition-opacity">
                            <img src={img} alt={`Plan ${idx + 1}`} className="w-full h-full object-cover" />
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                  {/* Old format: construction photos */}
                  {oldPhotos.length > 0 && (
                    <div>
                      <p className="text-xs font-medium mb-1">Photos ({oldPhotos.length})</p>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                        {oldPhotos.map((img: string, idx: number) => (
                          <a key={idx} href={img} target="_blank" rel="noopener noreferrer"
                            className="relative aspect-square bg-muted rounded-lg overflow-hidden hover:opacity-80 transition-opacity">
                            <img src={img} alt={`Photo ${idx + 1}`} className="w-full h-full object-cover" />
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </Card>
            )}

            {/* Statut du paiement */}
            <Card className="p-4">
              <Label className="text-sm font-semibold mb-2 block flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Statut du paiement des frais
              </Label>
              {paymentStatus === 'paid' && (
                <Alert className="bg-green-50 border-green-200">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-800">Les frais de permis ont été payés avec succès</AlertDescription>
                </Alert>
              )}
              {paymentStatus === 'pending' && (
                <Alert className="bg-yellow-50 border-yellow-200">
                  <AlertCircle className="h-4 w-4 text-yellow-600" />
                  <AlertDescription className="text-yellow-800">Paiement en attente de confirmation</AlertDescription>
                </Alert>
              )}
              {paymentStatus === 'failed' && (
                <Alert className="bg-red-50 border-red-200">
                  <XCircle className="h-4 w-4 text-red-600" />
                  <AlertDescription className="text-red-800">Le paiement a échoué</AlertDescription>
                </Alert>
              )}
              {paymentStatus === 'not_found' && (
                <Alert className="bg-gray-50 border-gray-200">
                  <AlertCircle className="h-4 w-4 text-gray-600" />
                  <AlertDescription className="text-gray-800">Aucun paiement enregistré pour cette demande</AlertDescription>
                </Alert>
              )}
            </Card>

            {/* Réponse admin (si déjà traité) */}
            {d.status && d.status !== 'pending' && d.status !== 'returned' && (
              <Card className="p-4 bg-muted">
                <Label className="text-sm font-semibold mb-2 block">Réponse de l'administrateur</Label>
                <p className="text-sm whitespace-pre-wrap">{d.adminResponse}</p>
                <p className="text-xs text-muted-foreground mt-2">
                  Traité le {new Date(d.processedAt).toLocaleDateString('fr-FR')}
                </p>
              </Card>
            )}

            {/* Historique des actions */}
            <PermitActionsHistory contributionId={contributionId} />

            {/* Interface de traitement */}
            {isPending && (
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

        {isPending && (
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={processing}>
              Annuler
            </Button>
            <Button
              variant="secondary"
              onClick={() => handleProcessRequest('return')}
              disabled={processing || !response.trim()}
              className="gap-2"
            >
              <RotateCcw className="h-4 w-4" />
              Renvoyer
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
              disabled={processing || !response.trim() || paymentStatus !== 'paid'}
              className="gap-2"
              title={paymentStatus !== 'paid' ? 'Le paiement doit être effectué avant d\'approuver' : ''}
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

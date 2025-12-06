import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, FileEdit, CreditCard, CheckCircle2, AlertTriangle, MapPin, Clock, Hash } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useMutationRequest, MutationFee, MutationRequest } from '@/hooks/useMutationRequest';
import { useIsMobile } from '@/hooks/use-mobile';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface MutationRequestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  parcelNumber: string;
  parcelId?: string;
  parcelData?: {
    province?: string;
    ville?: string;
    commune?: string;
    quartier?: string;
    current_owner_name?: string;
  };
}

type Step = 'form' | 'payment' | 'confirmation';

const MutationRequestDialog: React.FC<MutationRequestDialogProps> = ({
  open,
  onOpenChange,
  parcelNumber,
  parcelId,
  parcelData
}) => {
  const isMobile = useIsMobile();
  const { user, profile } = useAuth();
  const { loading, fees, createMutationRequest, updatePaymentStatus } = useMutationRequest();
  
  const [step, setStep] = useState<Step>('form');
  const [createdRequest, setCreatedRequest] = useState<MutationRequest | null>(null);
  
  // Form state
  const [mutationType, setMutationType] = useState<'update' | 'transfer' | 'correction'>('update');
  const [requesterType, setRequesterType] = useState<'owner' | 'representative' | 'third_party'>('owner');
  const [requesterName, setRequesterName] = useState('');
  const [requesterPhone, setRequesterPhone] = useState('');
  const [requesterEmail, setRequesterEmail] = useState('');
  const [beneficiaryName, setBeneficiaryName] = useState('');
  const [beneficiaryPhone, setBeneficiaryPhone] = useState('');
  const [proposedChanges, setProposedChanges] = useState('');
  const [justification, setJustification] = useState('');
  const [selectedFees, setSelectedFees] = useState<string[]>([]);
  
  // Payment state
  const [paymentMethod, setPaymentMethod] = useState<'mobile_money' | 'bank_card'>('mobile_money');
  const [paymentProvider, setPaymentProvider] = useState('');
  const [paymentPhone, setPaymentPhone] = useState('');
  const [processingPayment, setProcessingPayment] = useState(false);

  // Initialize form with user data
  useEffect(() => {
    if (profile) {
      setRequesterName(profile.full_name || '');
      setRequesterEmail(profile.email || '');
    }
    // Select mandatory fees by default
    const mandatoryFeeIds = fees.filter(f => f.is_mandatory).map(f => f.id);
    setSelectedFees(mandatoryFeeIds);
  }, [profile, fees]);

  const handleFeeToggle = (feeId: string, isMandatory: boolean) => {
    if (isMandatory) return; // Can't uncheck mandatory fees
    
    setSelectedFees(prev => 
      prev.includes(feeId) 
        ? prev.filter(id => id !== feeId)
        : [...prev, feeId]
    );
  };

  const getSelectedFeesDetails = () => {
    return fees.filter(f => selectedFees.includes(f.id));
  };

  const getTotalAmount = () => {
    return getSelectedFeesDetails().reduce((sum, fee) => sum + fee.amount_usd, 0);
  };

  const handleSubmitForm = async () => {
    if (!requesterName.trim()) {
      toast.error('Veuillez renseigner votre nom');
      return;
    }

    if (!proposedChanges.trim()) {
      toast.error('Veuillez décrire les modifications souhaitées');
      return;
    }

    const request = await createMutationRequest({
      parcel_number: parcelNumber,
      parcel_id: parcelId,
      mutation_type: mutationType,
      requester_type: requesterType,
      requester_name: requesterName,
      requester_phone: requesterPhone,
      requester_email: requesterEmail,
      beneficiary_name: requesterType !== 'owner' ? beneficiaryName : undefined,
      beneficiary_phone: requesterType !== 'owner' ? beneficiaryPhone : undefined,
      proposed_changes: { description: proposedChanges },
      justification,
      selected_fees: getSelectedFeesDetails()
    });

    if (request) {
      setCreatedRequest(request);
      setStep('payment');
    }
  };

  const handlePayment = async () => {
    if (!createdRequest) return;
    
    if (paymentMethod === 'mobile_money' && (!paymentProvider || !paymentPhone)) {
      toast.error('Veuillez sélectionner un opérateur et entrer votre numéro');
      return;
    }

    setProcessingPayment(true);
    
    try {
      // Simuler le paiement (à remplacer par vraie intégration)
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const success = await updatePaymentStatus(createdRequest.id, 'paid', 'PAY-' + Date.now());
      
      if (success) {
        setStep('confirmation');
        toast.success('Paiement effectué avec succès');
      } else {
        toast.error('Erreur lors de la mise à jour du paiement');
      }
    } catch (error) {
      toast.error('Erreur lors du paiement');
    } finally {
      setProcessingPayment(false);
    }
  };

  const handleClose = () => {
    setStep('form');
    setCreatedRequest(null);
    setMutationType('update');
    setRequesterType('owner');
    setProposedChanges('');
    setJustification('');
    onOpenChange(false);
  };

  const renderFormStep = () => (
    <ScrollArea className={isMobile ? 'h-[60vh]' : 'h-[70vh]'}>
      <div className="space-y-4 pr-4">
        {/* Info parcelle */}
        <Card className="bg-muted/50">
          <CardContent className="p-3">
            <div className="flex items-center gap-2 text-sm">
              <MapPin className="h-4 w-4 text-primary" />
              <span className="font-mono font-bold">{parcelNumber}</span>
              {parcelData?.province && (
                <span className="text-muted-foreground text-xs">
                  - {parcelData.province} {parcelData.ville}
                </span>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Type de mutation */}
        <div className="space-y-2">
          <Label className="text-xs font-medium">Type de mutation</Label>
          <Select value={mutationType} onValueChange={(v: any) => setMutationType(v)}>
            <SelectTrigger className="h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="update">Mise à jour des données</SelectItem>
              <SelectItem value="transfer">Transfert de propriété</SelectItem>
              <SelectItem value="correction">Correction d'erreur</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Type de demandeur */}
        <div className="space-y-2">
          <Label className="text-xs font-medium">Vous êtes</Label>
          <Select value={requesterType} onValueChange={(v: any) => setRequesterType(v)}>
            <SelectTrigger className="h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="owner">Le propriétaire</SelectItem>
              <SelectItem value="representative">Un mandataire</SelectItem>
              <SelectItem value="third_party">Un tiers</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Separator />

        {/* Informations du demandeur */}
        <div className="space-y-3">
          <h4 className="text-xs font-semibold text-muted-foreground uppercase">Vos informations</h4>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Nom complet *</Label>
              <Input
                value={requesterName}
                onChange={(e) => setRequesterName(e.target.value)}
                placeholder="Votre nom"
                className="h-9 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Téléphone</Label>
              <Input
                value={requesterPhone}
                onChange={(e) => setRequesterPhone(e.target.value)}
                placeholder="+243..."
                className="h-9 text-sm"
              />
            </div>
          </div>
          
          <div className="space-y-1.5">
            <Label className="text-xs">Email</Label>
            <Input
              type="email"
              value={requesterEmail}
              onChange={(e) => setRequesterEmail(e.target.value)}
              placeholder="email@exemple.com"
              className="h-9 text-sm"
            />
          </div>
        </div>

        {/* Bénéficiaire (si tiers) */}
        {requesterType !== 'owner' && (
          <>
            <Separator />
            <div className="space-y-3">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase">
                Informations du bénéficiaire
              </h4>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Nom du bénéficiaire</Label>
                  <Input
                    value={beneficiaryName}
                    onChange={(e) => setBeneficiaryName(e.target.value)}
                    placeholder="Nom complet"
                    className="h-9 text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Téléphone bénéficiaire</Label>
                  <Input
                    value={beneficiaryPhone}
                    onChange={(e) => setBeneficiaryPhone(e.target.value)}
                    placeholder="+243..."
                    className="h-9 text-sm"
                  />
                </div>
              </div>
            </div>
          </>
        )}

        <Separator />

        {/* Modifications souhaitées */}
        <div className="space-y-3">
          <h4 className="text-xs font-semibold text-muted-foreground uppercase">Modifications demandées</h4>
          
          <div className="space-y-1.5">
            <Label className="text-xs">Description des modifications *</Label>
            <Textarea
              value={proposedChanges}
              onChange={(e) => setProposedChanges(e.target.value)}
              placeholder="Décrivez les modifications que vous souhaitez apporter aux données cadastrales..."
              className="min-h-[80px] text-sm"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Justification (optionnel)</Label>
            <Textarea
              value={justification}
              onChange={(e) => setJustification(e.target.value)}
              placeholder="Motifs de votre demande de mutation..."
              className="min-h-[60px] text-sm"
            />
          </div>
        </div>

        <Separator />

        {/* Frais */}
        <div className="space-y-3">
          <h4 className="text-xs font-semibold text-muted-foreground uppercase">Frais de mutation</h4>
          
          <div className="space-y-2">
            {fees.map((fee) => (
              <div 
                key={fee.id}
                className="flex items-start gap-3 p-2.5 border rounded-lg bg-background"
              >
                <Checkbox
                  id={fee.id}
                  checked={selectedFees.includes(fee.id)}
                  onCheckedChange={() => handleFeeToggle(fee.id, fee.is_mandatory)}
                  disabled={fee.is_mandatory}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <label htmlFor={fee.id} className="text-sm font-medium cursor-pointer">
                      {fee.fee_name}
                      {fee.is_mandatory && (
                        <span className="ml-1.5 text-[10px] text-muted-foreground">(obligatoire)</span>
                      )}
                    </label>
                    <span className="text-sm font-bold text-primary">${fee.amount_usd}</span>
                  </div>
                  {fee.description && (
                    <p className="text-xs text-muted-foreground mt-0.5">{fee.description}</p>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between p-3 bg-primary/10 rounded-lg">
            <span className="font-semibold text-sm">Total à payer</span>
            <span className="text-xl font-bold text-primary">${getTotalAmount()}</span>
          </div>
        </div>

        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="text-xs">
            Le paiement est requis avant la soumission de votre demande. Votre demande sera traitée dans un délai de 14 jours ouvrables.
          </AlertDescription>
        </Alert>

        <Button 
          onClick={handleSubmitForm} 
          className="w-full"
          disabled={loading || selectedFees.length === 0}
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              Création...
            </>
          ) : (
            <>
              <CreditCard className="h-4 w-4 mr-2" />
              Passer au paiement (${getTotalAmount()})
            </>
          )}
        </Button>
      </div>
    </ScrollArea>
  );

  const renderPaymentStep = () => (
    <div className="space-y-4">
      <Card className="bg-muted/50">
        <CardContent className="p-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Référence</p>
              <p className="font-mono font-bold">{createdRequest?.reference_number}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground">Montant</p>
              <p className="text-xl font-bold text-primary">${createdRequest?.total_amount_usd}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-3">
        <Label className="text-xs font-medium">Mode de paiement</Label>
        <div className="grid grid-cols-2 gap-2">
          <Button
            variant={paymentMethod === 'mobile_money' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setPaymentMethod('mobile_money')}
            className="h-10"
          >
            Mobile Money
          </Button>
          <Button
            variant={paymentMethod === 'bank_card' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setPaymentMethod('bank_card')}
            className="h-10"
          >
            Carte bancaire
          </Button>
        </div>
      </div>

      {paymentMethod === 'mobile_money' && (
        <div className="space-y-3">
          <div className="space-y-2">
            <Label className="text-xs">Opérateur</Label>
            <Select value={paymentProvider} onValueChange={setPaymentProvider}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Sélectionner..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="airtel">Airtel Money</SelectItem>
                <SelectItem value="orange">Orange Money</SelectItem>
                <SelectItem value="mpesa">M-Pesa</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="text-xs">Numéro de téléphone</Label>
            <Input
              value={paymentPhone}
              onChange={(e) => setPaymentPhone(e.target.value)}
              placeholder="+243..."
              className="h-9"
            />
          </div>
        </div>
      )}

      <div className="flex gap-2">
        <Button 
          variant="outline" 
          onClick={() => setStep('form')}
          disabled={processingPayment}
          className="flex-1"
        >
          Retour
        </Button>
        <Button 
          onClick={handlePayment}
          disabled={processingPayment}
          className="flex-1"
        >
          {processingPayment ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              Paiement...
            </>
          ) : (
            'Payer maintenant'
          )}
        </Button>
      </div>
    </div>
  );

  const renderConfirmationStep = () => (
    <div className="space-y-4 text-center">
      <div className="w-16 h-16 mx-auto bg-green-100 rounded-full flex items-center justify-center">
        <CheckCircle2 className="h-8 w-8 text-green-600" />
      </div>
      
      <div>
        <h3 className="text-lg font-bold">Demande soumise avec succès</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Votre demande de mutation a été enregistrée et sera traitée dans les meilleurs délais.
        </p>
      </div>

      <Card className="text-left">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Récépissé de demande</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex items-center gap-2">
            <Hash className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">Référence:</span>
            <span className="font-mono font-bold">{createdRequest?.reference_number}</span>
          </div>
          
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">Parcelle:</span>
            <span className="font-mono">{parcelNumber}</span>
          </div>

          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">Délai estimé:</span>
            <span>{createdRequest?.estimated_processing_days} jours ouvrables</span>
          </div>

          <Separator />

          <div className="text-xs text-muted-foreground">
            <p>Date de soumission: {format(new Date(), 'dd MMMM yyyy à HH:mm', { locale: fr })}</p>
            <p className="mt-1">
              Localisation: {parcelData?.province} - {parcelData?.ville}
              {parcelData?.commune && `, ${parcelData.commune}`}
            </p>
          </div>
        </CardContent>
      </Card>

      <Alert>
        <AlertDescription className="text-xs text-left">
          Conservez votre numéro de référence <strong>{createdRequest?.reference_number}</strong> pour suivre l'état de votre demande.
        </AlertDescription>
      </Alert>

      <Button onClick={handleClose} className="w-full">
        Fermer
      </Button>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className={`${isMobile ? 'max-w-full h-[90vh] m-0' : 'max-w-lg'} p-4`}>
        <DialogHeader className="pb-2">
          <DialogTitle className="flex items-center gap-2 text-base">
            <FileEdit className="h-5 w-5 text-primary" />
            {step === 'confirmation' ? 'Confirmation' : 'Demande de mutation'}
          </DialogTitle>
          {step === 'form' && (
            <DialogDescription className="text-xs">
              Remplissez le formulaire pour demander une mise à jour des données cadastrales
            </DialogDescription>
          )}
        </DialogHeader>

        {step === 'form' && renderFormStep()}
        {step === 'payment' && renderPaymentStep()}
        {step === 'confirmation' && renderConfirmationStep()}
      </DialogContent>
    </Dialog>
  );
};

export default MutationRequestDialog;

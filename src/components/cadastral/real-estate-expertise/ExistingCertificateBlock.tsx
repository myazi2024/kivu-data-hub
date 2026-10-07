import React, { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ArrowLeft, CheckCircle2, CreditCard, DollarSign, FileText, Loader2, Smartphone } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { openExpertiseCertificate } from '@/utils/expertiseCertificateUrl';
import {
  createExpertisePayment,
  isValidDrcMobileNumber,
  processExpertiseMobileMoneyPayment,
  processExpertiseStripePayment,
  type ExpertisePaymentMethod,
} from '@/utils/expertisePaymentHelper';
import {
  certificateDaysRemaining,
  parcelCertificateQueryKey,
  type ParcelExpertiseCertificate,
} from '@/hooks/useExpertiseCertificateAccess';

interface ExistingCertificateBlockProps {
  parcelNumber: string;
  certificate: ParcelExpertiseCertificate;
  onDone: () => void;
}

/**
 * Certificat d'expertise valide déjà émis pour la parcelle : ouverture si
 * l'utilisateur y a droit, sinon achat de l'accès (prix et droits décidés
 * par le serveur).
 */
const ExistingCertificateBlock: React.FC<ExistingCertificateBlockProps> = ({ parcelNumber, certificate, onDone }) => {
  const queryClient = useQueryClient();
  const [showPayment, setShowPayment] = useState(false);
  const [method, setMethod] = useState<ExpertisePaymentMethod>('mobile_money');
  const [provider, setProvider] = useState('');
  const [phone, setPhone] = useState('');
  const [processing, setProcessing] = useState(false);

  const daysRemaining = certificateDaysRemaining(certificate.certificate_expiry_date);
  const issueDate = new Date(certificate.certificate_issue_date).toLocaleDateString('fr-FR', {
    day: 'numeric', month: 'long', year: 'numeric',
  });
  const fee = certificate.access_fee_usd;
  const canBuy = fee != null && fee > 0;

  const openCertificate = async () => {
    try {
      await openExpertiseCertificate(certificate.id, null);
    } catch (e: any) {
      toast.error(e?.message || 'Certificat indisponible');
    }
  };

  const handlePay = async () => {
    if (processing) return;
    if (method === 'mobile_money') {
      if (!provider || !phone) {
        toast.error('Veuillez sélectionner un opérateur et entrer votre numéro');
        return;
      }
      if (!isValidDrcMobileNumber(phone)) {
        toast.error('Numéro de téléphone invalide. Format attendu: +243XXXXXXXXX ou 0XXXXXXXXX');
        return;
      }
    }

    setProcessing(true);
    try {
      const payment = await createExpertisePayment({
        requestId: certificate.id,
        kind: 'certificate_access',
        method,
        provider,
        phone,
      });

      if (method === 'mobile_money') {
        await processExpertiseMobileMoneyPayment({ provider, phone, payment, paymentType: 'certificate_access' });
      } else {
        const redirected = await processExpertiseStripePayment({ payment, paymentType: 'certificate_access' });
        if (redirected) return;
      }

      await queryClient.invalidateQueries({ queryKey: parcelCertificateQueryKey(parcelNumber) });
      toast.success('Paiement réussi ! Vous pouvez accéder au certificat.');
      await openCertificate();
      onDone();
    } catch (error: any) {
      console.error('Certificate access payment error:', error);
      toast.error(error?.message || 'Erreur lors du paiement');
    } finally {
      setProcessing(false);
    }
  };

  if (!showPayment) {
    return (
      <div className="space-y-4">
        <Alert className="rounded-xl border-2 border-primary/30 bg-primary/5">
          <CheckCircle2 className="h-5 w-5 text-primary" />
          <AlertDescription className="text-sm space-y-2">
            <p className="font-semibold">Certificat d'expertise immobilière valide</p>
            <p className="text-muted-foreground">
              Un certificat d'expertise immobilière est en cours de validité pour cette parcelle,
              délivré le <strong>{issueDate}</strong>.
            </p>
            <p className="text-xs text-muted-foreground">
              Référence : <span className="font-mono">{certificate.reference_number}</span>
              {' '}— Expire dans {daysRemaining} jour{daysRemaining > 1 ? 's' : ''}
            </p>
          </AlertDescription>
        </Alert>

        {certificate.has_access && certificate.market_value_usd != null && (
          <Card className="rounded-xl border-primary/20">
            <CardContent className="p-3 flex items-center gap-3">
              <DollarSign className="h-5 w-5 text-primary flex-shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">Valeur vénale estimée</p>
                <p className="font-bold text-lg">${certificate.market_value_usd.toLocaleString()}</p>
              </div>
            </CardContent>
          </Card>
        )}

        {certificate.has_access ? (
          <>
            <Button variant="seloger" onClick={openCertificate} className="w-full h-11 rounded-2xl text-sm font-semibold">
              <FileText className="h-4 w-4 mr-2" />
              Ouvrir le certificat
            </Button>
            <p className="text-[11px] text-muted-foreground text-center">Accès déjà autorisé pour votre compte.</p>
          </>
        ) : canBuy ? (
          <>
            <Button variant="seloger" onClick={() => setShowPayment(true)} className="w-full h-11 rounded-2xl text-sm font-semibold">
              <FileText className="h-4 w-4 mr-2" />
              Accéder au certificat — ${fee}
            </Button>
            <p className="text-[11px] text-muted-foreground text-center">
              Un paiement est requis pour consulter le certificat complet.
            </p>
          </>
        ) : (
          <p className="text-xs text-muted-foreground text-center">
            L'accès à ce certificat n'est pas proposé pour le moment.
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <Button variant="ghost" size="sm" onClick={() => setShowPayment(false)} disabled={processing} className="h-8 gap-1 text-xs rounded-xl">
        <ArrowLeft className="h-3.5 w-3.5" /> Retour
      </Button>

      <Card className="rounded-xl border-primary/20">
        <CardContent className="p-3 space-y-1">
          <p className="text-sm font-semibold">Accès au certificat d'expertise immobilière</p>
          <p className="text-xs text-muted-foreground">Parcelle {parcelNumber}</p>
          <Separator className="my-2" />
          <div className="flex justify-between text-sm">
            <span>Accès au certificat</span>
            <span className="font-bold">${fee}</span>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-2">
        <Label className="text-xs font-medium">Mode de paiement</Label>
        <RadioGroup value={method} onValueChange={(v) => setMethod(v as ExpertisePaymentMethod)} className="flex gap-3">
          <div className="flex items-center gap-1.5">
            <RadioGroupItem value="mobile_money" id="cert-mm" />
            <Label htmlFor="cert-mm" className="text-xs cursor-pointer flex items-center gap-1">
              <Smartphone className="h-3.5 w-3.5" /> Mobile Money
            </Label>
          </div>
          <div className="flex items-center gap-1.5">
            <RadioGroupItem value="bank_card" id="cert-bc" />
            <Label htmlFor="cert-bc" className="text-xs cursor-pointer flex items-center gap-1">
              <CreditCard className="h-3.5 w-3.5" /> Carte bancaire
            </Label>
          </div>
        </RadioGroup>
      </div>

      {method === 'mobile_money' && (
        <div className="space-y-2">
          <Select value={provider} onValueChange={setProvider}>
            <SelectTrigger className="h-9 rounded-xl text-sm"><SelectValue placeholder="Opérateur" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="airtel_money">Airtel Money</SelectItem>
              <SelectItem value="orange_money">Orange Money</SelectItem>
              <SelectItem value="mpesa">M-Pesa</SelectItem>
            </SelectContent>
          </Select>
          <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+243 ..." className="h-9 rounded-xl text-sm" />
        </div>
      )}

      {method === 'bank_card' && (
        <div className="flex items-center gap-2 p-2.5 bg-muted/50 rounded-2xl border">
          <CreditCard className="h-4 w-4 text-primary flex-shrink-0" />
          <p className="text-xs text-muted-foreground">Redirection vers Stripe pour un paiement sécurisé.</p>
        </div>
      )}

      <Button
        variant="seloger"
        onClick={handlePay}
        disabled={processing || (method === 'mobile_money' && (!provider || !phone))}
        className="w-full h-10 rounded-2xl text-sm font-semibold"
      >
        {processing ? (
          <><Loader2 className="h-4 w-4 animate-spin mr-1.5" /> Traitement...</>
        ) : (
          <><CheckCircle2 className="h-4 w-4 mr-1.5" /> Payer ${fee}</>
        )}
      </Button>
    </div>
  );
};

export default ExistingCertificateBlock;

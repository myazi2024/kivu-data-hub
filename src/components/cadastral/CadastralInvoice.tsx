import React, { useState } from 'react';
import { X, Download, FileText, CheckCircle, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CadastralSearchResult } from '@/hooks/useCadastralSearch';
import { CADASTRAL_SERVICES } from '@/hooks/useCadastralBilling';

interface CadastralInvoiceProps {
  isOpen: boolean;
  onClose: () => void;
  result: CadastralSearchResult;
  paidServices: string[];
  onDownloadPDF: () => void;
}

const CadastralInvoice: React.FC<CadastralInvoiceProps> = ({
  isOpen,
  onClose,
  result,
  paidServices,
  onDownloadPDF
}) => {
  const [showCloseWarning, setShowCloseWarning] = useState(false);

  if (!isOpen) return null;

  const handleClose = () => {
    setShowCloseWarning(true);
  };

  const confirmClose = () => {
    setShowCloseWarning(false);
    onClose();
  };

  const cancelClose = () => {
    setShowCloseWarning(false);
  };

  // Calculer le total
  const total = paidServices.reduce((sum, serviceId) => {
    const service = CADASTRAL_SERVICES.find(s => s.id === serviceId);
    return sum + (service?.price || 0);
  }, 0);

  // Générer un numéro de facture
  const invoiceNumber = `BIC-${Date.now().toString().slice(-8)}`;
  const currentDate = new Date().toLocaleDateString('fr-FR');

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm p-2 md:p-4 md:flex md:items-center md:justify-center">
      <Card className="w-full h-full md:h-auto md:max-w-2xl md:max-h-[90vh] overflow-hidden bg-background border shadow-2xl md:rounded-lg">
        {/* Header - Mobile optimized */}
        <CardHeader className="pb-3 md:pb-4 p-3 md:p-6">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-2 md:gap-3 flex-1 min-w-0">
              <div className="w-10 h-10 md:w-12 md:h-12 bg-primary/10 rounded-full flex items-center justify-center shrink-0">
                <FileText className="h-5 w-5 md:h-6 md:w-6 text-primary" />
              </div>
              <div className="min-w-0">
                <CardTitle className="text-base md:text-xl leading-tight">
                  Facture de Services Cadastraux
                </CardTitle>
                <p className="text-xs md:text-sm text-muted-foreground">
                  Bureau de l'Immobilier du Congo (BIC)
                </p>
              </div>
            </div>
            {!showCloseWarning && (
              <Button variant="outline" size="sm" onClick={handleClose} className="shrink-0 h-8 w-8 p-0 md:h-9 md:w-9">
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </CardHeader>

        <CardContent className="p-3 md:p-6 space-y-4 md:space-y-6 overflow-auto">
          {showCloseWarning ? (
            <Alert className="border-orange-200 bg-orange-50">
              <AlertTriangle className="h-4 w-4 text-orange-600" />
              <AlertDescription className="text-orange-800">
                <div className="space-y-3">
                  <p className="font-medium">
                    Attention ! Vous ne pourrez plus accéder à cette facture une fois cette page fermée.
                  </p>
                  <p className="text-sm">
                    Nous vous recommandons de sauvegarder cette facture au format PDF avant de fermer.
                  </p>
                  <div className="flex gap-2 pt-2">
                    <Button variant="outline" size="sm" onClick={cancelClose}>
                      Annuler
                    </Button>
                    <Button 
                      variant="default" 
                      size="sm" 
                      onClick={onDownloadPDF}
                      className="mr-2"
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Télécharger PDF
                    </Button>
                    <Button variant="destructive" size="sm" onClick={confirmClose}>
                      Fermer définitivement
                    </Button>
                  </div>
                </div>
              </AlertDescription>
            </Alert>
          ) : (
            <>
              {/* Informations de facturation - Mobile optimized */}
              <div className="space-y-4 md:grid md:grid-cols-2 md:gap-6 md:space-y-0">
                <div className="space-y-2">
                  <h3 className="font-semibold responsive-caption uppercase tracking-wide">
                    Informations de facturation
                  </h3>
                  <div className="space-y-1">
                    <p className="responsive-body font-medium">Numéro: {invoiceNumber}</p>
                    <p className="responsive-caption">Date: {currentDate}</p>
                    <p className="responsive-caption">
                      Parcelle: {result.parcel.parcel_number}
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <h3 className="font-semibold responsive-caption uppercase tracking-wide">
                    Statut de paiement
                  </h3>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 md:h-5 md:w-5 text-green-500" />
                    <Badge variant="default" className="status-success text-xs md:text-sm">
                      Payé
                    </Badge>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Détails des services - Mobile optimized */}
              <div className="space-y-3 md:space-y-4">
                <h3 className="font-semibold responsive-caption uppercase tracking-wide">
                  Services achetés
                </h3>
                
                <div className="space-y-2 md:space-y-3">
                  {paidServices.map((serviceId) => {
                    const service = CADASTRAL_SERVICES.find(s => s.id === serviceId);
                    if (!service) return null;

                    return (
                      <div key={serviceId} className="flex flex-col md:flex-row md:items-center justify-between p-3 border rounded-lg gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="responsive-body font-medium">{service.name}</p>
                          <p className="responsive-caption text-muted-foreground">{service.description}</p>
                        </div>
                        <div className="text-right md:text-right">
                          <p className="responsive-body font-medium">{service.price.toLocaleString()} FC</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <Separator />

              {/* Total - Mobile optimized */}
              <div className="space-y-2 md:space-y-3">
                <div className="flex items-center justify-between">
                  <span className="responsive-body text-muted-foreground">Sous-total</span>
                  <span className="responsive-body">{total.toLocaleString()} FC</span>
                </div>
                <div className="flex items-center justify-between responsive-subtitle font-semibold">
                  <span>Total</span>
                  <span>{total.toLocaleString()} FC</span>
                </div>
              </div>

              <Separator />

              {/* Actions - Mobile optimized */}
              <div className="flex flex-col gap-3 pt-2 md:pt-4 md:flex-row">
                <Button 
                  onClick={onDownloadPDF}
                  className="w-full md:flex-1 btn-responsive"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Télécharger PDF
                </Button>
                <Button 
                  variant="outline" 
                  onClick={handleClose}
                  className="w-full md:flex-1 btn-responsive"
                >
                  Fermer
                </Button>
              </div>

              {/* Mentions légales - Mobile optimized */}
              <div className="pt-3 md:pt-4 responsive-caption text-muted-foreground leading-relaxed bg-muted/50 p-3 md:p-4 rounded-lg">
                <p className="mb-2">
                  <strong>Bureau de l'Immobilier du Congo (BIC)</strong>
                </p>
                <p className="mb-2">
                  Cette facture certifie l'achat des services cadastraux listés ci-dessus pour la parcelle {result.parcel.parcel_number}.
                  Les informations fournies proviennent des archives officielles du Ministère des Affaires Foncières.
                </p>
                <p>
                  Pour toute question concernant cette facture, veuillez contacter le service client du BIC.
                </p>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default CadastralInvoice;
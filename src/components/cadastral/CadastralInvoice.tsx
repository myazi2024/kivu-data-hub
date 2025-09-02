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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <Card className="w-full max-w-2xl max-h-screen overflow-hidden bg-background border shadow-2xl">
        {/* Header */}
        <CardHeader className="pb-4">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                <FileText className="h-6 w-6 text-primary" />
              </div>
              <div>
                <CardTitle className="text-xl">Facture de Services Cadastraux</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Bureau de l'Immobilier du Congo (BIC)
                </p>
              </div>
            </div>
            {!showCloseWarning && (
              <Button variant="outline" size="sm" onClick={handleClose}>
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
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
              {/* Informations de facturation */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                    Informations de facturation
                  </h3>
                  <div className="space-y-1">
                    <p className="font-medium">Numéro de facture: {invoiceNumber}</p>
                    <p className="text-sm text-muted-foreground">Date: {currentDate}</p>
                    <p className="text-sm text-muted-foreground">
                      Parcelle: {result.parcel.parcel_number}
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                    Statut de paiement
                  </h3>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-green-500" />
                    <Badge variant="default" className="bg-green-100 text-green-800">
                      Payé
                    </Badge>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Détails des services */}
              <div className="space-y-4">
                <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                  Services achetés
                </h3>
                
                <div className="space-y-3">
                  {paidServices.map((serviceId) => {
                    const service = CADASTRAL_SERVICES.find(s => s.id === serviceId);
                    if (!service) return null;

                    return (
                      <div key={serviceId} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex-1">
                          <p className="font-medium">{service.name}</p>
                          <p className="text-sm text-muted-foreground">{service.description}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-medium">{service.price.toLocaleString()} FC</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <Separator />

              {/* Total */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Sous-total</span>
                  <span>{total.toLocaleString()} FC</span>
                </div>
                <div className="flex items-center justify-between text-lg font-semibold">
                  <span>Total</span>
                  <span>{total.toLocaleString()} FC</span>
                </div>
              </div>

              <Separator />

              {/* Actions */}
              <div className="flex flex-col sm:flex-row gap-3 pt-4">
                <Button 
                  onClick={onDownloadPDF}
                  className="flex-1 sm:flex-none"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Télécharger PDF
                </Button>
                <Button 
                  variant="outline" 
                  onClick={handleClose}
                  className="flex-1 sm:flex-none"
                >
                  Fermer
                </Button>
              </div>

              {/* Mentions légales */}
              <div className="pt-4 text-xs text-muted-foreground leading-relaxed bg-muted/50 p-4 rounded-lg">
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
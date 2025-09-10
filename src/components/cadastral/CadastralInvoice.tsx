import React, { useState, useEffect } from 'react';
import { X, Download, FileText, CheckCircle, AlertTriangle, QrCode, Printer } from 'lucide-react';
import QRCode from 'qrcode';
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
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');

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

  // Stabiliser le numéro de facture avec le numéro de parcelle + timestamp de création
  const invoiceNumber = React.useMemo(
    () => `BIC-${result.parcel.parcel_number.replace(/[^0-9]/g, '').slice(-4)}-${Date.now().toString().slice(-6)}`,
    [result.parcel.parcel_number]
  );
  const currentDate = new Date().toLocaleDateString('fr-FR');

  // Générer QR code pour accès aux données
  useEffect(() => {
    const generateQR = async () => {
      try {
        const dataUrl = `${window.location.origin}/cadastral/${result.parcel.parcel_number}?invoice=${invoiceNumber}&services=${paidServices.join(',')}`;
        const qrUrl = await QRCode.toDataURL(dataUrl, {
          width: 120,
          margin: 1,
          color: { dark: '#000000', light: '#ffffff' }
        });
        setQrCodeUrl(qrUrl);
      } catch (error) {
        console.error('Erreur génération QR code:', error);
      }
    };
    
    if (isOpen && paidServices.length > 0) {
      generateQR();
    }
  }, [isOpen, result.parcel.parcel_number, invoiceNumber, paidServices]);

  // Early return after all hooks are called
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm p-1 md:p-4 flex items-start justify-center overflow-auto">
      <Card className="w-full max-w-xl my-1 md:my-0 md:max-h-[95vh] bg-background border shadow-2xl rounded-lg flex flex-col">
        {/* Header - Mobile optimized */}
        <CardHeader className="pb-2 md:pb-4 p-2 md:p-6">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-start gap-2 flex-1 min-w-0">
              <div className="w-8 h-8 md:w-12 md:h-12 bg-primary/10 rounded-full flex items-center justify-center shrink-0">
                <FileText className="h-4 w-4 md:h-6 md:w-6 text-primary" />
              </div>
              <div className="min-w-0">
                <CardTitle className="text-sm md:text-xl leading-tight">
                  Facture Services Cadastraux
                </CardTitle>
                <p className="text-xs text-muted-foreground">
                  Bureau de l'Immobilier du Congo
                </p>
              </div>
            </div>
            {!showCloseWarning && (
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => window.print()} 
                  className="shrink-0 h-7 w-7 p-0 md:h-9 md:w-9 shadow-sm hover:shadow-md transition-all duration-200 hover:scale-105"
                >
                  <Printer className="h-3 w-3 md:h-4 md:w-4" />
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleClose} 
                  className="shrink-0 h-7 w-7 p-0 md:h-9 md:w-9 shadow-sm hover:shadow-md transition-all duration-200 hover:scale-105"
                >
                  <X className="h-3 w-3 md:h-4 md:w-4" />
                </Button>
              </div>
            )}
          </div>
        </CardHeader>

        <CardContent className="p-2 md:p-6 space-y-2 md:space-y-4 overflow-auto flex-1 min-h-0">
          {showCloseWarning ? (
            <Alert className="border-orange-200 bg-orange-50 mx-1">
              <AlertTriangle className="h-3 w-3 md:h-4 md:w-4 text-orange-600" />
              <AlertDescription className="text-orange-800">
                <div className="space-y-1">
                  <p className="font-medium text-xs leading-tight">
                    Cette facture ne sera plus accessible après fermeture.
                  </p>
                  <p className="text-xs opacity-90 leading-tight">
                    Téléchargez le PDF avant de fermer.
                  </p>
                  <div className="flex flex-col gap-1 pt-1 md:flex-row md:gap-2">
                    <Button variant="outline" size="sm" onClick={cancelClose} className="text-xs h-7">
                      Annuler
                    </Button>
                    <Button 
                      variant="default" 
                      size="sm" 
                      onClick={onDownloadPDF}
                      className="text-xs h-7"
                    >
                      <Download className="h-3 w-3 mr-1" />
                      PDF
                    </Button>
                    <Button variant="destructive" size="sm" onClick={confirmClose} className="text-xs h-7">
                      Fermer
                    </Button>
                  </div>
                </div>
              </AlertDescription>
            </Alert>
          ) : (
            <>
              {/* Informations de facturation - Mobile optimized */}
              <div className="space-y-3 md:grid md:grid-cols-2 md:gap-4 md:space-y-0">
                <div className="space-y-1">
                  <h3 className="font-semibold text-xs uppercase tracking-wide">
                    Informations de facturation
                  </h3>
                  <div className="space-y-0.5">
                    <p className="text-sm font-medium">N°: {invoiceNumber}</p>
                    <p className="text-xs text-muted-foreground">Date: {currentDate}</p>
                    <p className="text-xs text-muted-foreground">
                      Parcelle: {result.parcel.parcel_number}
                    </p>
                  </div>
                </div>

                <div className="space-y-1">
                  <h3 className="font-semibold text-xs uppercase tracking-wide">
                    Statut & Paiement
                  </h3>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-3 w-3 md:h-4 md:w-4 text-green-500" />
                      <Badge variant="default" className="status-success text-xs">
                        Payé
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Visa •••• 4242
                    </p>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Détails des services - Mobile optimized */}
              <div className="space-y-2">
                <h3 className="font-semibold text-xs uppercase tracking-wide">
                  Services achetés
                </h3>
                
                <div className="space-y-1.5">
                  {paidServices.map((serviceId) => {
                    const service = CADASTRAL_SERVICES.find(s => s.id === serviceId);
                    if (!service) return null;

                    return (
                      <div key={serviceId} className="flex items-start justify-between p-2 border rounded-lg gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium leading-tight">{service.name}</p>
                          <p className="text-xs text-muted-foreground line-clamp-1">{service.description}</p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-xs font-medium">${service.price.toLocaleString()}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <Separator />

              {/* Total - Mobile optimized */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Sous-total</span>
                  <span className="text-xs">${total.toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between text-sm font-semibold">
                  <span>Total</span>
                  <span>${total.toLocaleString()}</span>
                </div>
              </div>

              <Separator />

              {/* QR Code d'accès aux données - Mobile optimized */}
              {qrCodeUrl && (
                <div className="flex flex-col sm:flex-row items-center gap-2 p-2 bg-muted/30 rounded-lg">
                  <div className="shrink-0">
                    <img src={qrCodeUrl} alt="QR Code d'accès" className="w-12 h-12 sm:w-16 sm:h-16" />
                  </div>
                  <div className="text-center sm:text-left space-y-0.5">
                    <div className="flex items-center gap-1 justify-center sm:justify-start">
                      <QrCode className="h-3 w-3 text-primary" />
                      <p className="text-xs font-medium">Accès rapide</p>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Scannez pour accéder aux données
                    </p>
                  </div>
                </div>
              )}

              <Separator />

              {/* Actions - Mobile optimized */}
              <div className="flex flex-col gap-2 pt-1 md:pt-2 md:flex-row">
                <Button 
                  onClick={() => window.print()}
                  variant="outline"
                  className="w-full md:flex-1 h-8 text-xs shadow-sm hover:shadow-md transition-all duration-200"
                >
                  <Printer className="h-3 w-3 mr-1" />
                  Imprimer
                </Button>
                <Button 
                  onClick={onDownloadPDF}
                  className="w-full md:flex-1 h-8 text-xs shadow-sm hover:shadow-md transition-all duration-200"
                >
                  <Download className="h-3 w-3 mr-1" />
                  PDF
                </Button>
                <Button 
                  variant="outline" 
                  onClick={handleClose}
                  className="w-full md:flex-1 h-8 text-xs shadow-sm hover:shadow-md transition-all duration-200"
                >
                  Fermer
                </Button>
              </div>

              {/* Mentions légales - Mobile optimized */}
              <div className="pt-1 text-xs text-muted-foreground bg-muted/50 p-2 rounded-lg">
                <p className="font-medium mb-0.5">Bureau de l'Immobilier du Congo</p>
                <p className="mb-0.5">
                  Facture services cadastraux - {result.parcel.parcel_number}
                </p>
                <p>Sources officielles Ministère Affaires Foncières</p>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default CadastralInvoice;
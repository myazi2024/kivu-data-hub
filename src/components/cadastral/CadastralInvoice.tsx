import React, { useState, useEffect, useMemo } from 'react';
import { X, Download, FileText, CheckCircle, AlertTriangle, QrCode, Printer } from 'lucide-react';
import QRCode from 'qrcode';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CadastralSearchResult } from '@/hooks/useCadastralSearch';
import { useCadastralServices, CadastralService } from '@/hooks/useCadastralServices';
import { TVA_RATE } from '@/constants/billing';

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
  // Fix #2: Utiliser le hook réactif au lieu de la variable globale deprecated
  const { services: catalogServices } = useCadastralServices();

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

  // Générer les données de facture de manière stable
  const invoiceData = useMemo(() => {
    const selectedServices = catalogServices.filter(s => paidServices.includes(s.id));
    const originalSubtotal = selectedServices.reduce((sum, service) => sum + Number(service.price), 0);
    
    // Récupérer les informations de remise depuis le localStorage ou les props
    const storedInvoice = localStorage.getItem('currentCadastralInvoice');
    let discountAmount = 0;
    let discountCode = '';
    
    if (storedInvoice) {
      try {
        const parsedInvoice = JSON.parse(storedInvoice);
        discountAmount = parsedInvoice.discount_amount_usd || 0;
        discountCode = parsedInvoice.discount_code_used || '';
      } catch (e) {
        console.log('Erreur lors de la lecture de la facture stockée:', e);
      }
    }
    
    const netAmount = Math.max(0, originalSubtotal - discountAmount);
    const tvaAmount = netAmount * TVA_RATE;
    const total = netAmount + tvaAmount;
    
    // Fix #5: Générer un numéro stable basé sur la parcelle
    const parcelId = result.parcel.parcel_number.replace(/[^0-9]/g, '').slice(-4);
    const stableHash = result.parcel.parcel_number.split('').reduce((a, b) => {
      a = ((a << 5) - a) + b.charCodeAt(0);
      return a & a;
    }, 0);
    const stableTimestamp = Math.abs(stableHash).toString().slice(-6);
    const locationCode = (result.parcel.ville || result.parcel.commune || 'RDC').substring(0, 4).toUpperCase();
    const invoiceNumber = `INV-${result.parcel.parcel_type}-${locationCode}-${parcelId}-${stableTimestamp}`;
    
    return {
      invoiceNumber,
      subtotal: originalSubtotal,
      discountAmount,
      discountCode,
      tvaAmount,
      total,
      selectedServices,
      currentDate: new Date().toLocaleDateString('fr-FR'),
      currentTime: new Date().toLocaleTimeString('fr-FR')
    };
  }, [result.parcel.parcel_number, result.parcel.ville, result.parcel.commune, result.parcel.parcel_type, paidServices, catalogServices]);

  // Informations légales de BIC
  const BIC_COMPANY_INFO = {
    name: "Bureau de l'Immobilier du Congo",
    abbreviation: "BIC",
    address: "Avenue Patrice Lumumba, Goma, Nord-Kivu, RDC",
    rccm: "RCCM/GOMA/2024/B/001234",
    idNat: "01-234-N12345C",
    numImpot: "A1234567890",
    email: "contact@bic-congo.cd",
    phone: "+243 997 123 456"
  };

  // Générer QR code pour accès aux données
  useEffect(() => {
    const generateQR = async () => {
      try {
        const dataUrl = `${window.location.origin}/cadastral/${result.parcel.parcel_number}?invoice=${invoiceData.invoiceNumber}&services=${paidServices.join(',')}`;
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
  }, [isOpen, result.parcel.parcel_number, invoiceData.invoiceNumber, paidServices]);

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
                  Justificatif de Paiement Services Cadastraux
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
                  className="shrink-0 h-7 w-7 p-0 md:h-9 md:w-9 transition-all duration-300 ease-out bg-background/80 backdrop-blur-sm border-border/50 hover:bg-accent hover:border-primary/30 hover:shadow-hover hover:scale-105 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1"
                >
                  <Printer className="h-3 w-3 md:h-4 md:w-4 transition-colors" />
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleClose} 
                  className="shrink-0 h-7 w-7 p-0 md:h-9 md:w-9 transition-all duration-300 ease-out bg-background/80 backdrop-blur-sm border-border/50 hover:bg-destructive/10 hover:border-destructive/30 hover:shadow-hover hover:scale-105 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive focus-visible:ring-offset-1"
                >
                  <X className="h-3 w-3 md:h-4 md:w-4 transition-colors hover:text-destructive" />
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
                    Ce justificatif ne sera plus accessible après fermeture.
                  </p>
                  <p className="text-xs opacity-90 leading-tight">
                    Téléchargez le justificatif avant de fermer.
                  </p>
                  <div className="flex flex-col gap-1 pt-1 md:flex-row md:gap-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={cancelClose} 
                      className="text-xs h-7 transition-all duration-300 ease-out hover:bg-accent hover:shadow-card hover:scale-105 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1"
                    >
                      Annuler
                    </Button>
                    <Button 
                      variant="default" 
                      size="sm" 
                      onClick={onDownloadPDF}
                      className="text-xs h-7 bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary transition-all duration-300 ease-out shadow-elegant hover:shadow-hover hover:scale-105 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-foreground focus-visible:ring-offset-1"
                    >
                      <Download className="h-3 w-3 mr-1" />
                      PDF
                    </Button>
                    <Button 
                      variant="destructive" 
                      size="sm" 
                      onClick={confirmClose} 
                      className="text-xs h-7 transition-all duration-300 ease-out hover:shadow-card hover:scale-105 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive-foreground focus-visible:ring-offset-1"
                    >
                      Fermer
                    </Button>
                  </div>
                </div>
              </AlertDescription>
            </Alert>
          ) : (
            <>
              {/* Informations légales de l'entreprise */}
              <div className="bg-muted/50 p-3 rounded-lg space-y-2">
                <div className="text-center">
                  <h2 className="font-bold text-sm">{BIC_COMPANY_INFO.name}</h2>
                  <p className="text-xs text-muted-foreground">{BIC_COMPANY_INFO.address}</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-1 text-xs text-muted-foreground">
                  <p>RCCM: {BIC_COMPANY_INFO.rccm}</p>
                  <p>ID NAT: {BIC_COMPANY_INFO.idNat}</p>
                  <p>N° IMPÔT: {BIC_COMPANY_INFO.numImpot}</p>
                </div>
                <div className="text-center text-xs">
                  <p>{BIC_COMPANY_INFO.email} | {BIC_COMPANY_INFO.phone}</p>
                </div>
              </div>

              <Separator />

              {/* Informations de facturation */}
              <div className="space-y-3 md:grid md:grid-cols-2 md:gap-4 md:space-y-0">
                <div className="space-y-1">
                  <h3 className="font-semibold text-xs uppercase tracking-wide">
                    Informations du justificatif
                  </h3>
                  <div className="space-y-0.5">
                    <p className="text-sm font-medium">N°: {invoiceData.invoiceNumber}</p>
                    <p className="text-xs text-muted-foreground">Date: {invoiceData.currentDate}</p>
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
                      {(() => {
                        const storedInvoice = localStorage.getItem('currentCadastralInvoice');
                        if (storedInvoice) {
                          try {
                            const invoice = JSON.parse(storedInvoice);
                            const paymentMethod = invoice.payment_method;
                            const phoneNumber = invoice.phone_number;
                            
                            if (paymentMethod && phoneNumber) {
                              const providerMap: Record<string, string> = {
                                'airtel_money': 'Airtel Money',
                                'orange_money': 'Orange Money',
                                'mpesa': 'M-Pesa'
                              };
                              const providerName = providerMap[paymentMethod] || paymentMethod;
                              const maskedPhone = phoneNumber.replace(/(\d{3})(\d+)(\d{4})/, '$1***$3');
                              return `${providerName} ${maskedPhone}`;
                            }
                          } catch (e) {
                            console.log('Erreur lecture données paiement:', e);
                          }
                        }
                        return 'Mobile Money ****';
                      })()}
                    </p>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Détails des services */}
              <div className="space-y-2">
                <h3 className="font-semibold text-xs uppercase tracking-wide">
                  Prestations acquises
                </h3>
                
                <div className="space-y-1.5">
                  {invoiceData.selectedServices.map((service) => (
                    <div key={service.id} className="flex items-start justify-between p-2 border rounded-lg gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium leading-tight">{service.name}</p>
                        <p className="text-xs text-muted-foreground line-clamp-1">{service.description || 'Service cadastral professionnel'}</p>
                        
                        {service.id === 'information' && (
                          <div className="mt-1 pt-1 border-t border-muted/30">
                            <p className="text-xs text-muted-foreground">
                              • Informations générales et propriétaire
                            </p>
                            {(result.parcel.construction_type || result.parcel.construction_nature || result.parcel.declared_usage) && (
                              <p className="text-xs text-muted-foreground">
                                • Informations sur la construction
                              </p>
                            )}
                            {result.building_permits?.some(permit => permit.is_current) && (
                              <p className="text-xs text-muted-foreground">
                                • Autorisation de bâtir actuelle
                              </p>
                            )}
                            {result.building_permits?.some(permit => !permit.is_current) && (
                              <p className="text-xs text-muted-foreground">
                                • Historique de permis ({result.building_permits.filter(permit => !permit.is_current).length} ancien{result.building_permits.filter(permit => !permit.is_current).length > 1 ? 's' : ''})
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-xs font-medium">${Number(service.price).toFixed(2)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <Separator />

              {/* Total avec TVA */}
              <div className="space-y-1 bg-muted/30 p-3 rounded-lg">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Sous-total</span>
                  <span className="text-xs">${invoiceData.subtotal.toFixed(2)} USD</span>
                </div>
                {invoiceData.discountAmount > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Remise ({invoiceData.discountCode})</span>
                    <span className="text-xs text-green-600">-${invoiceData.discountAmount.toFixed(2)} USD</span>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">{`TVA (${(TVA_RATE * 100).toFixed(0)}%)`}</span>
                  <span className="text-xs">${invoiceData.tvaAmount.toFixed(2)} USD</span>
                </div>
                <Separator className="my-1" />
                <div className="flex items-center justify-between text-sm font-semibold">
                  <span>TOTAL</span>
                  <span>${invoiceData.total.toFixed(2)} USD</span>
                </div>
              </div>

              <Separator />

              {/* QR Code d'accès aux données */}
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

              {/* Actions */}
              <div className="flex flex-col gap-2 pt-1 md:pt-2 md:flex-row">
                <Button 
                  onClick={() => window.print()}
                  variant="outline"
                  className="w-full md:flex-1 h-8 text-xs transition-all duration-300 ease-out bg-background/80 backdrop-blur-sm border-border/50 hover:bg-accent hover:border-primary/30 shadow-card hover:shadow-hover hover:scale-105 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1"
                >
                  <Printer className="h-3 w-3 mr-1 transition-colors" />
                  Imprimer
                </Button>
                <Button 
                  onClick={onDownloadPDF}
                  className="w-full md:flex-1 h-8 text-xs bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary transition-all duration-300 ease-out shadow-elegant hover:shadow-hover hover:scale-105 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-foreground focus-visible:ring-offset-1"
                >
                  <Download className="h-3 w-3 mr-1" />
                  Télécharger le justificatif
                </Button>
                <Button 
                  variant="outline" 
                  onClick={handleClose}
                  className="w-full md:flex-1 h-8 text-xs transition-all duration-300 ease-out bg-background/80 backdrop-blur-sm border-border/50 hover:bg-destructive/10 hover:border-destructive/30 hover:text-destructive shadow-card hover:shadow-hover hover:scale-105 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive focus-visible:ring-offset-1"
                >
                  Fermer
                </Button>
              </div>

              {/* Mentions légales */}
              <div className="pt-1 text-xs text-muted-foreground bg-muted/50 p-2 rounded-lg">
                <p className="font-medium mb-0.5">Mentions légales</p>
                <p className="mb-0.5">
                  Ce document constitue un justificatif de paiement officiel. Toutes les informations proviennent des sources officielles du Ministère des Affaires Foncières.
                </p>
                <p className="mb-0.5">
                  Document généré automatiquement le {invoiceData.currentDate} à {invoiceData.currentTime}
                </p>
                <p>
                  RCCM: {BIC_COMPANY_INFO.rccm} | ID NAT: {BIC_COMPANY_INFO.idNat} | N° IMPÔT: {BIC_COMPANY_INFO.numImpot}
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

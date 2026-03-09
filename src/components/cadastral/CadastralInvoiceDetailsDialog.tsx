import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Calendar, FileText, MapPin, User, Building, CreditCard, Download } from 'lucide-react';
// Fix #2: Types locaux, plus de dépendance sur useCadastralBilling

interface CadastralInvoiceForDialog {
  id: string;
  parcel_number: string;
  search_date: string;
  selected_services: any;
  total_amount_usd: number;
  status: string;
  invoice_number: string;
  client_name?: string | null;
  client_email: string;
  client_organization?: string | null;
  geographical_zone?: string | null;
  payment_method?: string | null;
  created_at: string;
  updated_at: string;
  discount_code_used?: string | null;
  discount_amount_usd?: number;
  original_amount_usd?: number;
}

interface CadastralInvoiceDetailsDialogProps {
  invoice: CadastralInvoiceForDialog | null;
  isOpen: boolean;
  onClose: () => void;
  onDownloadPDF: (invoice: CadastralInvoiceForDialog) => void;
}

const CadastralInvoiceDetailsDialog: React.FC<CadastralInvoiceDetailsDialogProps> = ({
  invoice,
  isOpen,
  onClose,
  onDownloadPDF
}) => {
  if (!invoice) return null;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
        return 'bg-green-100 text-green-800 border-green-300 dark:bg-green-900 dark:text-green-100';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300 dark:bg-yellow-900 dark:text-yellow-100';
      case 'failed':
        return 'bg-red-100 text-red-800 border-red-300 dark:bg-red-900 dark:text-red-100';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300 dark:bg-gray-900 dark:text-gray-100';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'paid':
        return 'Payée';
      case 'pending':
        return 'En attente';
      case 'failed':
        return 'Échec';
      default:
        return status;
    }
  };

  const getPaymentMethodDisplay = (method: string | null) => {
    if (!method) return 'Non spécifié';
    
    const methods: Record<string, string> = {
      'mobile_money': 'Mobile Money',
      'visa': 'Visa',
      'mastercard': 'Mastercard',
      'mpesa': 'M-Pesa',
      'airtel_money': 'Airtel Money',
      'orange_money': 'Orange Money',
      'stripe': 'Carte de crédit'
    };
    
    return methods[method] || method;
  };

  const selectedServices = invoice.selected_services as Array<{ 
    id: string; 
    name: string; 
    price: number; 
    selected: boolean; 
  }>;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Détails de la facture {invoice.invoice_number}
          </DialogTitle>
          <DialogDescription>
            Informations complètes sur la facture cadastrale
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* En-tête de la facture */}
          <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">
                  {new Date(invoice.search_date).toLocaleDateString('fr-FR', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric'
                  })}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">Parcelle {invoice.parcel_number}</span>
              </div>
            </div>
            
            <Badge className={`px-3 py-1 text-sm ${getStatusColor(invoice.status)}`}>
              {getStatusText(invoice.status)}
            </Badge>
          </div>

          <Separator />

          {/* Informations client */}
          <div className="space-y-3">
            <h3 className="text-lg font-semibold">Informations client</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Nom</span>
                </div>
                <p className="text-sm text-muted-foreground pl-6">
                  {invoice.client_name || 'Non spécifié'}
                </p>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Building className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Organisation</span>
                </div>
                <p className="text-sm text-muted-foreground pl-6">
                  {invoice.client_organization || 'Non spécifiée'}
                </p>
              </div>

              <div className="space-y-2 sm:col-span-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">Email</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  {invoice.client_email}
                </p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Services sélectionnés */}
          <div className="space-y-3">
            <h3 className="text-lg font-semibold">Services demandés</h3>
            <div className="space-y-2">
              {Array.isArray(selectedServices) && selectedServices.map((service) => (
                <div key={service.id} className="flex justify-between items-center py-2 px-3 bg-muted/30 rounded-md">
                  <span className="text-sm">{service.name || service.id}</span>
                  <span className="text-sm font-medium">${Number(service.price || 0).toFixed(2)}</span>
                </div>
              ))}
            </div>
          </div>

          <Separator />

          {/* Détails financiers */}
          <div className="space-y-3">
            <h3 className="text-lg font-semibold">Détails financiers</h3>
            <div className="space-y-2">
              {invoice.original_amount_usd && (
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Montant original</span>
                  <span className="text-sm">${Number(invoice.original_amount_usd).toFixed(2)}</span>
                </div>
              )}
              
              {(invoice.discount_amount_usd ?? 0) > 0 && (
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Remise appliquée</span>
                  <span className="text-sm text-green-600">-${Number(invoice.discount_amount_usd).toFixed(2)}</span>
                </div>
              )}

              {invoice.discount_code_used && (
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Code de réduction</span>
                  <Badge variant="outline" className="text-xs">
                    {invoice.discount_code_used}
                  </Badge>
                </div>
              )}

              <div className="border-t pt-2">
                <div className="flex justify-between items-center font-semibold">
                  <span>Total à payer</span>
                  <span className="text-primary text-lg">${Number(invoice.total_amount_usd).toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>

          <Separator />

          {/* Informations de paiement */}
          <div className="space-y-3">
            <h3 className="text-lg font-semibold">Informations de paiement</h3>
            <div className="flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Méthode de paiement</span>
            </div>
            <p className="text-sm text-muted-foreground pl-6">
              {getPaymentMethodDisplay(invoice.payment_method ?? null)}
            </p>
            
            {invoice.geographical_zone && (
              <div>
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Zone géographique</span>
                </div>
                <p className="text-sm text-muted-foreground pl-6">
                  {invoice.geographical_zone}
                </p>
              </div>
            )}
          </div>

          <Separator />

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3 pt-4">
            <Button 
              onClick={() => onDownloadPDF(invoice)} 
              className="flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              Télécharger PDF
            </Button>
            
            <Button variant="outline" onClick={onClose}>
              Fermer
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CadastralInvoiceDetailsDialog;

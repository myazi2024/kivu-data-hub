import React, { useState } from 'react';
import { 
  MapPin, 
  User, 
  Calendar, 
  DollarSign, 
  FileText, 
  Download, 
  Map,
  Building,
  Clock,
  AlertCircle,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { CadastralSearchResult } from '@/hooks/useCadastralSearch';
import CadastralMap from './CadastralMap';

interface CadastralResultCardProps {
  result: CadastralSearchResult;
  onClose: () => void;
}

const CadastralResultCard: React.FC<CadastralResultCardProps> = ({ result, onClose }) => {
  const [activeTab, setActiveTab] = useState('general');
  const { parcel, ownership_history, tax_history } = result;

  // Fonction pour formater les dates
  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('fr-FR');
  };

  // Fonction pour formater la superficie
  const formatArea = (sqm: number) => {
    if (sqm >= 10000) {
      return `${(sqm / 10000).toFixed(2)} ha (${sqm.toLocaleString()} m²)`;
    }
    return `${sqm.toLocaleString()} m²`;
  };

  // Fonction pour obtenir l'icône du statut de paiement
  const getPaymentStatusIcon = (status: string) => {
    switch (status) {
      case 'paid':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'overdue':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
    }
  };

  // Fonction pour obtenir la couleur du badge de statut
  const getPaymentStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return 'default';
      case 'overdue':
        return 'destructive';
      default:
        return 'secondary';
    }
  };

  // Fonction pour traduire le statut de paiement
  const translatePaymentStatus = (status: string) => {
    switch (status) {
      case 'paid':
        return 'Payé';
      case 'overdue':
        return 'En retard';
      case 'pending':
        return 'En attente';
      default:
        return status;
    }
  };

  // Calculer le statut fiscal global
  const getOverallTaxStatus = () => {
    const overdueTaxes = tax_history.filter(tax => tax.payment_status === 'overdue');
    const pendingTaxes = tax_history.filter(tax => tax.payment_status === 'pending');
    
    if (overdueTaxes.length > 0) return { status: 'overdue', count: overdueTaxes.length };
    if (pendingTaxes.length > 0) return { status: 'pending', count: pendingTaxes.length };
    return { status: 'up_to_date', count: 0 };
  };

  const taxStatus = getOverallTaxStatus();

  return (
    <Card className="w-full shadow-lg">
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-xl">
              <FileText className="h-5 w-5 text-primary" />
              Parcelle {parcel.parcel_number}
            </CardTitle>
            <div className="flex items-center gap-2 mt-2">
              <Badge variant={parcel.parcel_type === 'SU' ? 'default' : 'secondary'}>
                {parcel.parcel_type === 'SU' ? 'Section Urbaine' : 'Section Rurale'}
              </Badge>
              <Badge variant="outline">{parcel.location}</Badge>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose} className="h-8 w-8 p-0">
            <XCircle className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>

      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="general">Informations</TabsTrigger>
            <TabsTrigger value="location">Localisation</TabsTrigger>
            <TabsTrigger value="history">Historique</TabsTrigger>
            <TabsTrigger value="taxes">Taxes</TabsTrigger>
          </TabsList>

          {/* Onglet Informations générales */}
          <TabsContent value="general" className="mt-4 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Informations de propriété */}
              <Card>
                <CardContent className="p-4">
                  <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
                    <Building className="h-4 w-4" />
                    Titre de Propriété
                  </h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Type :</span>
                      <span className="font-medium">{parcel.property_title_type}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Superficie :</span>
                      <span className="font-medium">{formatArea(parcel.area_sqm)}</span>
                    </div>
                    {parcel.area_hectares > 0 && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">En hectares :</span>
                        <span className="font-medium">{parcel.area_hectares.toFixed(2)} ha</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Propriétaire actuel */}
              <Card>
                <CardContent className="p-4">
                  <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Propriétaire Actuel
                  </h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Nom :</span>
                      <span className="font-medium">{parcel.current_owner_name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Statut :</span>
                      <span className="font-medium">{parcel.current_owner_legal_status}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Depuis :</span>
                      <span className="font-medium">{formatDate(parcel.current_owner_since)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Statut fiscal */}
            <Card>
              <CardContent className="p-4">
                <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  Statut Fiscal
                </h4>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {taxStatus.status === 'up_to_date' && <CheckCircle className="h-4 w-4 text-green-500" />}
                    {taxStatus.status === 'pending' && <AlertCircle className="h-4 w-4 text-yellow-500" />}
                    {taxStatus.status === 'overdue' && <XCircle className="h-4 w-4 text-red-500" />}
                    <span className="text-sm">
                      {taxStatus.status === 'up_to_date' && 'À jour'}
                      {taxStatus.status === 'pending' && `${taxStatus.count} paiement(s) en attente`}
                      {taxStatus.status === 'overdue' && `${taxStatus.count} paiement(s) en retard`}
                    </span>
                  </div>
                  <Button variant="outline" size="sm">
                    <Download className="h-3 w-3 mr-1" />
                    Export PDF
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Onglet Localisation */}
          <TabsContent value="location" className="mt-4">
            <CadastralMap 
              coordinates={parcel.gps_coordinates}
              center={{ lat: parcel.latitude, lng: parcel.longitude }}
              parcelNumber={parcel.parcel_number}
            />
          </TabsContent>

          {/* Onglet Historique */}
          <TabsContent value="history" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Historique des Propriétaires
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Propriétaire actuel */}
                  <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                    <div className="w-2 h-2 bg-green-500 rounded-full mt-2" />
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{parcel.current_owner_name}</span>
                        <Badge variant="default">Propriétaire actuel</Badge>
                      </div>
                      <div className="text-sm text-muted-foreground mt-1">
                        {parcel.current_owner_legal_status} • Depuis {formatDate(parcel.current_owner_since)}
                      </div>
                    </div>
                  </div>

                  {/* Anciens propriétaires */}
                  {ownership_history.length > 0 && <Separator />}
                  {ownership_history.map((owner, index) => (
                    <div key={owner.id} className="flex items-start gap-3 p-3 rounded-lg">
                      <div className="w-2 h-2 bg-muted-foreground rounded-full mt-2" />
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className="font-medium">{owner.owner_name}</span>
                          {owner.mutation_type && (
                            <Badge variant="outline">{owner.mutation_type}</Badge>
                          )}
                        </div>
                        <div className="text-sm text-muted-foreground mt-1">
                          {owner.legal_status} • 
                          Du {formatDate(owner.ownership_start_date)} au {formatDate(owner.ownership_end_date)}
                        </div>
                      </div>
                    </div>
                  ))}

                  {ownership_history.length === 0 && (
                    <div className="text-center text-muted-foreground py-4">
                      Aucun historique de propriétaire disponible
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Onglet Taxes */}
          <TabsContent value="taxes" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  Historique des Taxes Foncières
                </CardTitle>
              </CardHeader>
              <CardContent>
                {tax_history.length > 0 ? (
                  <div className="space-y-3">
                    {tax_history.map((tax) => (
                      <div key={tax.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-3">
                          {getPaymentStatusIcon(tax.payment_status)}
                          <div>
                            <div className="font-medium">Année {tax.tax_year}</div>
                            <div className="text-sm text-muted-foreground">
                              Montant: ${tax.amount_usd.toLocaleString()} USD
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <Badge variant={getPaymentStatusBadge(tax.payment_status)}>
                            {translatePaymentStatus(tax.payment_status)}
                          </Badge>
                          {tax.payment_date && (
                            <div className="text-xs text-muted-foreground mt-1">
                              Payé le {formatDate(tax.payment_date)}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center text-muted-foreground py-4">
                    Aucun historique de taxes disponible
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default CadastralResultCard;
import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { 
  Building2, 
  User, 
  Phone, 
  Mail, 
  MapPin, 
  Calendar,
  FileText,
  DollarSign,
  Loader2,
  CheckCircle2,
  XCircle,
  AlertCircle
} from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';

interface BuildingPermitRequest {
  id: string;
  created_at: string;
  user_id: string;
  action: string;
  new_values: {
    parcel_number: string;
    request_type: string;
    request_data: {
      requestType: 'new' | 'regularization';
      hasExistingConstruction: boolean;
      constructionType?: string;
      constructionNature?: string;
      proposedUsage?: string;
      estimatedSurface?: number;
      numberOfFloors?: number;
      estimatedBudget?: number;
      constructionDescription?: string;
      applicantFullName: string;
      applicantLegalStatus: string;
      applicantPhone: string;
      applicantEmail: string;
      applicantAddress: string;
      paymentMethod?: string;
      paymentProvider?: string;
      phoneNumber?: string;
    };
  };
}

const AdminBuildingPermitRequests: React.FC = () => {
  const [requests, setRequests] = useState<BuildingPermitRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<BuildingPermitRequest | null>(null);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const { toast } = useToast();

  const fetchRequests = async () => {
    try {
      setLoading(true);
      
      // Récupérer les demandes depuis les audit_logs
      const { data, error } = await supabase
        .from('audit_logs')
        .select('*')
        .eq('action', 'building_permit_request_submitted')
        .order('created_at', { ascending: false });

      if (error) throw error;

      setRequests((data || []) as unknown as BuildingPermitRequest[]);
    } catch (error) {
      console.error('Error fetching building permit requests:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les demandes de permis",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const viewDetails = (request: BuildingPermitRequest) => {
    setSelectedRequest(request);
    setShowDetailsDialog(true);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getRequestTypeBadge = (type: 'new' | 'regularization') => {
    return type === 'new' ? (
      <Badge variant="default" className="bg-blue-500">
        <Building2 className="w-3 h-3 mr-1" />
        Nouveau permis
      </Badge>
    ) : (
      <Badge variant="secondary" className="bg-orange-500 text-white">
        <AlertCircle className="w-3 h-3 mr-1" />
        Régularisation
      </Badge>
    );
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="w-6 h-6" />
            Demandes de Permis de Construire
          </CardTitle>
          <CardDescription>
            Gérez les demandes de permis de construire soumises par les utilisateurs
          </CardDescription>
        </CardHeader>
        <CardContent>
          {requests.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Building2 className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p>Aucune demande de permis pour le moment</p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Parcelle</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Demandeur</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {requests.map((request) => {
                    const data = request.new_values.request_data;
                    return (
                      <TableRow key={request.id}>
                        <TableCell className="font-mono text-sm">
                          {formatDate(request.created_at)}
                        </TableCell>
                        <TableCell className="font-semibold">
                          {request.new_values.parcel_number}
                        </TableCell>
                        <TableCell>
                          {getRequestTypeBadge(data.requestType)}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <User className="w-4 h-4 text-muted-foreground" />
                            <span>{data.applicantFullName}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1 text-sm">
                            <div className="flex items-center gap-1">
                              <Phone className="w-3 h-3" />
                              {data.applicantPhone}
                            </div>
                            <div className="flex items-center gap-1">
                              <Mail className="w-3 h-3" />
                              {data.applicantEmail}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => viewDetails(request)}
                          >
                            <FileText className="w-4 h-4 mr-1" />
                            Détails
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog détails de la demande */}
      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building2 className="w-5 h-5" />
              Détails de la demande de permis
            </DialogTitle>
            <DialogDescription>
              Parcelle {selectedRequest?.new_values.parcel_number} - {selectedRequest && formatDate(selectedRequest.created_at)}
            </DialogDescription>
          </DialogHeader>
          
          {selectedRequest && (
            <ScrollArea className="max-h-[70vh] pr-4">
              <Tabs defaultValue="general" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="general">Général</TabsTrigger>
                  <TabsTrigger value="construction">Construction</TabsTrigger>
                  <TabsTrigger value="applicant">Demandeur</TabsTrigger>
                </TabsList>

                <TabsContent value="general" className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-muted-foreground">Type de demande</label>
                      <div>{getRequestTypeBadge(selectedRequest.new_values.request_data.requestType)}</div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-muted-foreground">Numéro de parcelle</label>
                      <p className="font-semibold">{selectedRequest.new_values.parcel_number}</p>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-muted-foreground">Construction existante</label>
                      <div>
                        {selectedRequest.new_values.request_data.hasExistingConstruction ? (
                          <Badge variant="default">Oui</Badge>
                        ) : (
                          <Badge variant="secondary">Non</Badge>
                        )}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-muted-foreground">Date de soumission</label>
                      <p>{formatDate(selectedRequest.created_at)}</p>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="construction" className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    {selectedRequest.new_values.request_data.constructionType && (
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-muted-foreground">Type de construction</label>
                        <p>{selectedRequest.new_values.request_data.constructionType}</p>
                      </div>
                    )}
                    {selectedRequest.new_values.request_data.constructionNature && (
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-muted-foreground">Nature</label>
                        <p>{selectedRequest.new_values.request_data.constructionNature}</p>
                      </div>
                    )}
                    {selectedRequest.new_values.request_data.proposedUsage && (
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-muted-foreground">Usage proposé</label>
                        <p>{selectedRequest.new_values.request_data.proposedUsage}</p>
                      </div>
                    )}
                    {selectedRequest.new_values.request_data.estimatedSurface && (
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-muted-foreground">Surface estimée</label>
                        <p>{selectedRequest.new_values.request_data.estimatedSurface} m²</p>
                      </div>
                    )}
                    {selectedRequest.new_values.request_data.numberOfFloors && (
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-muted-foreground">Nombre d'étages</label>
                        <p>{selectedRequest.new_values.request_data.numberOfFloors}</p>
                      </div>
                    )}
                    {selectedRequest.new_values.request_data.estimatedBudget && (
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-muted-foreground">Budget estimé</label>
                        <p className="flex items-center gap-1">
                          <DollarSign className="w-4 h-4" />
                          {selectedRequest.new_values.request_data.estimatedBudget.toLocaleString()} USD
                        </p>
                      </div>
                    )}
                  </div>
                  {selectedRequest.new_values.request_data.constructionDescription && (
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-muted-foreground">Description du projet</label>
                      <p className="text-sm bg-muted p-3 rounded-md">
                        {selectedRequest.new_values.request_data.constructionDescription}
                      </p>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="applicant" className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                        <User className="w-4 h-4" />
                        Nom complet
                      </label>
                      <p className="font-semibold">{selectedRequest.new_values.request_data.applicantFullName}</p>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-muted-foreground">Statut juridique</label>
                      <p>{selectedRequest.new_values.request_data.applicantLegalStatus}</p>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                        <Phone className="w-4 h-4" />
                        Téléphone
                      </label>
                      <p>{selectedRequest.new_values.request_data.applicantPhone}</p>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                        <Mail className="w-4 h-4" />
                        Email
                      </label>
                      <p>{selectedRequest.new_values.request_data.applicantEmail}</p>
                    </div>
                    <div className="space-y-2 col-span-2">
                      <label className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                        <MapPin className="w-4 h-4" />
                        Adresse
                      </label>
                      <p>{selectedRequest.new_values.request_data.applicantAddress}</p>
                    </div>
                  </div>
                  
                  {selectedRequest.new_values.request_data.paymentProvider && (
                    <div className="mt-6 pt-6 border-t">
                      <h4 className="font-medium mb-3">Informations de paiement</h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-muted-foreground">Méthode</label>
                          <p>{selectedRequest.new_values.request_data.paymentMethod}</p>
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-muted-foreground">Fournisseur</label>
                          <p>{selectedRequest.new_values.request_data.paymentProvider}</p>
                        </div>
                        {selectedRequest.new_values.request_data.phoneNumber && (
                          <div className="space-y-2">
                            <label className="text-sm font-medium text-muted-foreground">Numéro de paiement</label>
                            <p>{selectedRequest.new_values.request_data.phoneNumber}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default AdminBuildingPermitRequests;

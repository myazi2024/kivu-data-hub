import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { 
  FileSearch, Search, Filter, Eye, Check, X, User, MapPin, 
  Building, Calendar, DollarSign, Loader2, Clock, AlertTriangle,
  FileText, Download, UserCheck, RefreshCw, Award
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { ResponsiveTable, ResponsiveTableHeader, ResponsiveTableBody, ResponsiveTableRow, ResponsiveTableCell, ResponsiveTableHead } from '@/components/ui/responsive-table';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { exportToCSV } from '@/utils/csvExport';
import { generateExpertiseCertificatePDF } from '@/utils/generateExpertiseCertificatePDF';
import { 
  QUALITY_LABELS, CONDITION_LABELS, CONSTRUCTION_TYPE_LABELS, 
  WALL_LABELS, ROOF_LABELS, ROAD_LABELS, SOUND_LABELS, STATUS_LABELS 
} from '@/constants/expertiseLabels';
import type { ExpertiseRequest } from '@/types/expertise';

// Helper to parse extended data from additional_notes JSON
const parseExtendedData = (additionalNotes?: string): { userNotes: string; extendedData: Record<string, any> } => {
  if (!additionalNotes) return { userNotes: '', extendedData: {} };
  try {
    const parsed = JSON.parse(additionalNotes);
    return {
      userNotes: parsed.user_notes || '',
      extendedData: parsed.extended_data || {},
    };
  } catch {
    return { userNotes: additionalNotes, extendedData: {} };
  }
};

// Status config uses centralized labels

export const AdminExpertiseRequests: React.FC = () => {
  const { user } = useAuth();
  const [requests, setRequests] = useState<ExpertiseRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('_all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const itemsPerPage = 10;

  // Dialog states
  const [selectedRequest, setSelectedRequest] = useState<ExpertiseRequest | null>(null);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [showProcessDialog, setShowProcessDialog] = useState(false);
  const [processing, setProcessing] = useState(false);

  // Process form state
  // Process form state (certificateUrl removed - auto-generated)
  const [processAction, setProcessAction] = useState<'complete' | 'reject'>('complete');
  const [marketValue, setMarketValue] = useState('');
  const [processingNotes, setProcessingNotes] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [expertName, setExpertName] = useState('');
  const [expertTitle, setExpertTitle] = useState('L\'Expert Évaluateur Agréé');
  const [stampImageUrl, setStampImageUrl] = useState('');
  const [uploadingStamp, setUploadingStamp] = useState(false);

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('real_estate_expertise_requests')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false });

      if (statusFilter !== '_all') {
        query = query.eq('status', statusFilter);
      }

      if (searchQuery) {
        query = query.or(`reference_number.ilike.%${searchQuery}%,parcel_number.ilike.%${searchQuery}%,requester_name.ilike.%${searchQuery}%`);
      }

      const from = (currentPage - 1) * itemsPerPage;
      const to = from + itemsPerPage - 1;
      query = query.range(from, to);

      const { data, error, count } = await query;

      if (error) throw error;

      setRequests((data || []) as ExpertiseRequest[]);
      setTotalCount(count || 0);
    } catch (error: any) {
      console.error('Error fetching expertise requests:', error);
      toast.error('Erreur lors du chargement des demandes');
    } finally {
      setLoading(false);
    }
  }, [currentPage, statusFilter, searchQuery]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const handleViewDetails = (request: ExpertiseRequest) => {
    setSelectedRequest(request);
    setShowDetailsDialog(true);
  };

  const handleOpenProcess = (request: ExpertiseRequest) => {
    setSelectedRequest(request);
    setProcessAction('complete');
    setMarketValue(request.market_value_usd?.toString() || '');
    
    setProcessingNotes(request.processing_notes || '');
    setRejectionReason('');
    setExpertName('');
    setExpertTitle('L\'Expert Évaluateur Agréé');
    setStampImageUrl('');
    setShowProcessDialog(true);
  };

  const handleUploadStamp = async (file: File) => {
    setUploadingStamp(true);
    try {
      const ext = file.name.split('.').pop();
      const path = `stamps/stamp_${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from('expertise-certificates')
        .upload(path, file, { contentType: file.type, upsert: true });
      if (uploadError) throw uploadError;
      const { data: urlData } = supabase.storage
        .from('expertise-certificates')
        .getPublicUrl(path);
      setStampImageUrl(urlData.publicUrl);
      toast.success('Sceau uploadé avec succès');
    } catch (err: any) {
      toast.error(`Erreur upload: ${err.message}`);
    } finally {
      setUploadingStamp(false);
    }
  };

  const handleProcessRequest = async () => {
    if (!selectedRequest || !user) return;

    if (processAction === 'complete' && !marketValue) {
      toast.error('Veuillez renseigner la valeur vénale');
      return;
    }

    if (processAction === 'complete' && selectedRequest.payment_status !== 'paid') {
      toast.error('Le certificat ne peut être généré que pour une demande payée');
      return;
    }

    if (processAction === 'reject' && !rejectionReason) {
      toast.error('Veuillez indiquer la raison du rejet');
      return;
    }

    setProcessing(true);
    try {
      const updateData: any = {
        processing_notes: processingNotes,
        updated_at: new Date().toISOString(),
      };

      if (processAction === 'complete') {
        // Auto-generate the certificate PDF
        toast.info('Génération automatique du certificat en cours...');

        const issueDate = new Date().toISOString();
        const expiryDate = new Date();
        expiryDate.setMonth(expiryDate.getMonth() + 6);

        const pdfBlob = await generateExpertiseCertificatePDF({
          referenceNumber: selectedRequest.reference_number,
          parcelNumber: selectedRequest.parcel_number,
          requesterName: selectedRequest.requester_name,
          requesterEmail: selectedRequest.requester_email,
          propertyDescription: selectedRequest.property_description,
          constructionYear: selectedRequest.construction_year,
          constructionQuality: selectedRequest.construction_quality,
          numberOfFloors: selectedRequest.number_of_floors,
          totalBuiltAreaSqm: selectedRequest.total_built_area_sqm,
          propertyCondition: selectedRequest.property_condition,
          hasWaterSupply: selectedRequest.has_water_supply,
          hasElectricity: selectedRequest.has_electricity,
          hasSewageSystem: selectedRequest.has_sewage_system,
          hasInternet: (selectedRequest as any).has_internet || false,
          hasSecuritySystem: (selectedRequest as any).has_security_system || false,
          hasParking: (selectedRequest as any).has_parking || false,
          parkingSpaces: (selectedRequest as any).parking_spaces,
          hasGarden: (selectedRequest as any).has_garden || false,
          gardenAreaSqm: (selectedRequest as any).garden_area_sqm,
          roadAccessType: selectedRequest.road_access_type,
          distanceToMainRoadM: (selectedRequest as any).distance_to_main_road_m,
          distanceToHospitalKm: (selectedRequest as any).distance_to_hospital_km,
          distanceToSchoolKm: (selectedRequest as any).distance_to_school_km,
          distanceToMarketKm: (selectedRequest as any).distance_to_market_km,
          floodRiskZone: (selectedRequest as any).flood_risk_zone || false,
          erosionRiskZone: (selectedRequest as any).erosion_risk_zone || false,
          marketValueUsd: parseFloat(marketValue),
          expertiseDateStr: issueDate,
          issueDate: issueDate,
          expiryDate: expiryDate.toISOString(),
          approvedBy: expertName || 'Bureau d\'Information Cadastrale',
          expertName: expertName || undefined,
          expertTitle: expertTitle || undefined,
          stampImageUrl: stampImageUrl || undefined,
        });

        // Upload to Supabase Storage
        const fileName = `certificat_${selectedRequest.reference_number.replace(/[^a-zA-Z0-9-]/g, '_')}_${Date.now()}.pdf`;
        const filePath = `certificates/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('expertise-certificates')
          .upload(filePath, pdfBlob, {
            contentType: 'application/pdf',
            upsert: true,
          });

        if (uploadError) throw uploadError;

        // Get public URL
        const { data: urlData } = supabase.storage
          .from('expertise-certificates')
          .getPublicUrl(filePath);

        const certificateUrl = urlData.publicUrl;

        updateData.status = 'completed';
        updateData.market_value_usd = parseFloat(marketValue);
        updateData.certificate_url = certificateUrl;
        updateData.certificate_issue_date = issueDate;
        updateData.certificate_expiry_date = expiryDate.toISOString();
        updateData.expertise_date = issueDate;
      } else {
        updateData.status = 'rejected';
        updateData.rejection_reason = rejectionReason;
      }

      const { error } = await supabase
        .from('real_estate_expertise_requests')
        .update(updateData)
        .eq('id', selectedRequest.id);

      if (error) throw error;

      // Create notification for user
      await supabase.from('notifications').insert({
        user_id: selectedRequest.user_id,
        type: processAction === 'complete' ? 'success' : 'error',
        title: processAction === 'complete' 
          ? 'Certificat d\'expertise immobilière généré' 
          : 'Demande d\'expertise rejetée',
        message: processAction === 'complete'
          ? `Votre certificat d'expertise pour la parcelle ${selectedRequest.parcel_number} a été généré automatiquement. Valeur vénale: $${marketValue}. Le certificat est disponible dans votre espace.`
          : `Votre demande d'expertise pour la parcelle ${selectedRequest.parcel_number} a été rejetée. Raison: ${rejectionReason}`,
        action_url: '/dashboard?tab=expertise',
      });

      toast.success(processAction === 'complete' 
        ? 'Certificat généré et envoyé automatiquement' 
        : 'Demande rejetée');
      
      setShowProcessDialog(false);
      fetchRequests();
    } catch (error: any) {
      console.error('Error processing request:', error);
      toast.error(`Erreur: ${error.message || 'Erreur lors du traitement'}`);
    } finally {
      setProcessing(false);
    }
  };

  const getStats = useCallback(async () => {
    try {
      const statuses = ['pending', 'assigned', 'in_progress', 'completed'];
      const results: Record<string, number> = {};
      
      await Promise.all(statuses.map(async (status) => {
        const statusList = status === 'in_progress' ? ['in_progress', 'assigned'] : [status];
        let query = supabase
          .from('real_estate_expertise_requests')
          .select('*', { count: 'exact', head: true });
        
        if (statusList.length > 1) {
          query = query.in('status', statusList);
        } else {
          query = query.eq('status', status);
        }
        
        const { count } = await query;
        results[status] = count || 0;
      }));
      
      return {
        total: totalCount,
        pending: results['pending'] || 0,
        inProgress: results['in_progress'] || 0,
        completed: results['completed'] || 0,
      };
    } catch {
      return { total: totalCount, pending: 0, inProgress: 0, completed: 0 };
    }
  }, [totalCount]);

  const [stats, setStats] = useState({ total: 0, pending: 0, inProgress: 0, completed: 0 });
  
  useEffect(() => {
    getStats().then(setStats);
  }, [getStats, requests]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <FileSearch className="h-6 w-6 text-primary" />
            Demandes d'expertise immobilière
          </h2>
          <p className="text-muted-foreground text-sm">
            Gérez les demandes d'évaluation de valeur vénale
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={fetchRequests} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Actualiser
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              exportToCSV({
                filename: `expertises_${format(new Date(), 'yyyy-MM-dd')}.csv`,
                headers: ['Référence', 'Parcelle', 'Demandeur', 'Email', 'Statut', 'Valeur USD', 'Date'],
                data: requests.map(r => [
                  r.reference_number,
                  r.parcel_number,
                  r.requester_name,
                  r.requester_email || '',
                  STATUS_LABELS[r.status] || r.status,
                  r.market_value_usd?.toString() || '',
                  format(new Date(r.created_at), 'dd/MM/yyyy'),
                ])
              });
            }}
          >
            <Download className="h-4 w-4 mr-2" />
            Exporter CSV
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold">{stats.total}</p>
            <p className="text-xs text-muted-foreground">Total</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-amber-600">{stats.pending}</p>
            <p className="text-xs text-muted-foreground">En attente</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-blue-600">{stats.inProgress}</p>
            <p className="text-xs text-muted-foreground">En cours</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-green-600">{stats.completed}</p>
            <p className="text-xs text-muted-foreground">Terminées</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher par référence, parcelle ou demandeur..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-48">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Filtrer par statut" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="_all">Tous les statuts</SelectItem>
                <SelectItem value="pending">En attente</SelectItem>
                <SelectItem value="assigned">Assigné</SelectItem>
                <SelectItem value="in_progress">En cours</SelectItem>
                <SelectItem value="completed">Terminé</SelectItem>
                <SelectItem value="rejected">Rejeté</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : requests.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <FileSearch className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Aucune demande d'expertise trouvée</p>
            </div>
          ) : (
            <ResponsiveTable>
              <ResponsiveTableHeader>
                <ResponsiveTableRow>
                  <ResponsiveTableHead>Référence</ResponsiveTableHead>
                  <ResponsiveTableHead>Parcelle</ResponsiveTableHead>
                  <ResponsiveTableHead priority="low">Demandeur</ResponsiveTableHead>
                  <ResponsiveTableHead priority="low">Date</ResponsiveTableHead>
                  <ResponsiveTableHead>Statut</ResponsiveTableHead>
                  <ResponsiveTableHead>Paiement</ResponsiveTableHead>
                  <ResponsiveTableHead priority="low">Valeur</ResponsiveTableHead>
                  <ResponsiveTableHead className="text-right">Actions</ResponsiveTableHead>
                </ResponsiveTableRow>
              </ResponsiveTableHeader>
              <ResponsiveTableBody>
                {requests.map((request) => (
                  <ResponsiveTableRow key={request.id}>
                    <ResponsiveTableCell>
                      <span className="font-mono text-sm">{request.reference_number}</span>
                    </ResponsiveTableCell>
                    <ResponsiveTableCell>
                      <span className="font-medium">{request.parcel_number}</span>
                    </ResponsiveTableCell>
                    <ResponsiveTableCell label="Demandeur" priority="low">
                      <div>
                        <p className="text-sm font-medium">{request.requester_name}</p>
                        {request.requester_email && (
                          <p className="text-xs text-muted-foreground">{request.requester_email}</p>
                        )}
                      </div>
                    </ResponsiveTableCell>
                    <ResponsiveTableCell label="Date" priority="low">
                      <span className="text-sm">
                        {format(new Date(request.created_at), 'dd/MM/yyyy', { locale: fr })}
                      </span>
                    </ResponsiveTableCell>
                    <ResponsiveTableCell>
                      <StatusBadge status={request.status as any} />
                    </ResponsiveTableCell>
                    <ResponsiveTableCell>
                      <Badge variant={request.payment_status === 'paid' ? 'default' : request.payment_status === 'failed' ? 'destructive' : 'secondary'}>
                        {request.payment_status === 'paid' ? 'Payé' : request.payment_status === 'failed' ? 'Échoué' : 'En attente'}
                      </Badge>
                    </ResponsiveTableCell>
                    <ResponsiveTableCell label="Valeur" priority="low">
                      {request.market_value_usd ? (
                        <span className="font-bold text-green-600">
                          ${request.market_value_usd.toLocaleString()}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </ResponsiveTableCell>
                    <ResponsiveTableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleViewDetails(request)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        {request.status !== 'completed' && request.status !== 'rejected' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleOpenProcess(request)}
                          >
                            <UserCheck className="h-4 w-4 mr-1" />
                            Traiter
                          </Button>
                        )}
                      </div>
                    </ResponsiveTableCell>
                  </ResponsiveTableRow>
                ))}
              </ResponsiveTableBody>
            </ResponsiveTable>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalCount > itemsPerPage && (
        <div className="flex items-center justify-center gap-2 py-4">
          <Button
            variant="outline"
            size="sm"
            disabled={currentPage === 1}
            onClick={() => setCurrentPage(prev => prev - 1)}
          >
            Précédent
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {currentPage} sur {Math.ceil(totalCount / itemsPerPage)}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={currentPage >= Math.ceil(totalCount / itemsPerPage)}
            onClick={() => setCurrentPage(prev => prev + 1)}
          >
            Suivant
          </Button>
        </div>
      )}

      {/* Details Dialog */}
      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileSearch className="h-5 w-5 text-primary" />
              Détails de la demande
            </DialogTitle>
            <DialogDescription>
              Référence: {selectedRequest?.reference_number}
            </DialogDescription>
          </DialogHeader>
          
          {selectedRequest && (
            <ScrollArea className="max-h-[60vh]">
              <div className="space-y-4 pr-4">
                {/* Infos générales */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs text-muted-foreground">Parcelle</Label>
                    <p className="font-mono font-bold">{selectedRequest.parcel_number}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Statut</Label>
                    <StatusBadge status={selectedRequest.status as any} />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Paiement</Label>
                    <Badge variant={selectedRequest.payment_status === 'paid' ? 'default' : selectedRequest.payment_status === 'failed' ? 'destructive' : 'secondary'}>
                      {selectedRequest.payment_status === 'paid' ? 'Payé' : selectedRequest.payment_status === 'failed' ? 'Échoué' : 'En attente'}
                    </Badge>
                  </div>
                </div>

                <Separator />

                {/* Demandeur */}
                <div>
                  <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Demandeur
                  </h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <Label className="text-xs text-muted-foreground">Nom</Label>
                      <p>{selectedRequest.requester_name}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Email</Label>
                      <p>{selectedRequest.requester_email || '-'}</p>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Infos bien */}
                {(() => {
                  const { userNotes, extendedData } = parseExtendedData(selectedRequest.additional_notes);
                  return (
                    <>
                      <div>
                        <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                          <Building className="h-4 w-4" />
                          Informations du bien
                        </h4>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          {extendedData.construction_type && (
                            <div>
                              <Label className="text-xs text-muted-foreground">Type de construction</Label>
                              <p>{CONSTRUCTION_TYPE_LABELS[extendedData.construction_type] || extendedData.construction_type}</p>
                            </div>
                          )}
                          <div>
                            <Label className="text-xs text-muted-foreground">Année de construction</Label>
                            <p>{selectedRequest.construction_year || '-'}</p>
                          </div>
                          <div>
                            <Label className="text-xs text-muted-foreground">Surface bâtie</Label>
                            <p>{selectedRequest.total_built_area_sqm ? `${selectedRequest.total_built_area_sqm} m²` : '-'}</p>
                          </div>
                          <div>
                            <Label className="text-xs text-muted-foreground">État</Label>
                            <p>{CONDITION_LABELS[selectedRequest.property_condition || ''] || selectedRequest.property_condition || '-'}</p>
                          </div>
                          <div>
                            <Label className="text-xs text-muted-foreground">Qualité</Label>
                            <p>{QUALITY_LABELS[selectedRequest.construction_quality || ''] || selectedRequest.construction_quality || '-'}</p>
                          </div>
                          {extendedData.number_of_rooms && (
                            <div>
                              <Label className="text-xs text-muted-foreground">Nombre de pièces</Label>
                              <p>{extendedData.number_of_rooms}</p>
                            </div>
                          )}
                          {extendedData.number_of_bedrooms && (
                            <div>
                              <Label className="text-xs text-muted-foreground">Chambres</Label>
                              <p>{extendedData.number_of_bedrooms}</p>
                            </div>
                          )}
                          {extendedData.number_of_bathrooms && (
                            <div>
                              <Label className="text-xs text-muted-foreground">Salles de bain</Label>
                              <p>{extendedData.number_of_bathrooms}</p>
                            </div>
                          )}
                        </div>
                        {selectedRequest.property_description && (
                          <div className="mt-2">
                            <Label className="text-xs text-muted-foreground">Description</Label>
                            <p className="text-sm">{selectedRequest.property_description}</p>
                          </div>
                        )}
                      </div>

                      {/* Matériaux & Position (extended data) */}
                      {(extendedData.wall_material || extendedData.roof_material || extendedData.building_position) && (
                        <>
                          <Separator />
                          <div>
                            <h4 className="text-sm font-semibold mb-2">Matériaux & Emplacement</h4>
                            <div className="grid grid-cols-2 gap-4 text-sm">
                              {extendedData.wall_material && (
                                <div>
                                  <Label className="text-xs text-muted-foreground">Murs</Label>
                                  <p>{WALL_LABELS[extendedData.wall_material] || extendedData.wall_material}</p>
                                </div>
                              )}
                              {extendedData.roof_material && (
                                <div>
                                  <Label className="text-xs text-muted-foreground">Toiture</Label>
                                  <p>{ROOF_LABELS[extendedData.roof_material] || extendedData.roof_material}</p>
                                </div>
                              )}
                              {extendedData.sound_environment && (
                                <div>
                                  <Label className="text-xs text-muted-foreground">Environnement sonore</Label>
                                  <p>{SOUND_LABELS[extendedData.sound_environment] || extendedData.sound_environment}</p>
                                </div>
                              )}
                              {selectedRequest.road_access_type && (
                                <div>
                                  <Label className="text-xs text-muted-foreground">Accès routier</Label>
                                  <p>{ROAD_LABELS[selectedRequest.road_access_type] || selectedRequest.road_access_type}</p>
                                </div>
                              )}
                            </div>
                          </div>
                        </>
                      )}

                      {/* Notes utilisateur */}
                      {userNotes && (
                        <>
                          <Separator />
                          <div>
                            <Label className="text-xs text-muted-foreground">Notes de l'utilisateur</Label>
                            <p className="text-sm mt-1 bg-muted/50 p-2 rounded-lg">{userNotes}</p>
                          </div>
                        </>
                      )}
                    </>
                  );
                })()}
                 {/* Documents joints */}
                 {selectedRequest.supporting_documents && selectedRequest.supporting_documents.length > 0 && (
                   <>
                     <Separator />
                     <div>
                       <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                         <FileText className="h-4 w-4" />
                         Documents & Photos ({selectedRequest.supporting_documents.length})
                       </h4>
                       <div className="grid grid-cols-3 gap-2">
                         {selectedRequest.supporting_documents.map((url, idx) => {
                           const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(url);
                           return (
                             <a
                               key={idx}
                               href={url}
                               target="_blank"
                               rel="noopener noreferrer"
                               className="block border rounded-lg overflow-hidden hover:ring-2 ring-primary transition-all"
                             >
                               {isImage ? (
                                 <img src={url} alt={`Document ${idx + 1}`} className="w-full h-20 object-cover" />
                               ) : (
                                 <div className="flex items-center justify-center h-20 bg-muted">
                                   <FileText className="h-6 w-6 text-muted-foreground" />
                                 </div>
                               )}
                             </a>
                           );
                         })}
                       </div>
                     </div>
                   </>
                 )}

                 {/* Résultat si complété */}
                {selectedRequest.status === 'completed' && (
                  <>
                    <Separator />
                    <div className="bg-green-50 dark:bg-green-950/30 p-4 rounded-lg">
                      <h4 className="text-sm font-semibold mb-2 flex items-center gap-2 text-green-700 dark:text-green-400">
                        <DollarSign className="h-4 w-4" />
                        Résultat de l'expertise
                      </h4>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <Label className="text-xs text-muted-foreground">Valeur vénale</Label>
                          <p className="text-lg font-bold text-green-600">
                            ${selectedRequest.market_value_usd?.toLocaleString()}
                          </p>
                        </div>
                        <div>
                          <Label className="text-xs text-muted-foreground">Date d'émission</Label>
                          <p>{selectedRequest.certificate_issue_date ? format(new Date(selectedRequest.certificate_issue_date), 'dd/MM/yyyy') : '-'}</p>
                        </div>
                      </div>
                      {selectedRequest.certificate_url && (
                        <Button variant="outline" size="sm" className="mt-2" asChild>
                          <a href={selectedRequest.certificate_url} target="_blank" rel="noopener noreferrer">
                            <Download className="h-4 w-4 mr-2" />
                            Télécharger le certificat
                          </a>
                        </Button>
                      )}
                    </div>
                  </>
                )}

                {/* Rejet si rejeté */}
                {selectedRequest.status === 'rejected' && selectedRequest.rejection_reason && (
                  <>
                    <Separator />
                    <Alert className="bg-red-50 border-red-200">
                      <AlertTriangle className="h-4 w-4 text-red-600" />
                      <AlertDescription className="text-red-700">
                        <strong>Motif du rejet:</strong> {selectedRequest.rejection_reason}
                      </AlertDescription>
                    </Alert>
                  </>
                )}
              </div>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>

      {/* Process Dialog */}
      <Dialog open={showProcessDialog} onOpenChange={setShowProcessDialog}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Traiter la demande</DialogTitle>
            <DialogDescription>
              {selectedRequest?.reference_number} - {selectedRequest?.parcel_number}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="flex gap-2">
              <Button
                variant={processAction === 'complete' ? 'default' : 'outline'}
                onClick={() => setProcessAction('complete')}
                className="flex-1"
              >
                <Check className="h-4 w-4 mr-2" />
                Compléter
              </Button>
              <Button
                variant={processAction === 'reject' ? 'destructive' : 'outline'}
                onClick={() => setProcessAction('reject')}
                className="flex-1"
              >
                <X className="h-4 w-4 mr-2" />
                Rejeter
              </Button>
            </div>

            {processAction === 'complete' ? (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Valeur vénale (USD) *</Label>
                  <Input
                    type="number"
                    value={marketValue}
                    onChange={(e) => setMarketValue(e.target.value)}
                    placeholder="Ex: 50000"
                  />
                </div>

                <Separator />
                <p className="text-xs font-semibold text-muted-foreground">Informations de l'expert</p>

                <div className="space-y-2">
                  <Label>Nom de l'expert immobilier</Label>
                  <Input
                    value={expertName}
                    onChange={(e) => setExpertName(e.target.value)}
                    placeholder="Ex: Jean-Paul MUKENDI"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Titre / Fonction</Label>
                  <Input
                    value={expertTitle}
                    onChange={(e) => setExpertTitle(e.target.value)}
                    placeholder="Ex: L'Expert Évaluateur Agréé"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Sceau / Cachet (image)</Label>
                  <div className="flex gap-2 items-center">
                    {stampImageUrl && (
                      <img src={stampImageUrl} alt="Sceau" className="h-10 w-10 object-contain border rounded" />
                    )}
                    <Input
                      type="file"
                      accept="image/*"
                      disabled={uploadingStamp}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleUploadStamp(file);
                      }}
                    />
                  </div>
                  <p className="text-[10px] text-muted-foreground">
                    Format PNG recommandé avec fond transparent. Apparaîtra à côté de la signature sur le certificat.
                  </p>
                </div>

                <Alert className="bg-primary/5 border-primary/20">
                  <Award className="h-4 w-4 text-primary" />
                  <AlertDescription className="text-xs">
                    Le certificat PDF sera <strong>généré automatiquement</strong> avec le nom de l'expert, le sceau et toutes les informations du bien.
                  </AlertDescription>
                </Alert>
                <div className="space-y-2">
                  <Label>Notes de traitement</Label>
                  <Textarea
                    value={processingNotes}
                    onChange={(e) => setProcessingNotes(e.target.value)}
                    placeholder="Observations..."
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Raison du rejet *</Label>
                  <Textarea
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    placeholder="Indiquez la raison du rejet..."
                    className="min-h-[100px]"
                  />
                </div>
              </div>
            )}

            <div className="flex gap-2 pt-4">
              <Button
                variant="outline"
                onClick={() => setShowProcessDialog(false)}
                className="flex-1"
              >
                Annuler
              </Button>
              <Button
                onClick={handleProcessRequest}
                disabled={processing}
                className="flex-1"
                variant={processAction === 'reject' ? 'destructive' : 'default'}
              >
                {processing ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : processAction === 'complete' ? (
                  <Check className="h-4 w-4 mr-2" />
                ) : (
                  <X className="h-4 w-4 mr-2" />
                )}
                {processAction === 'complete' ? 'Valider' : 'Rejeter'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminExpertiseRequests;

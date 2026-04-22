import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { FileSearch, Loader2, Download, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { exportToCSV } from '@/utils/csvExport';
import { generateExpertiseCertificatePDF } from '@/utils/generateExpertiseCertificatePDF';
import { STATUS_LABELS } from '@/constants/expertiseLabels';
import type { ExpertiseRequest } from '@/types/expertise';
import ExpertiseStatsCards from './expertise/ExpertiseStatsCards';
import ExpertiseFilters from './expertise/ExpertiseFilters';
import ExpertiseProcessDialog, { type ExpertiseProcessAction } from './expertise/ExpertiseProcessDialog';
import ExpertiseRequestsTable from './expertise/ExpertiseRequestsTable';
import ExpertiseDetailsDialog from './expertise/ExpertiseDetailsDialog';
import { getExtendedData } from './expertise/expertiseHelpers';
import { trackEvent } from '@/lib/analytics';

export const AdminExpertiseRequests: React.FC = () => {
  const { user } = useAuth();
  const [requests, setRequests] = useState<ExpertiseRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('_all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const itemsPerPage = 10;

  const [selectedRequest, setSelectedRequest] = useState<ExpertiseRequest | null>(null);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [showProcessDialog, setShowProcessDialog] = useState(false);
  const [processing, setProcessing] = useState(false);

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

  useEffect(() => { fetchRequests(); }, [fetchRequests]);

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
      const updateData: Record<string, any> = {
        processing_notes: processingNotes,
        updated_at: new Date().toISOString(),
      };

      if (processAction === 'complete') {
        toast.info('Génération automatique du certificat en cours...');

        const issueDate = new Date().toISOString();
        const expiryDate = new Date();
        expiryDate.setMonth(expiryDate.getMonth() + 6);

        const { extendedData: extData } = getExtendedData(selectedRequest);

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
          hasInternet: selectedRequest.has_internet || false,
          hasSecuritySystem: selectedRequest.has_security_system || false,
          hasParking: selectedRequest.has_parking || false,
          parkingSpaces: selectedRequest.parking_spaces,
          hasGarden: selectedRequest.has_garden || false,
          gardenAreaSqm: selectedRequest.garden_area_sqm,
          roadAccessType: selectedRequest.road_access_type,
          distanceToMainRoadM: selectedRequest.distance_to_main_road_m,
          distanceToHospitalKm: selectedRequest.distance_to_hospital_km,
          distanceToSchoolKm: selectedRequest.distance_to_school_km,
          distanceToMarketKm: selectedRequest.distance_to_market_km,
          floodRiskZone: selectedRequest.flood_risk_zone || false,
          erosionRiskZone: selectedRequest.erosion_risk_zone || false,
          marketValueUsd: parseFloat(marketValue),
          expertiseDateStr: issueDate,
          issueDate,
          expiryDate: expiryDate.toISOString(),
          approvedBy: expertName || 'Bureau d\'Information Cadastrale',
          expertName: expertName || undefined,
          expertTitle: expertTitle || undefined,
          stampImageUrl: stampImageUrl || undefined,
          extendedData: extData,
        });

        const fileName = `certificat_${selectedRequest.reference_number.replace(/[^a-zA-Z0-9-]/g, '_')}_${Date.now()}.pdf`;
        const filePath = `certificates/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('expertise-certificates')
          .upload(filePath, pdfBlob, { contentType: 'application/pdf', upsert: true });
        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from('expertise-certificates')
          .getPublicUrl(filePath);

        updateData.status = 'completed';
        updateData.market_value_usd = parseFloat(marketValue);
        updateData.certificate_url = urlData.publicUrl;
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

      trackEvent('admin_action', {
        module: 'expertise',
        action: processAction,
        request_id: selectedRequest.id,
        parcel_number: selectedRequest.parcel_number,
      });

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

        if (statusList.length > 1) query = query.in('status', statusList);
        else query = query.eq('status', status);

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

      <ExpertiseStatsCards stats={stats} />

      <ExpertiseFilters
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        statusFilter={statusFilter}
        onStatusChange={setStatusFilter}
      />

      <ExpertiseRequestsTable
        loading={loading}
        requests={requests}
        onViewDetails={handleViewDetails}
        onProcess={handleOpenProcess}
      />

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

      <ExpertiseDetailsDialog
        open={showDetailsDialog}
        onOpenChange={setShowDetailsDialog}
        request={selectedRequest}
      />

      <ExpertiseProcessDialog
        open={showProcessDialog}
        onOpenChange={setShowProcessDialog}
        request={selectedRequest}
        processAction={processAction as ExpertiseProcessAction}
        onActionChange={(a) => setProcessAction(a)}
        marketValue={marketValue}
        onMarketValueChange={setMarketValue}
        expertName={expertName}
        onExpertNameChange={setExpertName}
        expertTitle={expertTitle}
        onExpertTitleChange={setExpertTitle}
        stampImageUrl={stampImageUrl}
        uploadingStamp={uploadingStamp}
        onUploadStamp={handleUploadStamp}
        processingNotes={processingNotes}
        onNotesChange={setProcessingNotes}
        rejectionReason={rejectionReason}
        onRejectionReasonChange={setRejectionReason}
        processing={processing}
        onConfirm={handleProcessRequest}
      />
    </div>
  );
};

export default AdminExpertiseRequests;

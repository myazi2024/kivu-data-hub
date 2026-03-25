import React, { useEffect, useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { usePagination } from '@/hooks/usePagination';
import {
  ResponsiveTable,
  ResponsiveTableBody,
  ResponsiveTableCell,
  ResponsiveTableHead,
  ResponsiveTableHeader,
  ResponsiveTableRow,
} from '@/components/ui/responsive-table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Building2, FileText, CheckCircle, XCircle, Clock, AlertCircle, Download } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { toast } from 'sonner';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { PermitRequestDialog } from './permits/PermitRequestDialog';
import { PaginationControls } from '@/components/shared/PaginationControls';
import { exportToCSV } from '@/utils/csvExport';

interface PermitRequest {
  id: string;
  parcel_number: string;
  user_id: string;
  permit_request_data: any;
  created_at: string;
  status: string;
}

const AdminBuildingPermits = () => {
  const [permits, setPermits] = useState<PermitRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'_all' | 'pending' | 'approved' | 'rejected' | 'returned'>('_all');
  const [filterType, setFilterType] = useState<'_all' | 'construction' | 'regularization'>('_all');
  const [selectedPermit, setSelectedPermit] = useState<PermitRequest | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    fetchPermits();
  }, []);

  const fetchPermits = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('cadastral_contributions')
        .select('id, parcel_number, user_id, permit_request_data, created_at, status')
        .not('permit_request_data', 'is', null)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPermits(data || []);
    } catch (error: any) {
      console.error('Error fetching permits:', error);
      toast.error('Erreur lors du chargement des demandes');
    } finally {
      setLoading(false);
    }
  };

  const filteredPermits = useMemo(() => permits.filter((permit) => {
    const permitData = permit.permit_request_data;
    const matchesSearch = 
      permit.parcel_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      permitData?.applicantName?.toLowerCase().includes(searchTerm.toLowerCase());
    
    // Use DB column status (not JSON)
    const matchesStatus = 
      filterStatus === '_all' ? true : permit.status === filterStatus;
    
    // Support both requestType (new format) and permitType (old format)
    const pType = permitData?.requestType === 'new' ? 'construction' : 
                  permitData?.requestType === 'regularization' ? 'regularization' :
                  permitData?.permitType || 'construction';
    const matchesType = 
      filterType === '_all' ? true : pType === filterType;
    
    return matchesSearch && matchesStatus && matchesType;
  }), [permits, searchTerm, filterStatus, filterType]);

  const {
    currentPage,
    pageSize,
    paginatedData: paginatedPermits,
    totalPages,
    goToPage,
    goToNextPage,
    goToPreviousPage,
    changePageSize,
    hasNextPage,
    hasPreviousPage,
    totalItems
  } = usePagination(filteredPermits, { initialPageSize: 15 });

  // Reset page when filters change
  useEffect(() => {
    goToPage(1);
  }, [searchTerm, filterStatus, filterType]);

  // Helper to resolve permit type across formats
  const getPermitType = (p: PermitRequest) => {
    const d = p.permit_request_data;
    if (d?.requestType === 'new') return 'construction';
    if (d?.requestType === 'regularization') return 'regularization';
    return d?.permitType || 'construction';
  };

  const stats = {
    total: permits.length,
    pending: permits.filter(p => p.status === 'pending').length,
    approved: permits.filter(p => p.status === 'approved').length,
    rejected: permits.filter(p => p.status === 'rejected').length,
    returned: permits.filter(p => p.status === 'returned').length,
    construction: permits.filter(p => getPermitType(p) === 'construction').length,
    regularization: permits.filter(p => getPermitType(p) === 'regularization').length,
  };

  const handleExportCSV = () => {
    const headers = ['Parcelle', 'Type', 'Demandeur', 'Téléphone', 'Date', 'Statut'];
    const data = filteredPermits.map(p => [
      p.parcel_number,
      getPermitType(p) === 'construction' ? 'Construction' : 'Régularisation',
      p.permit_request_data?.applicantName || 'N/A',
      p.permit_request_data?.applicantPhone || '',
      format(new Date(p.created_at), 'dd/MM/yyyy', { locale: fr }),
      p.status
    ]);
    exportToCSV({ headers, data, filename: `autorisations-batir-${format(new Date(), 'yyyy-MM-dd')}.csv` });
    toast.success('Export CSV réussi');
  };

  const handleViewPermit = (permit: PermitRequest) => {
    setSelectedPermit(permit);
    setDialogOpen(true);
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { variant: 'outline' as const, icon: Clock, label: 'En attente' },
      approved: { variant: 'default' as const, icon: CheckCircle, label: 'Approuvé' },
      rejected: { variant: 'destructive' as const, icon: XCircle, label: 'Rejeté' },
      returned: { variant: 'secondary' as const, icon: AlertCircle, label: 'Renvoyé' },
    };
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    const Icon = config.icon;
    
    return (
      <Badge variant={config.variant} className="gap-1">
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  const getTypeBadge = (type: string) => {
    return type === 'construction' ? (
      <Badge variant="outline" className="bg-blue-50">Autorisation de bâtir</Badge>
    ) : (
      <Badge variant="outline" className="bg-orange-50">Régularisation</Badge>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Statistics */}
      <div className="grid gap-4 md:grid-cols-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">En attente</CardTitle>
            <Clock className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pending}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Approuvés</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.approved}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Rejetés</CardTitle>
            <XCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.rejected}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Construction</CardTitle>
            <Building2 className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.construction}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Régularisation</CardTitle>
            <AlertCircle className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.regularization}</div>
          </CardContent>
        </Card>
      </div>

      {/* Main Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Gestion des Demandes d'Autorisation</CardTitle>
              <CardDescription>
                Examinez et traitez les demandes d'autorisation de bâtir et de régularisation
              </CardDescription>
            </div>
            <Button variant="outline" onClick={handleExportCSV} className="gap-2">
              <Download className="h-4 w-4" />
              Exporter CSV
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex flex-col md:flex-row gap-4 mb-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Rechercher par parcelle ou nom..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
            <Select value={filterStatus} onValueChange={(value: '_all' | 'pending' | 'approved' | 'rejected' | 'returned') => setFilterStatus(value)}>
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder="Statut" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="_all">Tous les statuts</SelectItem>
                <SelectItem value="pending">En attente</SelectItem>
                <SelectItem value="approved">Approuvés</SelectItem>
                <SelectItem value="rejected">Rejetés</SelectItem>
                <SelectItem value="returned">Renvoyés</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterType} onValueChange={(value: '_all' | 'construction' | 'regularization') => setFilterType(value)}>
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="_all">Tous les types</SelectItem>
                <SelectItem value="construction">Construction</SelectItem>
                <SelectItem value="regularization">Régularisation</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Table */}
          {filteredPermits.length === 0 ? (
            <Alert>
              <AlertDescription>Aucune demande d'autorisation trouvée.</AlertDescription>
            </Alert>
          ) : (
            <div className="border rounded-lg overflow-x-auto">
              <ResponsiveTable>
                <ResponsiveTableHeader>
                  <ResponsiveTableRow>
                    <ResponsiveTableHead>Parcelle</ResponsiveTableHead>
                    <ResponsiveTableHead>Type</ResponsiveTableHead>
                    <ResponsiveTableHead priority="low">Demandeur</ResponsiveTableHead>
                    <ResponsiveTableHead priority="low">Date</ResponsiveTableHead>
                    <ResponsiveTableHead>Statut</ResponsiveTableHead>
                    <ResponsiveTableHead className="text-right">Actions</ResponsiveTableHead>
                  </ResponsiveTableRow>
                </ResponsiveTableHeader>
                <ResponsiveTableBody>
                  {paginatedPermits.map((permit) => {
                    const permitData = permit.permit_request_data;
                    const status = permitData?.status || 'pending';
                    
                    return (
                      <ResponsiveTableRow key={permit.id}>
                        <ResponsiveTableCell label="Parcelle" className="font-medium">{permit.parcel_number}</ResponsiveTableCell>
                        <ResponsiveTableCell label="Type">{getTypeBadge(permitData?.permitType)}</ResponsiveTableCell>
                        <ResponsiveTableCell label="Demandeur" priority="low">
                          <div>
                            <p className="font-medium">{permitData?.applicantName || 'N/A'}</p>
                            <p className="text-xs text-muted-foreground">{permitData?.applicantPhone}</p>
                          </div>
                        </ResponsiveTableCell>
                        <ResponsiveTableCell label="Date" priority="low">
                          {format(new Date(permit.created_at), 'dd MMM yyyy', { locale: fr })}
                        </ResponsiveTableCell>
                        <ResponsiveTableCell label="Statut">{getStatusBadge(status)}</ResponsiveTableCell>
                        <ResponsiveTableCell label="Actions" className="text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleViewPermit(permit)}
                          >
                            <FileText className="h-4 w-4 mr-2" />
                            Voir
                          </Button>
                        </ResponsiveTableCell>
                      </ResponsiveTableRow>
                    );
                  })}
                </ResponsiveTableBody>
              </ResponsiveTable>
              
              {/* Pagination */}
              <PaginationControls
                currentPage={currentPage}
                totalPages={totalPages}
                pageSize={pageSize}
                onPageSizeChange={changePageSize}
                onNextPage={goToNextPage}
                onPreviousPage={goToPreviousPage}
                onPageChange={goToPage}
                hasNextPage={hasNextPage}
                hasPreviousPage={hasPreviousPage}
                totalItems={totalItems}
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Permit Dialog */}
      {selectedPermit && (
        <PermitRequestDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          contributionId={selectedPermit.id}
          permitRequestData={selectedPermit.permit_request_data}
          parcelNumber={selectedPermit.parcel_number}
          userId={selectedPermit.user_id}
          onProcessed={() => {
            fetchPermits();
            setDialogOpen(false);
          }}
        />
      )}
    </div>
  );
};

export default AdminBuildingPermits;

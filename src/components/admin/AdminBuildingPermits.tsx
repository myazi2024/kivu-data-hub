import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Building2, FileText, CheckCircle, XCircle, Clock, AlertCircle, Filter } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { toast } from 'sonner';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { PermitRequestDialog } from './permits/PermitRequestDialog';

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
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [filterType, setFilterType] = useState<'all' | 'construction' | 'regularization'>('all');
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

  const filteredPermits = permits.filter((permit) => {
    const permitData = permit.permit_request_data;
    const matchesSearch = 
      permit.parcel_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      permitData?.applicantName?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const permitStatus = permitData?.status || 'pending';
    const matchesStatus = 
      filterStatus === 'all' ? true : permitStatus === filterStatus;
    
    const matchesType = 
      filterType === 'all' ? true : permitData?.permitType === filterType;
    
    return matchesSearch && matchesStatus && matchesType;
  });

  const stats = {
    total: permits.length,
    pending: permits.filter(p => !p.permit_request_data?.status || p.permit_request_data.status === 'pending').length,
    approved: permits.filter(p => p.permit_request_data?.status === 'approved').length,
    rejected: permits.filter(p => p.permit_request_data?.status === 'rejected').length,
    construction: permits.filter(p => p.permit_request_data?.permitType === 'construction').length,
    regularization: permits.filter(p => p.permit_request_data?.permitType === 'regularization').length,
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
      <Badge variant="outline" className="bg-blue-50">Permis de construire</Badge>
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
          <CardTitle>Gestion des Demandes de Permis</CardTitle>
          <CardDescription>
            Examinez et traitez les demandes de permis de construire et de régularisation
          </CardDescription>
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
            <Select value={filterStatus} onValueChange={(value: any) => setFilterStatus(value)}>
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder="Statut" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les statuts</SelectItem>
                <SelectItem value="pending">En attente</SelectItem>
                <SelectItem value="approved">Approuvés</SelectItem>
                <SelectItem value="rejected">Rejetés</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterType} onValueChange={(value: any) => setFilterType(value)}>
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les types</SelectItem>
                <SelectItem value="construction">Construction</SelectItem>
                <SelectItem value="regularization">Régularisation</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Table */}
          {filteredPermits.length === 0 ? (
            <Alert>
              <AlertDescription>Aucune demande de permis trouvée.</AlertDescription>
            </Alert>
          ) : (
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Parcelle</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Demandeur</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPermits.map((permit) => {
                    const permitData = permit.permit_request_data;
                    const status = permitData?.status || 'pending';
                    
                    return (
                      <TableRow key={permit.id}>
                        <TableCell className="font-medium">{permit.parcel_number}</TableCell>
                        <TableCell>{getTypeBadge(permitData?.permitType)}</TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{permitData?.applicantName || 'N/A'}</p>
                            <p className="text-xs text-muted-foreground">{permitData?.applicantPhone}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          {format(new Date(permit.created_at), 'dd MMM yyyy', { locale: fr })}
                        </TableCell>
                        <TableCell>{getStatusBadge(status)}</TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleViewPermit(permit)}
                          >
                            <FileText className="h-4 w-4 mr-2" />
                            Voir
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

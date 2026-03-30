import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { useTestEnvironment, applyTestFilter } from '@/hooks/useTestEnvironment';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { StatusBadge, StatusType } from '@/components/shared/StatusBadge';
import { LandTitleRequestSummary, getRequestLocation } from '@/types/landTitleRequest';
import { 
  ScrollText, 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  MapPin,
  Calendar,
  DollarSign,
  FileText,
  ChevronLeft,
  ChevronRight,
  Plus
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

export const UserLandTitleRequests: React.FC = () => {
  const { user } = useAuth();
  const { isTestRoute } = useTestEnvironment();
  const [requests, setRequests] = useState<LandTitleRequestSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<LandTitleRequestSummary | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    if (user) {
      fetchRequests();
    }
  }, [user]);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      let query = supabase
        .from('land_title_requests')
        .select('id, reference_number, status, payment_status, section_type, province, ville, commune, quartier, territoire, total_amount_usd, created_at, reviewed_at, rejection_reason, requester_first_name, requester_last_name, area_sqm, fee_items')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });
      query = applyTestFilter(query, 'reference_number', isTestRoute);
      const { data, error } = await query;

      if (error) throw error;
      setRequests(data || []);
    } catch (error: any) {
      toast.error('Erreur lors du chargement des demandes');
      console.error('Error fetching land title requests:', error);
    } finally {
      setLoading(false);
    }
  };

  const getPaymentBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return <Badge className="bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400">Payé</Badge>;
      case 'cancelled':
        return <Badge variant="outline">Annulé</Badge>;
      case 'pending':
      default:
        return <Badge variant="outline">Non payé</Badge>;
    }
  };

  const getSectionLabel = (type: string) => {
    return type === 'urbaine' ? 'Urbaine' : 'Rurale';
  };

  const stats = useMemo(() => ({
    total: requests.length,
    pending: requests.filter(r => r.status === 'pending').length,
    approved: requests.filter(r => r.status === 'approved').length,
    rejected: requests.filter(r => r.status === 'rejected').length,
  }), [requests]);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-4 gap-2">
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} className="h-20 rounded-2xl" />
          ))}
        </div>
        <Skeleton className="h-64 rounded-2xl" />
      </div>
    );
  }

  return (
    <>
      {/* Stats compactes */}
      <div className="grid grid-cols-4 gap-2 mb-4">
        {[
          { label: "Total", value: stats.total, color: "text-foreground" },
          { label: "Attente", value: stats.pending, color: "text-amber-600" },
          { label: "Approuvées", value: stats.approved, color: "text-green-600" },
          { label: "Rejetées", value: stats.rejected, color: "text-destructive" },
        ].map((stat) => (
          <div key={stat.label} className="bg-background rounded-2xl p-3 shadow-sm border text-center">
            <p className={`text-xl font-bold ${stat.color}`}>{stat.value}</p>
            <p className="text-[10px] text-muted-foreground">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Liste des demandes */}
      <div className="bg-background rounded-2xl shadow-sm border overflow-hidden">
        <div className="p-3 border-b flex items-center gap-2">
          <ScrollText className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold">Mes demandes de titres fonciers</h3>
        </div>
        
        <div className="p-3">
          {requests.length === 0 ? (
            <div className="text-center py-8">
              <div className="h-12 w-12 mx-auto rounded-2xl bg-muted/50 flex items-center justify-center mb-3">
                <ScrollText className="h-6 w-6 text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground">Aucune demande de titre foncier</p>
              <Link to="/carte-cadastrale">
                <Button size="sm" className="mt-3 gap-2 rounded-xl">
                  <Plus className="h-3.5 w-3.5" />
                  Faire une demande
                </Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-2">
              {requests
                .slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
                .map((request) => (
                <div 
                  key={request.id} 
                  className="flex items-center gap-3 p-2.5 bg-muted/30 rounded-xl hover:bg-muted/50 transition-colors cursor-pointer"
                  onClick={() => {
                    setSelectedRequest(request);
                    setIsDetailsOpen(true);
                  }}
                >
                  <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    <ScrollText className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium font-mono">{request.reference_number}</p>
                      <Badge variant="outline" className="text-[10px]">{getSectionLabel(request.section_type)}</Badge>
                    </div>
                    <p className="text-[10px] text-muted-foreground">
                      {[request.commune, request.ville, request.province].filter(Boolean).join(', ')}
                    </p>
                  </div>
                  <div className="text-right shrink-0 space-y-1">
                    <StatusBadge status={request.status as StatusType} compact />
                    <p className="text-[9px] text-muted-foreground">
                      {format(new Date(request.created_at), 'dd/MM/yyyy', { locale: fr })}
                    </p>
                  </div>
                </div>
              ))}
              
              {/* Pagination */}
              {requests.length > itemsPerPage && (
                <div className="flex items-center justify-between pt-3 border-t mt-3">
                  <p className="text-xs text-muted-foreground">
                    {(currentPage - 1) * itemsPerPage + 1}-{Math.min(currentPage * itemsPerPage, requests.length)} sur {requests.length}
                  </p>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="h-7 w-7 p-0"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="text-xs px-2">{currentPage}/{Math.ceil(requests.length / itemsPerPage)}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setCurrentPage(p => Math.min(Math.ceil(requests.length / itemsPerPage), p + 1))}
                      disabled={currentPage >= Math.ceil(requests.length / itemsPerPage)}
                      className="h-7 w-7 p-0"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Dialog des détails */}
      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ScrollText className="h-5 w-5 text-primary" />
              Détails de la demande
            </DialogTitle>
          </DialogHeader>
          {selectedRequest && (
            <div className="space-y-4">
              {/* Référence et statut */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Référence</p>
                  <p className="font-mono font-bold">{selectedRequest.reference_number}</p>
                </div>
                <div className="text-right space-y-1">
                  <StatusBadge status={selectedRequest.status as StatusType} />
                  {getPaymentBadge(selectedRequest.payment_status)}
                </div>
              </div>

              {/* Infos principales */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-muted/30 rounded-xl">
                  <div className="flex items-center gap-2 mb-1">
                    <MapPin className="h-3 w-3 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">Localisation</span>
                  </div>
                  <p className="text-sm font-medium">
                    {[selectedRequest.commune, selectedRequest.ville].filter(Boolean).join(', ') || 'Non spécifié'}
                  </p>
                  <p className="text-xs text-muted-foreground">{selectedRequest.province}</p>
                </div>

                <div className="p-3 bg-muted/30 rounded-xl">
                  <div className="flex items-center gap-2 mb-1">
                    <Calendar className="h-3 w-3 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">Date demande</span>
                  </div>
                  <p className="text-sm font-medium">
                    {format(new Date(selectedRequest.created_at), 'dd MMMM yyyy', { locale: fr })}
                  </p>
                </div>

                <div className="p-3 bg-muted/30 rounded-xl">
                  <div className="flex items-center gap-2 mb-1">
                    <DollarSign className="h-3 w-3 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">Montant total</span>
                  </div>
                  <p className="text-sm font-bold">{selectedRequest.total_amount_usd} USD</p>
                </div>

                <div className="p-3 bg-muted/30 rounded-xl">
                  <div className="flex items-center gap-2 mb-1">
                    <FileText className="h-3 w-3 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">Type</span>
                  </div>
                  <p className="text-sm font-medium">{getSectionLabel(selectedRequest.section_type)}</p>
                  {selectedRequest.area_sqm && (
                    <p className="text-xs text-muted-foreground">{selectedRequest.area_sqm} m²</p>
                  )}
                </div>
              </div>

              {/* Demandeur */}
              <div className="p-3 bg-muted/30 rounded-xl">
                <p className="text-xs text-muted-foreground mb-1">Demandeur</p>
                <p className="font-medium">
                  {selectedRequest.requester_first_name} {selectedRequest.requester_last_name}
                </p>
              </div>

              {/* Raison de rejet */}
              {selectedRequest.status === 'rejected' && selectedRequest.rejection_reason && (
                <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <XCircle className="h-4 w-4 text-destructive" />
                    <p className="text-sm font-medium text-destructive">Raison du rejet</p>
                  </div>
                  <p className="text-sm">{selectedRequest.rejection_reason}</p>
                </div>
              )}

              {/* Frais détaillés */}
              {selectedRequest.fee_items && Array.isArray(selectedRequest.fee_items) && selectedRequest.fee_items.length > 0 && (
                <div>
                  <p className="text-sm font-medium mb-2">Détail des frais</p>
                  <div className="space-y-1">
                    {selectedRequest.fee_items.map((fee: any, idx: number) => (
                      <div key={idx} className="flex items-center justify-between text-sm p-2 bg-muted/30 rounded-lg">
                        <span>{fee.name || fee.fee_name}</span>
                        <span className="font-medium">{fee.amount || fee.amount_usd} USD</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <Button 
                onClick={() => setIsDetailsOpen(false)} 
                className="w-full"
              >
                Fermer
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

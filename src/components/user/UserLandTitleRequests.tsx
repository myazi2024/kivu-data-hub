import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { 
  ScrollText, 
  Eye, 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  MapPin,
  Calendar,
  DollarSign,
  FileText
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface LandTitleRequest {
  id: string;
  reference_number: string;
  status: string;
  payment_status: string;
  section_type: string;
  province: string;
  ville: string | null;
  commune: string | null;
  quartier: string | null;
  territoire: string | null;
  total_amount_usd: number;
  created_at: string;
  reviewed_at: string | null;
  rejection_reason: string | null;
  requester_first_name: string;
  requester_last_name: string;
  area_sqm: number | null;
  fee_items: any;
}

export const UserLandTitleRequests: React.FC = () => {
  const { user } = useAuth();
  const [requests, setRequests] = useState<LandTitleRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<LandTitleRequest | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  useEffect(() => {
    if (user) {
      fetchRequests();
    }
  }, [user]);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('land_title_requests')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRequests(data || []);
    } catch (error: any) {
      toast.error('Erreur lors du chargement des demandes');
      console.error('Error fetching land title requests:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge className="bg-green-500 flex items-center gap-1">
          <CheckCircle className="h-3 w-3" />
          Approuvée
        </Badge>;
      case 'rejected':
        return <Badge variant="destructive" className="flex items-center gap-1">
          <XCircle className="h-3 w-3" />
          Rejetée
        </Badge>;
      case 'in_progress':
        return <Badge className="bg-blue-500 flex items-center gap-1">
          <AlertCircle className="h-3 w-3" />
          En cours
        </Badge>;
      case 'pending':
      default:
        return <Badge variant="secondary" className="flex items-center gap-1">
          <Clock className="h-3 w-3" />
          En attente
        </Badge>;
    }
  };

  const getPaymentBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return <Badge className="bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400">Payé</Badge>;
      case 'pending':
      default:
        return <Badge variant="outline">Non payé</Badge>;
    }
  };

  const getSectionLabel = (type: string) => {
    return type === 'urban' ? 'Urbaine' : 'Rurale';
  };

  const getStats = () => {
    return {
      total: requests.length,
      pending: requests.filter(r => r.status === 'pending').length,
      approved: requests.filter(r => r.status === 'approved').length,
      rejected: requests.filter(r => r.status === 'rejected').length,
    };
  };

  const stats = getStats();

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
              <p className="text-xs text-muted-foreground mt-1">
                Vous pouvez faire une demande depuis la page cadastrale
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {requests.map((request) => (
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
                    {getStatusBadge(request.status)}
                    <p className="text-[9px] text-muted-foreground">
                      {format(new Date(request.created_at), 'dd/MM/yyyy', { locale: fr })}
                    </p>
                  </div>
                </div>
              ))}
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
                  {getStatusBadge(selectedRequest.status)}
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
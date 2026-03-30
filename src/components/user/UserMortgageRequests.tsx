import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Landmark, Loader2, Clock, CheckCircle2, XCircle, AlertTriangle, FileX2, MapPin, DollarSign
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useTestEnvironment, applyTestFilter } from '@/hooks/useTestEnvironment';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface MortgageContribution {
  id: string;
  parcel_number: string;
  contribution_type: string;
  status: string;
  mortgage_history: any;
  change_justification: string | null;
  rejection_reason: string | null;
  created_at: string;
  updated_at: string;
}

const STATUS_CONFIG: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; icon: React.ReactNode }> = {
  pending: { label: 'En attente', variant: 'outline', icon: <Clock className="h-3 w-3" /> },
  in_review: { label: 'En cours d\'examen', variant: 'secondary', icon: <Loader2 className="h-3 w-3 animate-spin" /> },
  approved: { label: 'Approuvée', variant: 'default', icon: <CheckCircle2 className="h-3 w-3" /> },
  rejected: { label: 'Rejetée', variant: 'destructive', icon: <XCircle className="h-3 w-3" /> },
  on_hold: { label: 'En suspens', variant: 'outline', icon: <AlertTriangle className="h-3 w-3" /> },
};

// Fix #11: User dashboard component for mortgage requests
export const UserMortgageRequests: React.FC = () => {
  const { user } = useAuth();
  const { isTestRoute } = useTestEnvironment();
  const [requests, setRequests] = useState<MortgageContribution[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRequests = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      let query = supabase
        .from('cadastral_contributions')
        .select('id, parcel_number, contribution_type, status, mortgage_history, change_justification, rejection_reason, created_at, updated_at')
        .eq('user_id', user.id)
        .in('contribution_type', ['mortgage_registration', 'mortgage_cancellation'])
        .order('created_at', { ascending: false });
      query = applyTestFilter(query, 'parcel_number', isTestRoute);
      const { data, error } = await query;

      if (error) throw error;
      setRequests((data || []) as MortgageContribution[]);
    } catch (error) {
      console.error('Error fetching mortgage requests:', error);
      toast.error('Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (requests.length === 0) {
    return (
      <Card className="rounded-xl">
        <CardContent className="p-6 text-center">
          <Landmark className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <h3 className="font-semibold text-sm">Aucune demande d'hypothèque</h3>
          <p className="text-xs text-muted-foreground mt-1">
            Vos demandes d'enregistrement et de radiation d'hypothèque apparaîtront ici.
          </p>
        </CardContent>
      </Card>
    );
  }

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'mortgage_registration': return 'Enregistrement';
      case 'mortgage_cancellation': return 'Radiation';
      default: return type;
    }
  };

  const getTypeIcon = (type: string) => {
    return type === 'mortgage_cancellation'
      ? <FileX2 className="h-4 w-4 text-destructive" />
      : <Landmark className="h-4 w-4 text-amber-600" />;
  };

  const getMortgageDetails = (request: MortgageContribution) => {
    const history = request.mortgage_history;
    if (!Array.isArray(history) || history.length === 0) return null;
    return history[0];
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <Landmark className="h-4 w-4 text-primary" />
          Mes demandes d'hypothèque ({requests.length})
        </h3>
      </div>

      {requests.map((request) => {
        const statusConfig = STATUS_CONFIG[request.status] || STATUS_CONFIG.pending;
        const details = getMortgageDetails(request);

        return (
          <Card key={request.id} className="rounded-xl overflow-hidden">
            <CardContent className="p-4 space-y-3">
              {/* Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {getTypeIcon(request.contribution_type)}
                  <span className="text-sm font-semibold">{getTypeLabel(request.contribution_type)}</span>
                </div>
                <Badge variant={statusConfig.variant} className="text-[10px] flex items-center gap-1">
                  {statusConfig.icon}
                  {statusConfig.label}
                </Badge>
              </div>

              {/* Details */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="flex items-center gap-1.5">
                  <MapPin className="h-3 w-3 text-muted-foreground" />
                  <span className="text-muted-foreground">Parcelle:</span>
                  <span className="font-mono font-medium">{request.parcel_number}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Clock className="h-3 w-3 text-muted-foreground" />
                  <span className="text-muted-foreground">
                    {format(new Date(request.created_at), 'dd MMM yyyy', { locale: fr })}
                  </span>
                </div>
              </div>

              {/* Mortgage-specific details */}
              {details && (
                <div className="text-xs space-y-1 bg-muted/30 rounded-lg p-2">
                  {details.creditor_name && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Créancier:</span>
                      <span className="font-medium">{details.creditor_name}</span>
                    </div>
                  )}
                  {details.mortgage_amount_usd && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Montant:</span>
                      <span className="font-medium flex items-center gap-1">
                        <DollarSign className="h-3 w-3" />
                        {Number(details.mortgage_amount_usd).toLocaleString()} USD
                      </span>
                    </div>
                  )}
                  {details.request_reference_number && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Réf. demande:</span>
                      <span className="font-mono font-medium">{details.request_reference_number}</span>
                    </div>
                  )}
                  {details.total_amount_paid && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Frais payés:</span>
                      <span className="font-medium text-green-600">${details.total_amount_paid}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Rejection reason */}
              {request.status === 'rejected' && request.rejection_reason && (
                <Alert className="bg-destructive/5 border-destructive/20 rounded-xl">
                  <XCircle className="h-4 w-4 text-destructive" />
                  <AlertDescription className="text-xs text-destructive">
                    {request.rejection_reason}
                  </AlertDescription>
                </Alert>
              )}

              {/* Justification */}
              {request.change_justification && request.status === 'on_hold' && (
                <Alert className="bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800 rounded-xl">
                  <AlertTriangle className="h-4 w-4 text-amber-600" />
                  <AlertDescription className="text-xs text-amber-700 dark:text-amber-300">
                    {request.change_justification}
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};

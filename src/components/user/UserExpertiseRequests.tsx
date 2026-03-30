import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  FileSearch, Loader2, ExternalLink, Clock, CheckCircle2,
  XCircle, AlertTriangle, RefreshCw, DollarSign
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useTestEnvironment, applyTestFilter } from '@/hooks/useTestEnvironment';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import type { ExpertiseRequest } from '@/types/expertise';
import { STATUS_LABELS } from '@/constants/expertiseLabels';

const STATUS_CONFIG: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; icon: React.ReactNode }> = {
  pending: { label: STATUS_LABELS.pending, variant: 'secondary', icon: <Clock className="h-3 w-3" /> },
  assigned: { label: STATUS_LABELS.assigned, variant: 'outline', icon: <Clock className="h-3 w-3" /> },
  in_progress: { label: STATUS_LABELS.in_progress, variant: 'default', icon: <Loader2 className="h-3 w-3 animate-spin" /> },
  completed: { label: STATUS_LABELS.completed, variant: 'default', icon: <CheckCircle2 className="h-3 w-3" /> },
  rejected: { label: STATUS_LABELS.rejected, variant: 'destructive', icon: <XCircle className="h-3 w-3" /> },
};

export const UserExpertiseRequests: React.FC = () => {
  const { user } = useAuth();
  const [requests, setRequests] = useState<ExpertiseRequest[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRequests = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('real_estate_expertise_requests')
        .select('id, reference_number, parcel_number, status, payment_status, market_value_usd, certificate_url, certificate_issue_date, certificate_expiry_date, rejection_reason, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRequests((data || []) as ExpertiseRequest[]);
    } catch (error) {
      console.error('Error fetching expertise requests:', error);
      toast.error('Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const getCertificateValidity = (issueDate?: string, expiryDate?: string) => {
    if (!issueDate) return null;
    let expiry: Date;
    if (expiryDate) {
      expiry = new Date(expiryDate);
    } else {
      expiry = new Date(issueDate);
      expiry.setMonth(expiry.getMonth() + 6);
    }
    const days = Math.ceil((expiry.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    return { isValid: days > 0, daysRemaining: Math.max(0, days) };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (requests.length === 0) {
    return (
      <div className="text-center py-12 space-y-3">
        <FileSearch className="h-12 w-12 mx-auto text-muted-foreground/50" />
        <p className="text-sm text-muted-foreground">Aucune demande d'expertise</p>
        <p className="text-xs text-muted-foreground">
          Recherchez une parcelle sur la carte cadastrale et demandez une expertise immobilière.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <FileSearch className="h-4 w-4 text-primary" />
          Mes expertises ({requests.length})
        </h3>
        <Button variant="ghost" size="sm" onClick={fetchRequests} className="h-8 text-xs">
          <RefreshCw className="h-3.5 w-3.5 mr-1" />
          Actualiser
        </Button>
      </div>

      <ScrollArea className="max-h-[60vh]">
        <div className="space-y-3 pr-2">
          {requests.map((req) => {
            const statusCfg = STATUS_CONFIG[req.status] || STATUS_CONFIG.pending;
            const validity = getCertificateValidity(req.certificate_issue_date, req.certificate_expiry_date);

            return (
              <Card key={req.id} className="rounded-xl border shadow-sm">
                <CardContent className="p-3 space-y-2">
                  {/* Header */}
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-primary">{req.reference_number}</span>
                    <Badge variant={statusCfg.variant} className="text-[10px] gap-1">
                      {statusCfg.icon}
                      {statusCfg.label}
                    </Badge>
                  </div>

                  {/* Parcel & date */}
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Parcelle: <strong className="text-foreground">{req.parcel_number}</strong></span>
                    <span>{new Date(req.created_at).toLocaleDateString('fr-FR')}</span>
                  </div>

                  {/* Market value */}
                  {req.market_value_usd && (
                    <div className="flex items-center gap-1.5 text-xs">
                      <DollarSign className="h-3.5 w-3.5 text-primary" />
                      <span className="text-muted-foreground">Valeur vénale:</span>
                      <span className="font-bold">${req.market_value_usd.toLocaleString()}</span>
                    </div>
                  )}

                  {/* Certificate validity */}
                  {validity && req.status === 'completed' && (
                    <div className={`flex items-center gap-1.5 text-xs ${validity.isValid ? 'text-green-600' : 'text-amber-600'}`}>
                      {validity.isValid ? (
                        <CheckCircle2 className="h-3.5 w-3.5" />
                      ) : (
                        <AlertTriangle className="h-3.5 w-3.5" />
                      )}
                      <span>
                        {validity.isValid
                          ? `Certificat valide (${validity.daysRemaining}j restants)`
                          : 'Certificat expiré'}
                      </span>
                    </div>
                  )}

                  {/* Rejection reason */}
                  {req.status === 'rejected' && req.rejection_reason && (
                    <Alert className="rounded-lg border-destructive/30 bg-destructive/5 py-2 px-3">
                      <AlertDescription className="text-[11px] text-destructive">
                        {req.rejection_reason}
                      </AlertDescription>
                    </Alert>
                  )}

                  {/* Certificate link */}
                  {req.certificate_url && req.status === 'completed' && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(req.certificate_url!, '_blank', 'noopener,noreferrer')}
                      className="w-full h-8 text-xs rounded-xl gap-1"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      Voir le certificat
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
};

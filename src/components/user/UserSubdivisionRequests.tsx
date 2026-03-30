import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useTestEnvironment, applyTestFilter } from '@/hooks/useTestEnvironment';
import { Loader2, LayoutGrid, MapPin, Calendar, Hash } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface SubdivisionRequest {
  id: string;
  reference_number: string;
  parcel_number: string;
  number_of_lots: number;
  purpose_of_subdivision: string | null;
  status: string;
  created_at: string;
  reviewed_at: string | null;
}

const statusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  pending: { label: 'En attente', variant: 'secondary' },
  approved: { label: 'Approuvé', variant: 'default' },
  rejected: { label: 'Rejeté', variant: 'destructive' },
  returned: { label: 'Renvoyé', variant: 'outline' },
};

export const UserSubdivisionRequests: React.FC = () => {
  const { user } = useAuth();
  const [requests, setRequests] = useState<SubdivisionRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const fetchRequests = async () => {
      try {
        const { data, error } = await (supabase as any)
          .from('subdivision_requests')
          .select('id, reference_number, parcel_number, number_of_lots, purpose_of_subdivision, status, created_at, reviewed_at')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (error) throw error;
        setRequests(data || []);
      } catch (error) {
        console.error('Error fetching subdivision requests:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchRequests();
  }, [user]);

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (requests.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <LayoutGrid className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
          <h3 className="text-sm font-medium mb-1">Aucune demande de lotissement</h3>
          <p className="text-xs text-muted-foreground">
            Vos demandes de lotissement apparaîtront ici.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">{requests.length} demande{requests.length > 1 ? 's' : ''}</h3>
      </div>

      {requests.map((req) => {
        const status = statusConfig[req.status] || { label: req.status, variant: 'outline' as const };
        return (
          <Card key={req.id} className="overflow-hidden">
            <CardContent className="p-3">
              <div className="flex items-start justify-between mb-2">
                <div className="space-y-0.5">
                  <p className="text-xs font-semibold font-mono">{req.reference_number}</p>
                  <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                    <MapPin className="h-3 w-3" />
                    <span>Parcelle {req.parcel_number}</span>
                  </div>
                </div>
                <Badge variant={status.variant} className="text-[10px]">
                  {status.label}
                </Badge>
              </div>

              <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Hash className="h-3 w-3" />
                  <span>{req.number_of_lots} lot{req.number_of_lots > 1 ? 's' : ''}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  <span>{format(new Date(req.created_at), 'dd MMM yyyy', { locale: fr })}</span>
                </div>
              </div>

              {req.purpose_of_subdivision && (
                <p className="mt-2 text-[11px] text-muted-foreground bg-muted/30 rounded-lg p-2">
                  {req.purpose_of_subdivision}
                </p>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};

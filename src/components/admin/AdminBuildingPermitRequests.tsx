import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Building2, Calendar, User, MapPin, Phone, Mail } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';

interface PermitRequest {
  id: string;
  created_at: string;
  user_id: string;
  new_values: any;
}

export const AdminBuildingPermitRequests = () => {
  const [requests, setRequests] = useState<PermitRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    try {
      const { data, error } = await supabase
        .from('audit_logs')
        .select('*')
        .eq('action', 'building_permit_request_submitted')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRequests(data || []);
    } catch (error) {
      console.error('Erreur chargement demandes:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center text-muted-foreground">Chargement...</div>
        </CardContent>
      </Card>
    );
  }

  if (requests.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center text-muted-foreground">
            Aucune demande de permis pour le moment
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Demandes de permis de construire</h2>
        <Badge variant="secondary">{requests.length} demande(s)</Badge>
      </div>

      <ScrollArea className="h-[calc(100vh-220px)]">
        <div className="space-y-4 pr-4">
          {requests.map((request) => {
            const data = request.new_values;
            const isNew = data.requestType === 'new';

            return (
              <Card key={request.id} className="overflow-hidden">
                <CardHeader className="bg-muted/50 pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <Building2 className="h-5 w-5 text-primary" />
                      <div>
                        <CardTitle className="text-lg">
                          Parcelle {data.parcelNumber}
                        </CardTitle>
                        <p className="text-sm text-muted-foreground mt-1">
                          {new Date(request.created_at).toLocaleDateString('fr-FR', {
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </p>
                      </div>
                    </div>
                    <Badge variant={isNew ? 'default' : 'secondary'}>
                      {isNew ? 'Nouveau permis' : 'Régularisation'}
                    </Badge>
                  </div>
                </CardHeader>

                <CardContent className="pt-4 space-y-4">
                  {/* Informations construction */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Type</p>
                      <p className="text-sm font-medium">{data.constructionType}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Nature</p>
                      <p className="text-sm font-medium">{data.constructionNature}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Usage</p>
                      <p className="text-sm font-medium">{data.declaredUsage}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Surface</p>
                      <p className="text-sm font-medium">{data.plannedArea} m²</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Étages</p>
                      <p className="text-sm font-medium">{data.numberOfFloors}</p>
                    </div>
                    {data.estimatedCost && (
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground">Coût estimé</p>
                        <p className="text-sm font-medium">{data.estimatedCost} USD</p>
                      </div>
                    )}
                  </div>

                  <Separator />

                  {/* Description */}
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Description du projet</p>
                    <p className="text-sm">{data.projectDescription}</p>
                  </div>

                  {/* Dates */}
                  {isNew ? (
                    <div className="flex items-center gap-4 text-sm">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span className="text-muted-foreground">Début:</span>
                        <span className="font-medium">
                          {data.startDate ? new Date(data.startDate).toLocaleDateString('fr-FR') : 'Non spécifié'}
                        </span>
                      </div>
                      {data.estimatedDuration && (
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground">Durée:</span>
                          <span className="font-medium">{data.estimatedDuration} mois</span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span className="text-muted-foreground">Construction:</span>
                        <span className="font-medium">
                          {data.constructionDate ? new Date(data.constructionDate).toLocaleDateString('fr-FR') : 'Non spécifié'}
                        </span>
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground">État actuel</p>
                        <p className="text-sm font-medium">{data.currentState}</p>
                      </div>
                      {data.complianceIssues && (
                        <div className="space-y-1">
                          <p className="text-xs text-muted-foreground">Problèmes de conformité</p>
                          <p className="text-sm">{data.complianceIssues}</p>
                        </div>
                      )}
                    </div>
                  )}

                  <Separator />

                  {/* Informations demandeur */}
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Demandeur</p>
                    <div className="grid gap-2">
                      <div className="flex items-center gap-2 text-sm">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span>{data.applicantName}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        <span>{data.applicantPhone}</span>
                      </div>
                      {data.applicantEmail && (
                        <div className="flex items-center gap-2 text-sm">
                          <Mail className="h-4 w-4 text-muted-foreground" />
                          <span>{data.applicantEmail}</span>
                        </div>
                      )}
                      {data.applicantAddress && (
                        <div className="flex items-center gap-2 text-sm">
                          <MapPin className="h-4 w-4 text-muted-foreground" />
                          <span>{data.applicantAddress}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {data.paymentId && (
                    <div className="pt-2">
                      <Badge variant="outline" className="text-xs">
                        Paiement: {data.paymentId}
                      </Badge>
                    </div>
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

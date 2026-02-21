import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { Scale, Search, Eye, Clock, CheckCircle, AlertTriangle, FileText, ChevronLeft, ChevronRight, User, Calendar, MapPin } from 'lucide-react';

interface LandDispute {
  id: string;
  parcel_number: string;
  reference_number: string;
  dispute_type: string;
  dispute_nature: string;
  dispute_description: string | null;
  current_status: string;
  resolution_level: string | null;
  declarant_name: string;
  declarant_quality: string;
  dispute_start_date: string | null;
  lifting_status: string | null;
  lifting_reason: string | null;
  created_at: string;
  updated_at: string;
}

const DISPUTE_NATURES_MAP: Record<string, string> = {
  succession: 'Litige successoral',
  delimitation: 'Conflit de délimitation',
  construction_anarchique: 'Construction anarchique',
  expropriation: 'Expropriation',
  double_vente: 'Double vente',
  occupation_illegale: 'Occupation illégale',
  contestation_titre: 'Contestation de titre',
  servitude: 'Litige de servitude',
  autre: 'Autre',
};

const STATUS_MAP: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; icon: React.ReactNode }> = {
  en_cours: { label: 'En cours', variant: 'secondary', icon: <Clock className="h-3 w-3" /> },
  resolu: { label: 'Résolu', variant: 'default', icon: <CheckCircle className="h-3 w-3" /> },
  non_entame: { label: 'Non entamé', variant: 'outline', icon: <AlertTriangle className="h-3 w-3" /> },
  familial: { label: 'Niveau familial', variant: 'secondary', icon: <User className="h-3 w-3" /> },
  conciliation_amiable: { label: 'Conciliation', variant: 'secondary', icon: <Scale className="h-3 w-3" /> },
  autorite_locale: { label: 'Autorité locale', variant: 'secondary', icon: <Scale className="h-3 w-3" /> },
  arbitrage: { label: 'Arbitrage', variant: 'outline', icon: <Scale className="h-3 w-3" /> },
  tribunal: { label: 'Tribunal', variant: 'destructive', icon: <Scale className="h-3 w-3" /> },
  appel: { label: 'En appel', variant: 'destructive', icon: <Scale className="h-3 w-3" /> },
};

export const UserLandDisputes: React.FC = () => {
  const { user } = useAuth();
  const [disputes, setDisputes] = useState<LandDispute[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDispute, setSelectedDispute] = useState<LandDispute | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    if (user) fetchDisputes();
  }, [user]);

  const fetchDisputes = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('cadastral_land_disputes' as any)
        .select('*')
        .eq('reported_by', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDisputes((data as any[]) || []);
    } catch (error: any) {
      toast.error('Erreur lors du chargement des litiges');
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredDisputes = React.useMemo(() => {
    if (!searchQuery.trim()) return disputes;
    const q = searchQuery.toLowerCase();
    return disputes.filter(d =>
      d.parcel_number.toLowerCase().includes(q) ||
      d.reference_number.toLowerCase().includes(q) ||
      d.declarant_name.toLowerCase().includes(q)
    );
  }, [disputes, searchQuery]);

  const totalPages = Math.ceil(filteredDisputes.length / itemsPerPage);
  const paginatedDisputes = filteredDisputes.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const getStatusBadge = (status: string) => {
    const s = STATUS_MAP[status] || { label: status, variant: 'secondary' as const, icon: <Clock className="h-3 w-3" /> };
    return <Badge variant={s.variant} className="flex items-center gap-1 text-[10px]">{s.icon}{s.label}</Badge>;
  };

  const stats = {
    total: disputes.length,
    reports: disputes.filter(d => d.dispute_type === 'report').length,
    liftings: disputes.filter(d => d.dispute_type === 'lifting').length,
  };

  if (loading) {
    return (
      <Card><CardContent className="p-8">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </CardContent></Card>
    );
  }

  return (
    <>
      {/* Stats */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        {[
          { label: "Total", value: stats.total, color: "text-foreground" },
          { label: "Signalements", value: stats.reports, color: "text-orange-600" },
          { label: "Levées", value: stats.liftings, color: "text-green-600" },
        ].map((stat) => (
          <div key={stat.label} className="bg-background rounded-2xl p-3 shadow-sm border text-center">
            <p className={`text-xl font-bold ${stat.color}`}>{stat.value}</p>
            <p className="text-[10px] text-muted-foreground">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* List */}
      <div className="bg-background rounded-2xl shadow-sm border overflow-hidden">
        <div className="p-3 border-b flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Scale className="h-4 w-4 text-orange-600" />
            <h3 className="text-sm font-semibold">Mes litiges fonciers</h3>
          </div>
        </div>

        {disputes.length > 0 && (
          <div className="px-3 pt-3">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Rechercher par parcelle, référence..."
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                className="h-8 pl-8 text-xs rounded-xl"
              />
            </div>
          </div>
        )}

        <div className="p-3">
          {filteredDisputes.length === 0 ? (
            <div className="text-center py-8">
              <Scale className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">Aucun litige foncier enregistré</p>
              <p className="text-xs text-muted-foreground mt-1">Vos signalements et demandes de levée apparaîtront ici</p>
            </div>
          ) : (
            <div className="space-y-2">
              {paginatedDisputes.map((dispute) => (
                <div
                  key={dispute.id}
                  className="flex items-center justify-between p-3 border rounded-xl hover:bg-muted/50 cursor-pointer transition-colors"
                  onClick={() => { setSelectedDispute(dispute); setIsDetailsOpen(true); }}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-mono text-xs font-bold">{dispute.parcel_number}</span>
                      <Badge variant={dispute.dispute_type === 'report' ? 'destructive' : 'default'} className="text-[10px]">
                        {dispute.dispute_type === 'report' ? 'Signalement' : 'Levée'}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] text-muted-foreground">{DISPUTE_NATURES_MAP[dispute.dispute_nature] || dispute.dispute_nature}</span>
                      {getStatusBadge(dispute.current_status)}
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-1">
                      {new Date(dispute.created_at).toLocaleDateString('fr-FR')}
                    </p>
                  </div>
                  <Eye className="h-4 w-4 text-muted-foreground shrink-0" />
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-3 pt-3 border-t">
              <Button variant="outline" size="sm" disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)} className="h-7 text-xs rounded-lg">
                <ChevronLeft className="h-3 w-3" />
              </Button>
              <span className="text-xs text-muted-foreground">{currentPage}/{totalPages}</span>
              <Button variant="outline" size="sm" disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)} className="h-7 text-xs rounded-lg">
                <ChevronRight className="h-3 w-3" />
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Detail Dialog */}
      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="max-w-[400px] w-[calc(100vw-2rem)] rounded-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base flex items-center gap-2">
              <Scale className="h-5 w-5 text-orange-600" />
              Détails du litige
            </DialogTitle>
          </DialogHeader>
          {selectedDispute && (
            <div className="space-y-3">
              <Card className="rounded-xl shadow-sm">
                <CardContent className="p-3 space-y-2">
                  <div className="flex items-center gap-2 text-sm font-semibold text-primary"><FileText className="h-4 w-4" /> Informations</div>
                  <div className="space-y-1.5 text-sm">
                    <div className="flex justify-between"><span className="text-muted-foreground">Référence :</span><span className="font-mono font-bold">{selectedDispute.reference_number}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Parcelle :</span><span className="font-mono">{selectedDispute.parcel_number}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Type :</span>
                      <Badge variant={selectedDispute.dispute_type === 'report' ? 'destructive' : 'default'} className="text-[10px]">
                        {selectedDispute.dispute_type === 'report' ? 'Signalement' : 'Levée'}
                      </Badge>
                    </div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Nature :</span><span>{DISPUTE_NATURES_MAP[selectedDispute.dispute_nature] || selectedDispute.dispute_nature}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Statut :</span>{getStatusBadge(selectedDispute.current_status)}</div>
                    {selectedDispute.dispute_start_date && (
                      <div className="flex justify-between"><span className="text-muted-foreground">Début :</span><span>{new Date(selectedDispute.dispute_start_date).toLocaleDateString('fr-FR')}</span></div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {selectedDispute.dispute_description && (
                <Card className="rounded-xl shadow-sm">
                  <CardContent className="p-3 space-y-2">
                    <div className="text-sm font-semibold text-primary">Description</div>
                    <p className="text-sm text-muted-foreground">{selectedDispute.dispute_description}</p>
                  </CardContent>
                </Card>
              )}

              <Card className="rounded-xl shadow-sm">
                <CardContent className="p-3 space-y-2">
                  <div className="flex items-center gap-2 text-sm font-semibold text-primary"><User className="h-4 w-4" /> Déclarant</div>
                  <div className="space-y-1.5 text-sm">
                    <div className="flex justify-between"><span className="text-muted-foreground">Nom :</span><span>{selectedDispute.declarant_name}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Qualité :</span><span className="capitalize">{selectedDispute.declarant_quality}</span></div>
                  </div>
                </CardContent>
              </Card>

              <div className="text-[10px] text-muted-foreground text-center">
                Créé le {new Date(selectedDispute.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

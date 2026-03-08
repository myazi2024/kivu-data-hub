import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Scale, Search, Eye, FileText, ChevronLeft, ChevronRight, User, Copy, RefreshCw } from 'lucide-react';
import {
  LandDispute,
  DISPUTE_NATURES_MAP,
  DISPUTE_STATUS_CONFIG,
  LIFTING_REASONS_MAP,
  DECLARANT_QUALITIES_MAP,
  PARTY_ROLES_MAP,
} from '@/utils/disputeSharedTypes';
import DisputeDocumentLinks from '@/components/cadastral/DisputeDocumentLinks';
import DisputeStatusBadge from '@/components/cadastral/DisputeStatusBadge';

export const UserLandDisputes: React.FC = () => {
  const { user } = useAuth();
  const [disputes, setDisputes] = useState<LandDispute[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [selectedDispute, setSelectedDispute] = useState<LandDispute | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    if (user) {
      fetchDisputes();

      // Realtime subscription for user's own disputes
      const channel = supabase
        .channel('user-land-disputes')
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'cadastral_land_disputes',
          filter: `reported_by=eq.${user.id}`,
        }, () => {
          fetchDisputes();
        })
        .subscribe();

      return () => { supabase.removeChannel(channel); };
    }
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
    let result = disputes;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(d =>
        d.parcel_number.toLowerCase().includes(q) ||
        d.reference_number.toLowerCase().includes(q) ||
        d.declarant_name.toLowerCase().includes(q)
      );
    }
    if (statusFilter !== 'all') {
      result = result.filter(d => d.current_status === statusFilter);
    }
    if (typeFilter !== 'all') {
      result = result.filter(d => d.dispute_type === typeFilter);
    }
    return result;
  }, [disputes, searchQuery, statusFilter, typeFilter]);

  const totalPages = Math.ceil(filteredDisputes.length / itemsPerPage);
  const paginatedDisputes = filteredDisputes.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const copyReference = (ref: string) => {
    navigator.clipboard.writeText(ref);
    toast.success('Référence copiée');
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
          <Button variant="ghost" size="sm" onClick={fetchDisputes} className="h-7 w-7 p-0">
            <RefreshCw className="h-3.5 w-3.5" />
          </Button>
        </div>

        {disputes.length > 0 && (
          <div className="px-3 pt-3 space-y-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Rechercher par parcelle, référence..."
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                className="h-8 pl-8 text-xs rounded-xl"
              />
            </div>
            <div className="flex gap-2">
              <Select value={typeFilter} onValueChange={(v) => { setTypeFilter(v); setCurrentPage(1); }}>
                <SelectTrigger className="h-7 text-[10px] rounded-lg flex-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous types</SelectItem>
                  <SelectItem value="report">Signalements</SelectItem>
                  <SelectItem value="lifting">Levées</SelectItem>
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setCurrentPage(1); }}>
                <SelectTrigger className="h-7 text-[10px] rounded-lg flex-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous statuts</SelectItem>
                  {Object.entries(DISPUTE_STATUS_CONFIG).map(([key, cfg]) => (
                    <SelectItem key={key} value={key}>{cfg.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
                      <DisputeStatusBadge status={dispute.current_status} />
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
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Référence :</span>
                      <button onClick={() => copyReference(selectedDispute.reference_number)} className="flex items-center gap-1 font-mono font-bold hover:text-primary transition-colors">
                        {selectedDispute.reference_number} <Copy className="h-3 w-3" />
                      </button>
                    </div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Parcelle :</span><span className="font-mono">{selectedDispute.parcel_number}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Type :</span>
                      <Badge variant={selectedDispute.dispute_type === 'report' ? 'destructive' : 'default'} className="text-[10px]">
                        {selectedDispute.dispute_type === 'report' ? 'Signalement' : 'Levée'}
                      </Badge>
                    </div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Nature :</span><span>{DISPUTE_NATURES_MAP[selectedDispute.dispute_nature] || selectedDispute.dispute_nature}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Statut :</span><DisputeStatusBadge status={selectedDispute.current_status} /></div>
                    {selectedDispute.dispute_start_date && (
                      <div className="flex justify-between"><span className="text-muted-foreground">Début :</span><span>{new Date(selectedDispute.dispute_start_date).toLocaleDateString('fr-FR')}</span></div>
                    )}
                    {selectedDispute.resolution_level && (
                      <div className="flex justify-between"><span className="text-muted-foreground">Niveau :</span><span className="capitalize">{selectedDispute.resolution_level.replace(/_/g, ' ')}</span></div>
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

              {/* Lifting info */}
              {selectedDispute.dispute_type === 'lifting' && (selectedDispute.lifting_reason || selectedDispute.lifting_request_reference) && (
                <Card className="rounded-xl shadow-sm">
                  <CardContent className="p-3 space-y-2">
                    <div className="text-sm font-semibold text-primary">Demande de levée</div>
                    <div className="space-y-1.5 text-sm">
                      {selectedDispute.lifting_request_reference && (
                        <div className="flex justify-between"><span className="text-muted-foreground">Réf. litige :</span><span className="font-mono">{selectedDispute.lifting_request_reference}</span></div>
                      )}
                      {selectedDispute.lifting_reason && (
                        <div className="flex justify-between"><span className="text-muted-foreground">Motif :</span><span>{LIFTING_REASONS_MAP[selectedDispute.lifting_reason] || selectedDispute.lifting_reason}</span></div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              <Card className="rounded-xl shadow-sm">
                <CardContent className="p-3 space-y-2">
                  <div className="flex items-center gap-2 text-sm font-semibold text-primary"><User className="h-4 w-4" /> Déclarant</div>
                  <div className="space-y-1.5 text-sm">
                    <div className="flex justify-between"><span className="text-muted-foreground">Nom :</span><span>{selectedDispute.declarant_name}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Qualité :</span><span>{DECLARANT_QUALITIES_MAP[selectedDispute.declarant_quality] || selectedDispute.declarant_quality}</span></div>
                    {selectedDispute.declarant_phone && <div className="flex justify-between"><span className="text-muted-foreground">Téléphone :</span><span>{selectedDispute.declarant_phone}</span></div>}
                    {selectedDispute.declarant_email && <div className="flex justify-between"><span className="text-muted-foreground">Email :</span><span className="truncate">{selectedDispute.declarant_email}</span></div>}
                  </div>
                </CardContent>
              </Card>

              {/* Parties involved */}
              {selectedDispute.parties_involved && Array.isArray(selectedDispute.parties_involved) && selectedDispute.parties_involved.length > 0 && (
                <Card className="rounded-xl shadow-sm">
                  <CardContent className="p-3 space-y-2">
                    <div className="text-sm font-semibold text-primary">Parties concernées</div>
                    {selectedDispute.parties_involved.map((party: any, i: number) => (
                      <div key={i} className="text-sm flex justify-between border-b last:border-0 pb-1">
                        <span className="text-muted-foreground">{PARTY_ROLES_MAP[party.role] || party.role}</span>
                        <span>{party.name}</span>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}

              {/* Documents */}
              {(selectedDispute.supporting_documents || selectedDispute.lifting_documents) && (
                <Card className="rounded-xl shadow-sm">
                  <CardContent className="p-3 space-y-2">
                    <div className="text-sm font-semibold text-primary">Documents</div>
                    <DisputeDocumentLinks docs={selectedDispute.supporting_documents} label="Documents justificatifs" />
                    <DisputeDocumentLinks docs={selectedDispute.lifting_documents} label="Documents de levée" />
                  </CardContent>
                </Card>
              )}

              {/* Resolution details */}
              {selectedDispute.resolution_details && (
                <Card className="rounded-xl shadow-sm">
                  <CardContent className="p-3 space-y-2">
                    <div className="text-sm font-semibold text-primary">Notes de résolution</div>
                    <p className="text-sm whitespace-pre-line text-muted-foreground">{selectedDispute.resolution_details}</p>
                  </CardContent>
                </Card>
              )}

              <div className="text-[10px] text-muted-foreground text-center">
                Créé le {new Date(selectedDispute.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                {selectedDispute.updated_at !== selectedDispute.created_at && (
                  <> · Mis à jour le {new Date(selectedDispute.updated_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}</>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

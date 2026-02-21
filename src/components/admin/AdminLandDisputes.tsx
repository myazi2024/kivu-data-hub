import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Scale, Search, Eye, Clock, CheckCircle, AlertTriangle, FileText, ChevronLeft, ChevronRight, User, RefreshCw, Filter } from 'lucide-react';

interface LandDispute {
  id: string;
  parcel_number: string;
  reference_number: string;
  dispute_type: string;
  dispute_nature: string;
  dispute_description: string | null;
  current_status: string;
  resolution_level: string | null;
  resolution_details: string | null;
  declarant_name: string;
  declarant_phone: string | null;
  declarant_email: string | null;
  declarant_id_number: string | null;
  declarant_quality: string;
  dispute_start_date: string | null;
  parties_involved: any;
  supporting_documents: any;
  lifting_status: string | null;
  lifting_reason: string | null;
  lifting_request_reference: string | null;
  lifting_documents: any;
  reported_by: string | null;
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

const STATUS_OPTIONS = [
  { value: 'all', label: 'Tous les statuts' },
  { value: 'en_cours', label: 'En cours' },
  { value: 'non_entame', label: 'Non entamé' },
  { value: 'familial', label: 'Niveau familial' },
  { value: 'conciliation_amiable', label: 'Conciliation' },
  { value: 'autorite_locale', label: 'Autorité locale' },
  { value: 'arbitrage', label: 'Arbitrage' },
  { value: 'tribunal', label: 'Tribunal' },
  { value: 'appel', label: 'En appel' },
  { value: 'resolu', label: 'Résolu' },
];

const AdminLandDisputes: React.FC = () => {
  const [disputes, setDisputes] = useState<LandDispute[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [selectedDispute, setSelectedDispute] = useState<LandDispute | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [adminNotes, setAdminNotes] = useState('');
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const itemsPerPage = 15;

  useEffect(() => {
    fetchDisputes();
  }, []);

  const fetchDisputes = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('cadastral_land_disputes' as any)
        .select('*')
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

  const handleUpdateStatus = async (disputeId: string, newStatus: string) => {
    setUpdatingStatus(true);
    try {
      const { error } = await supabase
        .from('cadastral_land_disputes' as any)
        .update({
          current_status: newStatus,
          resolution_details: adminNotes || null,
          updated_at: new Date().toISOString(),
        } as any)
        .eq('id', disputeId);

      if (error) throw error;
      toast.success('Statut mis à jour');
      setAdminNotes('');
      fetchDisputes();
      setIsDetailsOpen(false);
    } catch (error: any) {
      toast.error('Erreur lors de la mise à jour');
      console.error('Error:', error);
    } finally {
      setUpdatingStatus(false);
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

  const getStatusBadge = (status: string) => {
    const map: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
      en_cours: { label: 'En cours', variant: 'secondary' },
      resolu: { label: 'Résolu', variant: 'default' },
      non_entame: { label: 'Non entamé', variant: 'outline' },
      familial: { label: 'Familial', variant: 'secondary' },
      conciliation_amiable: { label: 'Conciliation', variant: 'secondary' },
      autorite_locale: { label: 'Autorité locale', variant: 'secondary' },
      arbitrage: { label: 'Arbitrage', variant: 'outline' },
      tribunal: { label: 'Tribunal', variant: 'destructive' },
      appel: { label: 'En appel', variant: 'destructive' },
    };
    const s = map[status] || { label: status, variant: 'secondary' as const };
    return <Badge variant={s.variant} className="text-[10px]">{s.label}</Badge>;
  };

  const stats = {
    total: disputes.length,
    reports: disputes.filter(d => d.dispute_type === 'report').length,
    liftings: disputes.filter(d => d.dispute_type === 'lifting').length,
    enCours: disputes.filter(d => !['resolu'].includes(d.current_status)).length,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold flex items-center gap-2">
            <Scale className="h-5 w-5 text-orange-600" />
            Litiges fonciers
          </h2>
          <p className="text-xs text-muted-foreground">Gestion des signalements et demandes de levée</p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchDisputes} className="gap-1">
          <RefreshCw className="h-3.5 w-3.5" />
          Actualiser
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        {[
          { label: "Total", value: stats.total, color: "text-foreground" },
          { label: "Signalements", value: stats.reports, color: "text-orange-600" },
          { label: "Levées", value: stats.liftings, color: "text-blue-600" },
          { label: "En cours", value: stats.enCours, color: "text-amber-600" },
        ].map((stat) => (
          <Card key={stat.label} className="rounded-xl">
            <CardContent className="p-3 text-center">
              <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
              <p className="text-[10px] text-muted-foreground">{stat.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Rechercher par parcelle, référence, déclarant..."
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
            className="h-9 pl-8 text-sm rounded-xl"
          />
        </div>
        <Select value={typeFilter} onValueChange={(v) => { setTypeFilter(v); setCurrentPage(1); }}>
          <SelectTrigger className="h-9 w-full md:w-40 text-sm rounded-xl">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous types</SelectItem>
            <SelectItem value="report">Signalements</SelectItem>
            <SelectItem value="lifting">Levées</SelectItem>
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setCurrentPage(1); }}>
          <SelectTrigger className="h-9 w-full md:w-40 text-sm rounded-xl">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map(opt => (
              <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card className="rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="p-3 text-left font-medium text-xs">Référence</th>
                <th className="p-3 text-left font-medium text-xs">Parcelle</th>
                <th className="p-3 text-left font-medium text-xs hidden md:table-cell">Type</th>
                <th className="p-3 text-left font-medium text-xs hidden md:table-cell">Nature</th>
                <th className="p-3 text-left font-medium text-xs">Statut</th>
                <th className="p-3 text-left font-medium text-xs hidden md:table-cell">Déclarant</th>
                <th className="p-3 text-left font-medium text-xs hidden md:table-cell">Date</th>
                <th className="p-3 text-center font-medium text-xs">Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginatedDisputes.length === 0 ? (
                <tr><td colSpan={8} className="p-8 text-center text-muted-foreground">Aucun litige trouvé</td></tr>
              ) : paginatedDisputes.map((dispute) => (
                <tr key={dispute.id} className="border-b hover:bg-muted/30 transition-colors">
                  <td className="p-3 font-mono text-xs font-bold">{dispute.reference_number}</td>
                  <td className="p-3 font-mono text-xs">{dispute.parcel_number}</td>
                  <td className="p-3 hidden md:table-cell">
                    <Badge variant={dispute.dispute_type === 'report' ? 'destructive' : 'default'} className="text-[10px]">
                      {dispute.dispute_type === 'report' ? 'Signalement' : 'Levée'}
                    </Badge>
                  </td>
                  <td className="p-3 text-xs hidden md:table-cell">{DISPUTE_NATURES_MAP[dispute.dispute_nature] || dispute.dispute_nature}</td>
                  <td className="p-3">{getStatusBadge(dispute.current_status)}</td>
                  <td className="p-3 text-xs hidden md:table-cell">{dispute.declarant_name}</td>
                  <td className="p-3 text-xs hidden md:table-cell">{new Date(dispute.created_at).toLocaleDateString('fr-FR')}</td>
                  <td className="p-3 text-center">
                    <Button variant="ghost" size="sm" onClick={() => { setSelectedDispute(dispute); setIsDetailsOpen(true); setAdminNotes(''); }} className="h-7 w-7 p-0">
                      <Eye className="h-4 w-4" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between p-3 border-t">
            <span className="text-xs text-muted-foreground">{filteredDisputes.length} résultat(s)</span>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)} className="h-7 text-xs">
                <ChevronLeft className="h-3 w-3" />
              </Button>
              <span className="text-xs">{currentPage}/{totalPages}</span>
              <Button variant="outline" size="sm" disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)} className="h-7 text-xs">
                <ChevronRight className="h-3 w-3" />
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Detail Dialog */}
      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="max-w-lg w-[calc(100vw-2rem)] rounded-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base flex items-center gap-2">
              <Scale className="h-5 w-5 text-orange-600" />
              Litige {selectedDispute?.reference_number}
            </DialogTitle>
          </DialogHeader>
          {selectedDispute && (
            <div className="space-y-3">
              <Card className="rounded-xl shadow-sm">
                <CardContent className="p-3 space-y-2">
                  <div className="text-sm font-semibold text-primary flex items-center gap-2"><FileText className="h-4 w-4" /> Informations</div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div><span className="text-muted-foreground text-xs">Parcelle</span><p className="font-mono font-bold">{selectedDispute.parcel_number}</p></div>
                    <div><span className="text-muted-foreground text-xs">Type</span><p>{selectedDispute.dispute_type === 'report' ? 'Signalement' : 'Levée'}</p></div>
                    <div><span className="text-muted-foreground text-xs">Nature</span><p>{DISPUTE_NATURES_MAP[selectedDispute.dispute_nature]}</p></div>
                    <div><span className="text-muted-foreground text-xs">Statut</span><div>{getStatusBadge(selectedDispute.current_status)}</div></div>
                    {selectedDispute.dispute_start_date && <div><span className="text-muted-foreground text-xs">Début litige</span><p>{new Date(selectedDispute.dispute_start_date).toLocaleDateString('fr-FR')}</p></div>}
                    {selectedDispute.resolution_level && <div><span className="text-muted-foreground text-xs">Niveau résolution</span><p className="capitalize">{selectedDispute.resolution_level.replace(/_/g, ' ')}</p></div>}
                  </div>
                  {selectedDispute.dispute_description && (
                    <div className="pt-2 border-t">
                      <span className="text-xs text-muted-foreground">Description</span>
                      <p className="text-sm mt-1">{selectedDispute.dispute_description}</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="rounded-xl shadow-sm">
                <CardContent className="p-3 space-y-2">
                  <div className="text-sm font-semibold text-primary flex items-center gap-2"><User className="h-4 w-4" /> Déclarant</div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div><span className="text-muted-foreground text-xs">Nom</span><p>{selectedDispute.declarant_name}</p></div>
                    <div><span className="text-muted-foreground text-xs">Qualité</span><p className="capitalize">{selectedDispute.declarant_quality}</p></div>
                    {selectedDispute.declarant_phone && <div><span className="text-muted-foreground text-xs">Téléphone</span><p>{selectedDispute.declarant_phone}</p></div>}
                    {selectedDispute.declarant_email && <div><span className="text-muted-foreground text-xs">Email</span><p className="truncate">{selectedDispute.declarant_email}</p></div>}
                    {selectedDispute.declarant_id_number && <div><span className="text-muted-foreground text-xs">N° Identité</span><p>{selectedDispute.declarant_id_number}</p></div>}
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
                        <span className="text-muted-foreground capitalize">{party.role}</span>
                        <span>{party.name}</span>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}

              {/* Admin action: Update status */}
              <Card className="rounded-xl shadow-sm border-primary/20">
                <CardContent className="p-3 space-y-3">
                  <div className="text-sm font-semibold text-primary">Action administrative</div>
                  <div className="space-y-2">
                    <Label className="text-xs">Changer le statut</Label>
                    <div className="grid grid-cols-2 gap-2">
                      {['en_cours', 'resolu'].map(status => (
                        <Button
                          key={status}
                          variant={selectedDispute.current_status === status ? 'default' : 'outline'}
                          size="sm"
                          className="text-xs h-8 rounded-lg"
                          disabled={updatingStatus || selectedDispute.current_status === status}
                          onClick={() => handleUpdateStatus(selectedDispute.id, status)}
                        >
                          {status === 'resolu' ? 'Marquer résolu' : 'En cours'}
                        </Button>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Notes administratives</Label>
                    <Textarea
                      value={adminNotes}
                      onChange={(e) => setAdminNotes(e.target.value)}
                      placeholder="Ajouter des notes de résolution..."
                      className="text-sm rounded-xl min-h-[60px]"
                    />
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminLandDisputes;

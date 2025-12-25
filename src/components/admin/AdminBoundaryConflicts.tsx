import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { RefreshCw, AlertTriangle, CheckCircle2, Clock, Eye, MapPin } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface BoundaryConflict {
  id: string;
  reporting_parcel_number: string;
  conflicting_parcel_number: string;
  conflict_type: string;
  description: string;
  status: string;
  resolution_notes: string | null;
  created_at: string;
  resolved_at: string | null;
}

const AdminBoundaryConflicts = () => {
  const [conflicts, setConflicts] = useState<BoundaryConflict[]>([]);
  const [loading, setLoading] = useState(true);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selectedConflict, setSelectedConflict] = useState<BoundaryConflict | null>(null);
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  useEffect(() => {
    fetchConflicts();
  }, []);

  const fetchConflicts = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('cadastral_boundary_conflicts')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setConflicts(data || []);
    } catch (error) {
      console.error('Error fetching conflicts:', error);
      toast.error('Erreur lors du chargement des conflits');
    } finally {
      setLoading(false);
    }
  };

  const handleResolve = async () => {
    if (!selectedConflict) return;
    
    try {
      const { error } = await supabase
        .from('cadastral_boundary_conflicts')
        .update({
          status: 'resolved',
          resolution_notes: resolutionNotes,
          resolved_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedConflict.id);

      if (error) throw error;
      toast.success('Conflit résolu');
      setDetailsOpen(false);
      setResolutionNotes('');
      fetchConflicts();
    } catch (error) {
      toast.error('Erreur lors de la résolution');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="text-[9px] bg-amber-100 text-amber-700 border-amber-200">En attente</Badge>;
      case 'investigating':
        return <Badge variant="outline" className="text-[9px] bg-blue-100 text-blue-700 border-blue-200">Investigation</Badge>;
      case 'resolved':
        return <Badge variant="outline" className="text-[9px] bg-green-100 text-green-700 border-green-200">Résolu</Badge>;
      default:
        return <Badge variant="outline" className="text-[9px]">{status}</Badge>;
    }
  };

  const getConflictTypeLabel = (type: string) => {
    switch (type) {
      case 'overlap': return 'Chevauchement';
      case 'boundary_dispute': return 'Litige de limite';
      case 'encroachment': return 'Empiètement';
      default: return type;
    }
  };

  const filteredConflicts = filterStatus === 'all' 
    ? conflicts 
    : conflicts.filter(c => c.status === filterStatus);

  const pendingCount = conflicts.filter(c => c.status === 'pending').length;
  const investigatingCount = conflicts.filter(c => c.status === 'investigating').length;
  const resolvedCount = conflicts.filter(c => c.status === 'resolved').length;

  return (
    <div className="space-y-3 md:space-y-4">
      {/* Header */}
      <Card className="p-3 md:p-4 bg-background rounded-2xl shadow-sm border">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-sm md:text-base font-bold">Conflits de Limites</h2>
            <p className="text-[10px] md:text-xs text-muted-foreground">Gestion des conflits entre parcelles</p>
          </div>
          <Button variant="outline" size="sm" onClick={fetchConflicts} disabled={loading} className="h-8 text-xs">
            <RefreshCw className={`h-3 w-3 mr-1 ${loading ? 'animate-spin' : ''}`} />
            Actualiser
          </Button>
        </div>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2">
        <Card className="p-2.5 md:p-3 bg-background rounded-xl shadow-sm border text-center cursor-pointer hover:bg-accent/50" onClick={() => setFilterStatus('pending')}>
          <p className="text-lg md:text-xl font-bold text-amber-500">{pendingCount}</p>
          <p className="text-[9px] md:text-[10px] text-muted-foreground">En attente</p>
        </Card>
        <Card className="p-2.5 md:p-3 bg-background rounded-xl shadow-sm border text-center cursor-pointer hover:bg-accent/50" onClick={() => setFilterStatus('investigating')}>
          <p className="text-lg md:text-xl font-bold text-blue-500">{investigatingCount}</p>
          <p className="text-[9px] md:text-[10px] text-muted-foreground">Investigation</p>
        </Card>
        <Card className="p-2.5 md:p-3 bg-background rounded-xl shadow-sm border text-center cursor-pointer hover:bg-accent/50" onClick={() => setFilterStatus('resolved')}>
          <p className="text-lg md:text-xl font-bold text-green-500">{resolvedCount}</p>
          <p className="text-[9px] md:text-[10px] text-muted-foreground">Résolus</p>
        </Card>
      </div>

      {/* Filter */}
      <Card className="p-2.5 bg-background rounded-xl shadow-sm border">
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="h-8 text-xs">
            <SelectValue placeholder="Filtrer par statut" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les conflits</SelectItem>
            <SelectItem value="pending">En attente</SelectItem>
            <SelectItem value="investigating">En investigation</SelectItem>
            <SelectItem value="resolved">Résolus</SelectItem>
          </SelectContent>
        </Select>
      </Card>

      {/* Conflicts List */}
      <Card className="p-3 md:p-4 bg-background rounded-2xl shadow-sm border">
        <h3 className="text-xs font-semibold mb-3">Liste des conflits ({filteredConflicts.length})</h3>
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
          </div>
        ) : filteredConflicts.length === 0 ? (
          <div className="text-center py-8">
            <CheckCircle2 className="h-8 w-8 mx-auto text-green-500 mb-2" />
            <p className="text-xs text-muted-foreground">Aucun conflit</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredConflicts.map((conflict) => (
              <div key={conflict.id} className="p-2.5 md:p-3 rounded-xl border bg-card">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <AlertTriangle className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                      <span className="text-xs font-medium">{getConflictTypeLabel(conflict.conflict_type)}</span>
                      {getStatusBadge(conflict.status)}
                    </div>
                    <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                      <MapPin className="h-2.5 w-2.5" />
                      <span className="truncate">{conflict.reporting_parcel_number} ↔ {conflict.conflicting_parcel_number}</span>
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-1 line-clamp-2">{conflict.description}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <span className="text-[9px] text-muted-foreground">
                      {format(new Date(conflict.created_at), 'dd/MM/yy', { locale: fr })}
                    </span>
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => { setSelectedConflict(conflict); setDetailsOpen(true); }}>
                      <Eye className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Details Dialog */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-[340px] rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-sm">Détails du conflit</DialogTitle>
          </DialogHeader>
          {selectedConflict && (
            <div className="space-y-3 py-2">
              <div className="p-2.5 rounded-lg bg-muted/50">
                <p className="text-[10px] text-muted-foreground mb-1">Type de conflit</p>
                <p className="text-xs font-medium">{getConflictTypeLabel(selectedConflict.conflict_type)}</p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="p-2.5 rounded-lg bg-muted/50">
                  <p className="text-[10px] text-muted-foreground mb-1">Parcelle déclarante</p>
                  <p className="text-xs font-medium truncate">{selectedConflict.reporting_parcel_number}</p>
                </div>
                <div className="p-2.5 rounded-lg bg-muted/50">
                  <p className="text-[10px] text-muted-foreground mb-1">Parcelle en conflit</p>
                  <p className="text-xs font-medium truncate">{selectedConflict.conflicting_parcel_number}</p>
                </div>
              </div>
              <div className="p-2.5 rounded-lg bg-muted/50">
                <p className="text-[10px] text-muted-foreground mb-1">Description</p>
                <p className="text-xs">{selectedConflict.description}</p>
              </div>
              {selectedConflict.status !== 'resolved' && (
                <div className="space-y-1.5">
                  <Label className="text-xs">Notes de résolution</Label>
                  <Textarea value={resolutionNotes} onChange={(e) => setResolutionNotes(e.target.value)} placeholder="Décrivez la résolution..." className="text-sm min-h-[80px]" />
                </div>
              )}
              {selectedConflict.resolution_notes && (
                <div className="p-2.5 rounded-lg bg-green-50 dark:bg-green-900/20">
                  <p className="text-[10px] text-green-700 dark:text-green-400 mb-1">Résolution</p>
                  <p className="text-xs">{selectedConflict.resolution_notes}</p>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setDetailsOpen(false)} className="h-8 text-xs">Fermer</Button>
            {selectedConflict?.status !== 'resolved' && (
              <Button size="sm" onClick={handleResolve} className="h-8 text-xs">
                <CheckCircle2 className="h-3 w-3 mr-1" />
                Résoudre
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminBoundaryConflicts;

import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { RefreshCw, Building, Eye, DollarSign, Calendar, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface Mortgage {
  id: string;
  parcel_id: string;
  creditor_name: string;
  creditor_type: string;
  mortgage_amount_usd: number;
  mortgage_status: string;
  contract_date: string;
  duration_months: number;
  created_at: string;
  parcel_number?: string;
}

const AdminMortgages = () => {
  const [mortgages, setMortgages] = useState<Mortgage[]>([]);
  const [loading, setLoading] = useState(true);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selectedMortgage, setSelectedMortgage] = useState<Mortgage | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');

  useEffect(() => {
    fetchMortgages();
  }, []);

  const fetchMortgages = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('cadastral_mortgages')
        .select(`
          *,
          cadastral_parcels!fk_cadastral_mortgages_parcel(parcel_number)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      const mortgagesWithParcel = (data || []).map(m => ({
        ...m,
        parcel_number: (m.cadastral_parcels as any)?.parcel_number || 'N/A'
      }));
      
      setMortgages(mortgagesWithParcel);
    } catch (error) {
      console.error('Error fetching mortgages:', error);
      toast.error('Erreur lors du chargement des hypothèques');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge variant="outline" className="text-[9px] bg-blue-100 text-blue-700 border-blue-200">Actif</Badge>;
      case 'paid':
        return <Badge variant="outline" className="text-[9px] bg-green-100 text-green-700 border-green-200">Soldé</Badge>;
      case 'defaulted':
        return <Badge variant="outline" className="text-[9px] bg-red-100 text-red-700 border-red-200">Défaut</Badge>;
      default:
        return <Badge variant="outline" className="text-[9px]">{status}</Badge>;
    }
  };

  const getCreditorTypeLabel = (type: string) => {
    switch (type) {
      case 'bank': return 'Banque';
      case 'microfinance': return 'Microfinance';
      case 'private': return 'Privé';
      default: return type;
    }
  };

  const filteredMortgages = filterStatus === 'all' 
    ? mortgages 
    : mortgages.filter(m => m.mortgage_status === filterStatus);

  const activeCount = mortgages.filter(m => m.mortgage_status === 'active').length;
  const paidCount = mortgages.filter(m => m.mortgage_status === 'paid').length;
  const totalAmount = mortgages.filter(m => m.mortgage_status === 'active').reduce((sum, m) => sum + m.mortgage_amount_usd, 0);

  return (
    <div className="space-y-3 md:space-y-4">
      {/* Header */}
      <Card className="p-3 md:p-4 bg-background rounded-2xl shadow-sm border">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-sm md:text-base font-bold">Gestion des Hypothèques</h2>
            <p className="text-[10px] md:text-xs text-muted-foreground">Suivi des hypothèques sur les parcelles</p>
          </div>
          <Button variant="outline" size="sm" onClick={fetchMortgages} disabled={loading} className="h-8 text-xs">
            <RefreshCw className={`h-3 w-3 mr-1 ${loading ? 'animate-spin' : ''}`} />
            Actualiser
          </Button>
        </div>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2">
        <Card className="p-2.5 md:p-3 bg-background rounded-xl shadow-sm border text-center cursor-pointer hover:bg-accent/50" onClick={() => setFilterStatus('active')}>
          <p className="text-lg md:text-xl font-bold text-blue-500">{activeCount}</p>
          <p className="text-[9px] md:text-[10px] text-muted-foreground">Actives</p>
        </Card>
        <Card className="p-2.5 md:p-3 bg-background rounded-xl shadow-sm border text-center cursor-pointer hover:bg-accent/50" onClick={() => setFilterStatus('paid')}>
          <p className="text-lg md:text-xl font-bold text-green-500">{paidCount}</p>
          <p className="text-[9px] md:text-[10px] text-muted-foreground">Soldées</p>
        </Card>
        <Card className="p-2.5 md:p-3 bg-background rounded-xl shadow-sm border text-center">
          <p className="text-lg md:text-xl font-bold text-primary">${(totalAmount / 1000).toFixed(0)}k</p>
          <p className="text-[9px] md:text-[10px] text-muted-foreground">Total actif</p>
        </Card>
      </div>

      {/* Filter */}
      <Card className="p-2.5 bg-background rounded-xl shadow-sm border">
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="h-8 text-xs">
            <SelectValue placeholder="Filtrer par statut" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes les hypothèques</SelectItem>
            <SelectItem value="active">Actives</SelectItem>
            <SelectItem value="paid">Soldées</SelectItem>
            <SelectItem value="defaulted">En défaut</SelectItem>
          </SelectContent>
        </Select>
      </Card>

      {/* Mortgages List */}
      <Card className="p-3 md:p-4 bg-background rounded-2xl shadow-sm border">
        <h3 className="text-xs font-semibold mb-3">Liste des hypothèques ({filteredMortgages.length})</h3>
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
          </div>
        ) : filteredMortgages.length === 0 ? (
          <div className="text-center py-8">
            <Building className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
            <p className="text-xs text-muted-foreground">Aucune hypothèque trouvée</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredMortgages.map((mortgage) => (
              <div key={mortgage.id} className="p-2.5 md:p-3 rounded-xl border bg-card">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Building className="h-3.5 w-3.5 text-primary shrink-0" />
                      <span className="text-xs font-medium truncate">{mortgage.creditor_name}</span>
                      {getStatusBadge(mortgage.mortgage_status)}
                    </div>
                    <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                      <span className="truncate">Parcelle: {mortgage.parcel_number}</span>
                      <span>•</span>
                      <span>{getCreditorTypeLabel(mortgage.creditor_type)}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-1 text-[10px]">
                      <DollarSign className="h-2.5 w-2.5 text-green-500" />
                      <span className="font-semibold">${mortgage.mortgage_amount_usd.toLocaleString()}</span>
                      <span className="text-muted-foreground">• {mortgage.duration_months} mois</span>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <span className="text-[9px] text-muted-foreground">
                      {format(new Date(mortgage.contract_date), 'dd/MM/yy', { locale: fr })}
                    </span>
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => { setSelectedMortgage(mortgage); setDetailsOpen(true); }}>
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
            <DialogTitle className="text-sm">Détails de l'hypothèque</DialogTitle>
          </DialogHeader>
          {selectedMortgage && (
            <div className="space-y-3 py-2">
              <div className="p-2.5 rounded-lg bg-muted/50">
                <p className="text-[10px] text-muted-foreground mb-1">Créancier</p>
                <p className="text-xs font-medium">{selectedMortgage.creditor_name}</p>
                <p className="text-[10px] text-muted-foreground">{getCreditorTypeLabel(selectedMortgage.creditor_type)}</p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="p-2.5 rounded-lg bg-muted/50">
                  <p className="text-[10px] text-muted-foreground mb-1">Montant</p>
                  <p className="text-sm font-bold text-primary">${selectedMortgage.mortgage_amount_usd.toLocaleString()}</p>
                </div>
                <div className="p-2.5 rounded-lg bg-muted/50">
                  <p className="text-[10px] text-muted-foreground mb-1">Durée</p>
                  <p className="text-sm font-bold">{selectedMortgage.duration_months} mois</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="p-2.5 rounded-lg bg-muted/50">
                  <p className="text-[10px] text-muted-foreground mb-1">Date contrat</p>
                  <p className="text-xs font-medium">{format(new Date(selectedMortgage.contract_date), 'dd/MM/yyyy', { locale: fr })}</p>
                </div>
                <div className="p-2.5 rounded-lg bg-muted/50">
                  <p className="text-[10px] text-muted-foreground mb-1">Statut</p>
                  {getStatusBadge(selectedMortgage.mortgage_status)}
                </div>
              </div>
              <div className="p-2.5 rounded-lg bg-muted/50">
                <p className="text-[10px] text-muted-foreground mb-1">Parcelle</p>
                <p className="text-xs font-medium">{selectedMortgage.parcel_number}</p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setDetailsOpen(false)} className="h-8 text-xs">Fermer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminMortgages;

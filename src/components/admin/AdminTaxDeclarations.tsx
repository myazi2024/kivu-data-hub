import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Receipt, Search, Download, RefreshCw, CheckCircle, XCircle, RotateCcw, Eye, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { usePagination } from '@/hooks/usePagination';
import { PaginationControls } from '@/components/shared/PaginationControls';
import { StatusBadge, StatusType } from '@/components/shared/StatusBadge';
import { exportToCSV } from '@/utils/csvExport';
import { useAuth } from '@/hooks/useAuth';

/**
 * Helper to resolve camelCase / snake_case tax_history keys.
 * CCC form stores camelCase, tax services store snake_case.
 */
const r = (obj: any, ...keys: string[]) => {
  for (const k of keys) {
    if (obj?.[k] !== undefined && obj[k] !== null) return obj[k];
  }
  return null;
};

interface TaxDeclaration {
  id: string;
  parcel_number: string;
  original_parcel_id: string | null;
  user_id: string | null;
  status: string;
  province: string | null;
  ville: string | null;
  area_sqm: number | null;
  created_at: string;
  updated_at: string;
  tax_history: any[];
  current_owner_name?: string | null;
  profiles?: { full_name: string | null; email: string | null } | null;
}

const TAX_TYPES = [
  'Impôt foncier annuel',
  'Taxe de bâtisse',
  'Impôt sur les revenus locatifs',
];

const AdminTaxDeclarations = () => {
  const { user } = useAuth();
  const [declarations, setDeclarations] = useState<TaxDeclaration[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('_all');
  const [filterTaxType, setFilterTaxType] = useState('_all');
  const [selectedDeclaration, setSelectedDeclaration] = useState<TaxDeclaration | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [returnReason, setReturnReason] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [actionType, setActionType] = useState<'approve' | 'reject' | 'return' | null>(null);

  const fetchDeclarations = useCallback(async () => {
    setLoading(true);
    try {
      let allData: any[] = [];
      let hasMore = true;
      let page = 0;
      const pageSize = 1000;

      while (hasMore) {
        const { data, error } = await supabase
          .from('cadastral_contributions')
          .select('id, parcel_number, original_parcel_id, user_id, status, province, ville, area_sqm, created_at, updated_at, tax_history, current_owner_name')
          .eq('contribution_type', 'update')
          .not('tax_history', 'is', null)
          .order('created_at', { ascending: false })
          .range(page * pageSize, (page + 1) * pageSize - 1);

        if (error) throw error;
        allData = [...allData, ...(data || [])];
        hasMore = (data?.length || 0) === pageSize;
        page++;
      }

      setDeclarations(allData);
    } catch (error: any) {
      console.error('Erreur chargement déclarations fiscales:', error);
      toast.error('Erreur lors du chargement des déclarations fiscales');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchDeclarations(); }, [fetchDeclarations]);

  // Extract first tax entry info using compatibility helper
  const getTaxInfo = (decl: TaxDeclaration) => {
    const entry = decl.tax_history?.[0];
    if (!entry) return { taxType: '—', taxYear: '—', amount: 0, nif: null, isExempt: false };
    return {
      taxType: r(entry, 'tax_type', 'taxType') || '—',
      taxYear: r(entry, 'tax_year', 'taxYear') || '—',
      amount: Number(r(entry, 'amount_usd', 'amountUsd', 'grand_total')) || 0,
      nif: r(entry, 'nif'),
      isExempt: r(entry, 'is_exempt', 'isExempt') || false,
      paymentStatus: r(entry, 'payment_status', 'paymentStatus') || 'En attente',
      baseTax: Number(r(entry, 'base_tax_usd', 'baseTaxUsd')) || 0,
      penalties: Number(r(entry, 'penalty_amount_usd', 'penaltyAmountUsd')) || 0,
      fees: Number(r(entry, 'fees_usd', 'feesUsd')) || 0,
      fiscalZone: r(entry, 'fiscal_zone', 'fiscalZone'),
      exemptions: r(entry, 'exemptions') || [],
    };
  };

  // Filtered data
  const filtered = declarations.filter(d => {
    const info = getTaxInfo(d);
    if (filterStatus !== '_all' && d.status !== filterStatus) return false;
    if (filterTaxType !== '_all' && info.taxType !== filterTaxType) return false;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      return d.parcel_number.toLowerCase().includes(term) ||
        (d.current_owner_name || '').toLowerCase().includes(term) ||
        String(info.taxYear).includes(term);
    }
    return true;
  });

  const pagination = usePagination({ totalItems: filtered.length, itemsPerPage: 15 });
  const paginatedData = filtered.slice(
    (pagination.currentPage - 1) * 15,
    pagination.currentPage * 15
  );

  // Stats
  const stats = {
    total: declarations.length,
    pending: declarations.filter(d => d.status === 'pending').length,
    approved: declarations.filter(d => d.status === 'approved').length,
    rejected: declarations.filter(d => d.status === 'rejected').length,
    returned: declarations.filter(d => d.status === 'returned').length,
  };

  const handleAction = async () => {
    if (!selectedDeclaration || !actionType || !user) return;
    setProcessing(true);

    try {
      const info = getTaxInfo(selectedDeclaration);

      if (actionType === 'approve') {
        // Insert into cadastral_tax_history
        const targetParcelId = selectedDeclaration.original_parcel_id;
        if (targetParcelId) {
          for (const entry of selectedDeclaration.tax_history) {
            const { error: thError } = await supabase.from('cadastral_tax_history').insert({
              parcel_id: targetParcelId,
              tax_year: Number(r(entry, 'tax_year', 'taxYear')),
              amount_usd: Number(r(entry, 'amount_usd', 'amountUsd', 'grand_total')) || 0,
              payment_status: r(entry, 'payment_status', 'paymentStatus') || 'En attente',
              payment_date: r(entry, 'payment_date', 'paymentDate'),
              receipt_document_url: r(entry, 'receipt_document_url', 'receiptDocumentUrl'),
            });
            if (thError) console.error('Erreur insertion tax_history:', thError);
          }
        }

        const { error } = await supabase
          .from('cadastral_contributions')
          .update({
            status: 'approved',
            reviewed_by: user.id,
            reviewed_at: new Date().toISOString(),
          })
          .eq('id', selectedDeclaration.id);
        if (error) throw error;

        // Notification
        if (selectedDeclaration.user_id) {
          await supabase.from('notifications').insert({
            user_id: selectedDeclaration.user_id,
            title: 'Déclaration fiscale approuvée',
            message: `Votre déclaration "${info.taxType}" pour ${selectedDeclaration.parcel_number} (exercice ${info.taxYear}) a été approuvée.`,
            type: 'success',
            action_url: '/user-dashboard',
          });
        }
        toast.success('Déclaration approuvée');

      } else if (actionType === 'reject') {
        if (!rejectionReason.trim()) {
          toast.error('Veuillez indiquer un motif de rejet');
          setProcessing(false);
          return;
        }
        const { error } = await supabase
          .from('cadastral_contributions')
          .update({
            status: 'rejected',
            rejection_reason: rejectionReason,
            rejected_by: user.id,
            rejection_date: new Date().toISOString(),
            reviewed_by: user.id,
            reviewed_at: new Date().toISOString(),
          })
          .eq('id', selectedDeclaration.id);
        if (error) throw error;

        if (selectedDeclaration.user_id) {
          await supabase.from('notifications').insert({
            user_id: selectedDeclaration.user_id,
            title: 'Déclaration fiscale rejetée',
            message: `Votre déclaration "${info.taxType}" pour ${selectedDeclaration.parcel_number} a été rejetée. Motif : ${rejectionReason}`,
            type: 'error',
            action_url: '/user-dashboard',
          });
        }
        toast.success('Déclaration rejetée');

      } else if (actionType === 'return') {
        if (!returnReason.trim()) {
          toast.error('Veuillez indiquer un motif de renvoi');
          setProcessing(false);
          return;
        }
        const { error } = await supabase
          .from('cadastral_contributions')
          .update({
            status: 'returned',
            rejection_reason: returnReason,
            reviewed_by: user.id,
            reviewed_at: new Date().toISOString(),
          })
          .eq('id', selectedDeclaration.id);
        if (error) throw error;

        if (selectedDeclaration.user_id) {
          await supabase.from('notifications').insert({
            user_id: selectedDeclaration.user_id,
            title: 'Déclaration fiscale à corriger',
            message: `Votre déclaration "${info.taxType}" pour ${selectedDeclaration.parcel_number} nécessite des corrections. Motif : ${returnReason}`,
            type: 'warning',
            action_url: '/user-dashboard',
          });
        }
        toast.success('Déclaration renvoyée pour correction');
      }

      setDialogOpen(false);
      setSelectedDeclaration(null);
      setActionType(null);
      setReturnReason('');
      setRejectionReason('');
      fetchDeclarations();
    } catch (error: any) {
      console.error('Erreur traitement:', error);
      toast.error('Erreur lors du traitement');
    } finally {
      setProcessing(false);
    }
  };

  const openDetail = (decl: TaxDeclaration) => {
    setSelectedDeclaration(decl);
    setActionType(null);
    setReturnReason('');
    setRejectionReason('');
    setDialogOpen(true);
  };

  const getStatusType = (status: string): StatusType => {
    switch (status) {
      case 'approved': return 'success';
      case 'rejected': return 'error';
      case 'returned': return 'warning';
      default: return 'pending';
    }
  };

  const handleExport = () => {
    const rows = filtered.map(d => {
      const info = getTaxInfo(d);
      return {
        'Parcelle': d.parcel_number,
        'Propriétaire': d.current_owner_name || '',
        'Type taxe': info.taxType,
        'Exercice': info.taxYear,
        'Montant (USD)': info.amount,
        'NIF': info.nif || '',
        'Statut': d.status,
        'Province': d.province || '',
        'Ville': d.ville || '',
        'Date soumission': format(new Date(d.created_at), 'dd/MM/yyyy', { locale: fr }),
      };
    });
    exportToCSV(rows, 'declarations-fiscales');
  };

  const columns = [
    { header: 'Parcelle', accessor: (d: TaxDeclaration) => <span className="font-mono text-xs">{d.parcel_number}</span> },
    { header: 'Type', accessor: (d: TaxDeclaration) => {
      const info = getTaxInfo(d);
      return <Badge variant="outline" className="text-[10px]">{info.taxType}</Badge>;
    }},
    { header: 'Exercice', accessor: (d: TaxDeclaration) => getTaxInfo(d).taxYear },
    { header: 'Montant', accessor: (d: TaxDeclaration) => `${getTaxInfo(d).amount.toLocaleString()} USD`, hideOnMobile: true },
    { header: 'Statut', accessor: (d: TaxDeclaration) => <StatusBadge status={d.status as StatusType} /> },
    { header: 'Date', accessor: (d: TaxDeclaration) => format(new Date(d.created_at), 'dd/MM/yy', { locale: fr }), hideOnMobile: true },
    { header: '', accessor: (d: TaxDeclaration) => (
      <Button variant="ghost" size="sm" className="h-7 px-2" onClick={() => openDetail(d)}>
        <Eye className="h-3.5 w-3.5" />
      </Button>
    )},
  ];

  const info = selectedDeclaration ? getTaxInfo(selectedDeclaration) : null;

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
        {[
          { label: 'Total', value: stats.total, color: 'text-foreground' },
          { label: 'En attente', value: stats.pending, color: 'text-amber-600' },
          { label: 'Approuvées', value: stats.approved, color: 'text-emerald-600' },
          { label: 'Rejetées', value: stats.rejected, color: 'text-destructive' },
          { label: 'Renvoyées', value: stats.returned, color: 'text-orange-600' },
        ].map(s => (
          <Card key={s.label} className="p-3">
            <p className="text-xs text-muted-foreground">{s.label}</p>
            <p className={`text-lg font-bold ${s.color}`}>{s.value}</p>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="p-3">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Receipt className="h-4 w-4" />
              Déclarations fiscales
            </CardTitle>
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2 top-2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Parcelle, propriétaire..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="pl-8 h-8 text-xs w-40"
                />
              </div>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="h-8 w-32 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="_all">Tous statuts</SelectItem>
                  <SelectItem value="pending">En attente</SelectItem>
                  <SelectItem value="approved">Approuvée</SelectItem>
                  <SelectItem value="rejected">Rejetée</SelectItem>
                  <SelectItem value="returned">Renvoyée</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filterTaxType} onValueChange={setFilterTaxType}>
                <SelectTrigger className="h-8 w-44 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="_all">Toutes taxes</SelectItem>
                  {TAX_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
              <Button variant="outline" size="sm" className="h-8 gap-1" onClick={handleExport}>
                <Download className="h-3.5 w-3.5" />
              </Button>
              <Button variant="outline" size="sm" className="h-8 gap-1" onClick={fetchDeclarations}>
                <RefreshCw className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <ResponsiveTable
            data={paginatedData}
            columns={columns}
            loading={loading}
            emptyMessage="Aucune déclaration fiscale"
          />
          <div className="p-3">
            <PaginationControls {...pagination} />
          </div>
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(open) => { if (!processing) setDialogOpen(open); }}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5" />
              Déclaration fiscale
            </DialogTitle>
            <DialogDescription>
              {selectedDeclaration?.parcel_number} — {info?.taxType}
            </DialogDescription>
          </DialogHeader>

          {selectedDeclaration && info && (
            <div className="space-y-4 text-sm">
              {/* Identification */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs text-muted-foreground">Parcelle</Label>
                  <p className="font-mono font-medium">{selectedDeclaration.parcel_number}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Statut</Label>
                  <div><StatusBadge status={selectedDeclaration.status as StatusType} /></div>
                </div>
                {selectedDeclaration.current_owner_name && (
                  <div className="col-span-2">
                    <Label className="text-xs text-muted-foreground">Propriétaire</Label>
                    <p>{selectedDeclaration.current_owner_name}</p>
                  </div>
                )}
              </div>

              {/* Tax details */}
              <div className="p-3 bg-secondary rounded-lg space-y-2">
                <h4 className="font-semibold text-xs uppercase text-muted-foreground">Détails fiscaux</h4>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs text-muted-foreground">Type</Label>
                    <p>{info.taxType}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Exercice</Label>
                    <p>{info.taxYear}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Montant total</Label>
                    <p className="font-bold text-emerald-600">{info.amount.toLocaleString()} USD</p>
                  </div>
                  {info.nif && (
                    <div>
                      <Label className="text-xs text-muted-foreground">NIF</Label>
                      <p className="font-mono">{info.nif}</p>
                    </div>
                  )}
                  {info.baseTax > 0 && (
                    <div>
                      <Label className="text-xs text-muted-foreground">Base imposable</Label>
                      <p>{info.baseTax.toLocaleString()} USD</p>
                    </div>
                  )}
                  {info.penalties > 0 && (
                    <div>
                      <Label className="text-xs text-muted-foreground">Pénalités</Label>
                      <p className="text-destructive">{info.penalties.toLocaleString()} USD</p>
                    </div>
                  )}
                  {info.fees > 0 && (
                    <div>
                      <Label className="text-xs text-muted-foreground">Frais</Label>
                      <p>{info.fees.toLocaleString()} USD</p>
                    </div>
                  )}
                  {info.fiscalZone && (
                    <div>
                      <Label className="text-xs text-muted-foreground">Zone fiscale</Label>
                      <p>{info.fiscalZone}</p>
                    </div>
                  )}
                  {info.isExempt && (
                    <div className="col-span-2">
                      <Badge variant="outline" className="text-emerald-600 border-emerald-300">Exonéré</Badge>
                    </div>
                  )}
                </div>
                {info.exemptions?.length > 0 && (
                  <div>
                    <Label className="text-xs text-muted-foreground">Exonérations</Label>
                    {info.exemptions.map((ex: string, i: number) => (
                      <p key={i} className="text-xs">• {ex}</p>
                    ))}
                  </div>
                )}
              </div>

              {/* Location */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs text-muted-foreground">Province</Label>
                  <p>{selectedDeclaration.province || '—'}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Ville</Label>
                  <p>{selectedDeclaration.ville || '—'}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Superficie</Label>
                  <p>{selectedDeclaration.area_sqm ? `${selectedDeclaration.area_sqm.toLocaleString()} m²` : '—'}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Date soumission</Label>
                  <p>{format(new Date(selectedDeclaration.created_at), 'dd/MM/yyyy HH:mm', { locale: fr })}</p>
                </div>
              </div>

              {/* Action forms */}
              {selectedDeclaration.status === 'pending' || selectedDeclaration.status === 'returned' ? (
                <div className="space-y-3 pt-2 border-t">
                  {actionType === 'reject' && (
                    <div>
                      <Label className="text-xs">Motif de rejet *</Label>
                      <Textarea
                        value={rejectionReason}
                        onChange={e => setRejectionReason(e.target.value)}
                        placeholder="Indiquez le motif du rejet..."
                        className="mt-1 text-xs"
                        rows={3}
                      />
                    </div>
                  )}
                  {actionType === 'return' && (
                    <div>
                      <Label className="text-xs">Motif du renvoi *</Label>
                      <Textarea
                        value={returnReason}
                        onChange={e => setReturnReason(e.target.value)}
                        placeholder="Indiquez les corrections nécessaires..."
                        className="mt-1 text-xs"
                        rows={3}
                      />
                    </div>
                  )}
                </div>
              ) : null}
            </div>
          )}

          <DialogFooter className="flex-col sm:flex-row gap-2">
            {selectedDeclaration && (selectedDeclaration.status === 'pending' || selectedDeclaration.status === 'returned') && (
              <>
                {actionType === null ? (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1 text-orange-600 border-orange-300 hover:bg-orange-50"
                      onClick={() => setActionType('return')}
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                      Renvoyer
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1 text-destructive border-destructive/30 hover:bg-destructive/10"
                      onClick={() => setActionType('reject')}
                    >
                      <XCircle className="h-3.5 w-3.5" />
                      Rejeter
                    </Button>
                    <Button
                      size="sm"
                      className="gap-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                      onClick={() => setActionType('approve')}
                    >
                      <CheckCircle className="h-3.5 w-3.5" />
                      Approuver
                    </Button>
                  </>
                ) : (
                  <>
                    <Button variant="ghost" size="sm" onClick={() => setActionType(null)} disabled={processing}>
                      Annuler
                    </Button>
                    <Button
                      size="sm"
                      disabled={processing}
                      onClick={handleAction}
                      className={
                        actionType === 'approve' ? 'bg-emerald-600 hover:bg-emerald-700 text-white' :
                        actionType === 'reject' ? 'bg-destructive hover:bg-destructive/90 text-destructive-foreground' :
                        'bg-orange-600 hover:bg-orange-700 text-white'
                      }
                    >
                      {processing ? 'Traitement...' : 'Confirmer'}
                    </Button>
                  </>
                )}
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminTaxDeclarations;

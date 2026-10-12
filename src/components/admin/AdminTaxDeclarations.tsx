import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Receipt, Eye, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { usePagination } from '@/hooks/usePagination';
import { PaginationControls } from '@/components/shared/PaginationControls';
import { StatusBadge, StatusType } from '@/components/shared/StatusBadge';
import { exportToCSV } from '@/utils/csvExport';
import { useAuth } from '@/hooks/useAuth';
import {
  TaxDeclaration, TAX_TYPES, getTaxInfo, resolveTaxKey,
} from './tax-declarations/taxDeclarationTypes';
import { TaxDeclarationStats } from './tax-declarations/TaxDeclarationStats';
import { TaxDeclarationFilters } from './tax-declarations/TaxDeclarationFilters';
import { TaxDeclarationDetailDialog } from './tax-declarations/TaxDeclarationDetailDialog';
import { useAdminAnalytics } from '@/lib/adminAnalytics';

const AdminTaxDeclarations = () => {
  const { user } = useAuth();
  const { trackAdminAction } = useAdminAnalytics();
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

  const { paginatedData, currentPage, totalPages, pageSize, totalItems, hasNextPage, hasPreviousPage, goToPage, goToNextPage, goToPreviousPage, changePageSize } = usePagination(filtered);

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

      const reason = actionType === 'reject' ? rejectionReason.trim() : actionType === 'return' ? returnReason.trim() : null;
      if (actionType !== 'approve' && !reason) { toast.error('Veuillez indiquer un motif'); setProcessing(false); return; }
      // Décision, historique fiscal, audit et notification en un seul bloc serveur
      const { error } = await (supabase.rpc as any)('process_tax_declaration_decision', {
        p_id: selectedDeclaration.id, p_action: actionType, p_reason: reason,
      });
      if (error) throw new Error(error.message);
      toast.success(actionType === 'approve' ? 'Déclaration approuvée' : actionType === 'reject' ? 'Déclaration rejetée' : 'Déclaration renvoyée pour correction');

      trackAdminAction({
        module: 'tax',
        action: actionType,
        ref: { contribution_id: selectedDeclaration.id, parcel_number: selectedDeclaration.parcel_number },
        meta: { tax_year: info.taxYear },
      });
      setDialogOpen(false);
      setSelectedDeclaration(null);
      setActionType(null);
      setReturnReason('');
      setRejectionReason('');
      fetchDeclarations();
    } catch (error: any) {
      console.error('Erreur traitement:', error);
      toast.error(error?.message || 'Erreur lors du traitement');
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

  const handleExport = () => {
    const fields = ['Parcelle', 'Propriétaire', 'Type taxe', 'Exercice', 'Montant (USD)', 'NIF', 'Statut', 'Province', 'Ville', 'Date soumission'];
    const rows = filtered.map(d => {
      const info = getTaxInfo(d);
      return [
        d.parcel_number, d.current_owner_name || '', info.taxType, info.taxYear, info.amount,
        info.nif || '', d.status, d.province || '', d.ville || '',
        format(new Date(d.created_at), 'dd/MM/yyyy', { locale: fr }),
      ];
    });
    exportToCSV({ filename: 'declarations-fiscales.csv', headers: fields, data: rows });
  };

  const info = selectedDeclaration ? getTaxInfo(selectedDeclaration) : null;

  return (
    <div className="space-y-4">
      <TaxDeclarationStats {...stats} />

      <Card>
        <CardHeader className="p-3">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Receipt className="h-4 w-4" />
              Déclarations fiscales
            </CardTitle>
            <TaxDeclarationFilters
              searchTerm={searchTerm} setSearchTerm={setSearchTerm}
              filterStatus={filterStatus} setFilterStatus={setFilterStatus}
              filterTaxType={filterTaxType} setFilterTaxType={setFilterTaxType}
              onExport={handleExport} onRefresh={fetchDeclarations}
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="text-xs">
                  <TableHead className="p-2">Parcelle</TableHead>
                  <TableHead className="p-2">Type</TableHead>
                  <TableHead className="p-2">Exercice</TableHead>
                  <TableHead className="p-2 hidden sm:table-cell">Montant</TableHead>
                  <TableHead className="p-2">Statut</TableHead>
                  <TableHead className="p-2 hidden sm:table-cell">Date</TableHead>
                  <TableHead className="p-2"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
                      <Loader2 className="h-5 w-5 animate-spin mx-auto text-muted-foreground" />
                    </TableCell>
                  </TableRow>
                ) : paginatedData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-6 text-xs text-muted-foreground">
                      Aucune déclaration fiscale
                    </TableCell>
                  </TableRow>
                ) : paginatedData.map((d) => {
                  const rowInfo = getTaxInfo(d);
                  return (
                    <TableRow key={d.id} className="text-xs">
                      <TableCell className="p-2 font-mono">{d.parcel_number}</TableCell>
                      <TableCell className="p-2"><Badge variant="outline" className="text-[10px]">{rowInfo.taxType}</Badge></TableCell>
                      <TableCell className="p-2">{rowInfo.taxYear}</TableCell>
                      <TableCell className="p-2 hidden sm:table-cell">{rowInfo.amount.toLocaleString()} USD</TableCell>
                      <TableCell className="p-2"><StatusBadge status={d.status as StatusType} /></TableCell>
                      <TableCell className="p-2 hidden sm:table-cell">{format(new Date(d.created_at), 'dd/MM/yy', { locale: fr })}</TableCell>
                      <TableCell className="p-2">
                        <Button variant="ghost" size="sm" className="h-7 px-2" onClick={() => openDetail(d)}>
                          <Eye className="h-3.5 w-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
          <div className="p-3">
            <PaginationControls
              currentPage={currentPage} totalPages={totalPages} pageSize={pageSize}
              totalItems={totalItems} hasNextPage={hasNextPage} hasPreviousPage={hasPreviousPage}
              onPageChange={goToPage} onPageSizeChange={changePageSize}
              onNextPage={goToNextPage} onPreviousPage={goToPreviousPage}
            />
          </div>
        </CardContent>
      </Card>

      <TaxDeclarationDetailDialog
        open={dialogOpen} onOpenChange={setDialogOpen}
        declaration={selectedDeclaration} info={info}
        actionType={actionType} setActionType={setActionType}
        rejectionReason={rejectionReason} setRejectionReason={setRejectionReason}
        returnReason={returnReason} setReturnReason={setReturnReason}
        processing={processing} onConfirm={handleAction}
      />
    </div>
  );
};

export default AdminTaxDeclarations;

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Shield, Search, Eye, Edit, Trash, Plus, FileText, Download, Trash2, ExternalLink, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import {
  ResponsiveTable, ResponsiveTableHeader, ResponsiveTableBody,
  ResponsiveTableRow, ResponsiveTableCell, ResponsiveTableHead
} from '@/components/ui/responsive-table';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger
} from '@/components/ui/alert-dialog';
import { exportToCSV } from '@/utils/csvExport';
import { useAuditLogsPaginated, AuditLogRow } from '@/hooks/useAuditLogsPaginated';
import { Link } from 'react-router-dom';
import AuditDrillDownButton from './audit/AuditDrillDownButton';

const ACTIONS = ['INSERT', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT', 'EXPORT'];

export default function AdminAuditLogs() {
  const { logs, loading, page, pageSize, totalCount, totalPages, filters, setPage, setPageSize, setFilters } = useAuditLogsPaginated(25);
  const [selectedLog, setSelectedLog] = useState<AuditLogRow | null>(null);
  const [searchInput, setSearchInput] = useState('');
  const [purgeDays, setPurgeDays] = useState(30);
  const [purging, setPurging] = useState(false);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setFilters({ ...filters, search: searchInput || undefined });
    setPage(0);
  };

  const handlePurge = async () => {
    setPurging(true);
    try {
      const { data, error } = await (supabase as any).rpc('purge_old_audit_logs', { _days: purgeDays });
      if (error) throw error;
      toast.success(`${(data as any)?.deleted || 0} entrées supprimées`);
      setPage(0);
    } catch (e: any) {
      toast.error('Erreur purge: ' + e.message);
    } finally {
      setPurging(false);
    }
  };

  const getActionBadge = (action: string) => {
    const icon = action === 'INSERT' ? <Plus className="h-3 w-3" /> :
                 action === 'UPDATE' ? <Edit className="h-3 w-3" /> :
                 action === 'DELETE' ? <Trash className="h-3 w-3" /> : <FileText className="h-3 w-3" />;
    const variant = action === 'DELETE' ? 'destructive' : action === 'INSERT' ? 'default' : 'secondary';
    return <Badge variant={variant as any} className="gap-1 text-[10px]">{icon}{action}</Badge>;
  };

  const handleExportCSV = () => {
    exportToCSV({
      filename: `audit_logs_p${page + 1}_${format(new Date(), 'yyyy-MM-dd')}.csv`,
      headers: ['Date', 'Action', 'Table', 'ID', 'Utilisateur', 'IP'],
      data: logs.map(l => [
        format(new Date(l.created_at), 'dd/MM/yyyy HH:mm:ss'),
        l.action, l.table_name || '', l.record_id || '',
        l.user_email || l.user_id || 'System', String(l.ip_address || '')
      ])
    });
    toast.success('Export CSV téléchargé');
  };

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Total entrées</CardTitle></CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalCount.toLocaleString('fr-FR')}</div>
            <p className="text-xs text-muted-foreground">Compteur réel BD</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Page actuelle</CardTitle></CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{page + 1} / {totalPages}</div>
            <p className="text-xs text-muted-foreground">{pageSize} par page</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Maintenance</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            <div className="flex gap-2 items-center">
              <Input type="number" value={purgeDays} onChange={(e) => setPurgeDays(parseInt(e.target.value) || 30)} className="h-8 w-16" />
              <span className="text-xs">jours</span>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button size="sm" variant="destructive" disabled={purging}>
                    {purging ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Purger les anciens logs ?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Supprime tous les logs INSERT/DELETE plus vieux que {purgeDays} jours. Action irréversible.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Annuler</AlertDialogCancel>
                    <AlertDialogAction onClick={handlePurge}>Purger</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3">
            <CardTitle className="flex items-center gap-2"><Shield className="w-5 h-5" />Journal d'Audit</CardTitle>
            <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
              <form onSubmit={handleSearch} className="relative flex-1 sm:flex-initial">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Rechercher record_id/table..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  className="pl-8 w-full sm:w-56"
                />
              </form>
              <Select value={filters.action || '_all'} onValueChange={(v) => { setFilters({ ...filters, action: v === '_all' ? undefined : v }); setPage(0); }}>
                <SelectTrigger className="w-32"><SelectValue placeholder="Action" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="_all">Toutes actions</SelectItem>
                  {ACTIONS.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
                </SelectContent>
              </Select>
              <Input type="date" value={filters.date_from || ''} onChange={(e) => { setFilters({ ...filters, date_from: e.target.value || undefined }); setPage(0); }} className="w-36" />
              <Input type="date" value={filters.date_to || ''} onChange={(e) => { setFilters({ ...filters, date_to: e.target.value || undefined }); setPage(0); }} className="w-36" />
              <Button variant="outline" size="sm" onClick={handleExportCSV}>
                <Download className="h-4 w-4 mr-1" /> CSV
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
          ) : (
            <ResponsiveTable>
              <ResponsiveTableHeader>
                <ResponsiveTableRow>
                  <ResponsiveTableHead priority="low">Date</ResponsiveTableHead>
                  <ResponsiveTableHead priority="high">Action</ResponsiveTableHead>
                  <ResponsiveTableHead priority="medium">Table</ResponsiveTableHead>
                  <ResponsiveTableHead priority="low">Record ID</ResponsiveTableHead>
                  <ResponsiveTableHead priority="medium">Utilisateur</ResponsiveTableHead>
                  <ResponsiveTableHead priority="high">Détails</ResponsiveTableHead>
                </ResponsiveTableRow>
              </ResponsiveTableHeader>
              <ResponsiveTableBody>
                {logs.length === 0 ? (
                  <ResponsiveTableRow>
                    <ResponsiveTableCell priority="high" label="" colSpan={6}>
                      <div className="text-center py-8 text-muted-foreground">Aucun log trouvé</div>
                    </ResponsiveTableCell>
                  </ResponsiveTableRow>
                ) : logs.map(log => (
                  <ResponsiveTableRow key={log.id}>
                    <ResponsiveTableCell priority="low" label="Date">
                      <span className="text-xs">{format(new Date(log.created_at), 'dd/MM/yy HH:mm:ss', { locale: fr })}</span>
                    </ResponsiveTableCell>
                    <ResponsiveTableCell priority="high" label="Action">{getActionBadge(log.action)}</ResponsiveTableCell>
                    <ResponsiveTableCell priority="medium" label="Table">
                      <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{log.table_name}</code>
                    </ResponsiveTableCell>
                    <ResponsiveTableCell priority="low" label="ID">
                      <code className="text-[10px] text-muted-foreground">{log.record_id?.substring(0, 12)}...</code>
                    </ResponsiveTableCell>
                    <ResponsiveTableCell priority="medium" label="User">
                      <span className="text-xs">{log.user_email || (log.user_id ? log.user_id.substring(0, 8) + '...' : 'System')}</span>
                    </ResponsiveTableCell>
                    <ResponsiveTableCell priority="high" label="Détails">
                      <div className="flex items-center gap-1">
                        <AuditDrillDownButton tableName={log.table_name} recordId={log.record_id} />
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="ghost" size="sm" onClick={() => setSelectedLog(log)}>
                              <Eye className="h-4 w-4" />
                            </Button>
                          </DialogTrigger>
                        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                          <DialogHeader><DialogTitle>Détails du log</DialogTitle></DialogHeader>
                          <div className="space-y-3 text-sm">
                            <div className="grid grid-cols-2 gap-3">
                              <div><p className="text-xs text-muted-foreground">Action</p><p className="font-medium">{log.action}</p></div>
                              <div><p className="text-xs text-muted-foreground">Table</p><p className="font-mono text-xs">{log.table_name}</p></div>
                              <div><p className="text-xs text-muted-foreground">Date</p><p className="text-xs">{format(new Date(log.created_at), 'PPP HH:mm:ss', { locale: fr })}</p></div>
                              <div><p className="text-xs text-muted-foreground">Utilisateur</p><p className="text-xs">{log.user_email || log.user_id || 'System'}</p></div>
                            </div>
                            {log.record_id && (
                              <div className="flex items-center gap-2 p-2 bg-muted/50 rounded">
                                <code className="text-xs flex-1">{log.record_id}</code>
                                <Button asChild size="sm" variant="ghost">
                                  <Link to={`/admin?tab=audit-logs&search=${log.record_id}`}>
                                    <ExternalLink className="h-3 w-3" />
                                  </Link>
                                </Button>
                              </div>
                            )}
                            {log.old_values && (
                              <div>
                                <p className="text-xs text-muted-foreground mb-1">Anciennes valeurs</p>
                                <pre className="text-[10px] bg-muted p-2 rounded overflow-auto max-h-40">{JSON.stringify(log.old_values, null, 2)}</pre>
                              </div>
                            )}
                            {log.new_values && (
                              <div>
                                <p className="text-xs text-muted-foreground mb-1">Nouvelles valeurs</p>
                                <pre className="text-[10px] bg-muted p-2 rounded overflow-auto max-h-40">{JSON.stringify(log.new_values, null, 2)}</pre>
                              </div>
                            )}
                          </div>
                        </DialogContent>
                      </Dialog>
                      </div>
                    </ResponsiveTableCell>
                  </ResponsiveTableRow>
                ))}
              </ResponsiveTableBody>
            </ResponsiveTable>
          )}

          {/* Server pagination controls */}
          <div className="flex items-center justify-between mt-4 gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              <Select value={String(pageSize)} onValueChange={(v) => { setPageSize(parseInt(v)); setPage(0); }}>
                <SelectTrigger className="w-24 h-8"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {[25, 50, 100, 200].map(n => <SelectItem key={n} value={String(n)}>{n}/page</SelectItem>)}
                </SelectContent>
              </Select>
              <span className="text-xs text-muted-foreground">{totalCount.toLocaleString('fr-FR')} total</span>
            </div>
            <div className="flex items-center gap-1">
              <Button variant="outline" size="sm" onClick={() => setPage(0)} disabled={page === 0}>«</Button>
              <Button variant="outline" size="sm" onClick={() => setPage(Math.max(0, page - 1))} disabled={page === 0}>‹</Button>
              <span className="text-xs px-2">{page + 1} / {totalPages}</span>
              <Button variant="outline" size="sm" onClick={() => setPage(Math.min(totalPages - 1, page + 1))} disabled={page >= totalPages - 1}>›</Button>
              <Button variant="outline" size="sm" onClick={() => setPage(totalPages - 1)} disabled={page >= totalPages - 1}>»</Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

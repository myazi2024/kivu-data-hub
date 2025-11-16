import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { 
  Shield, 
  Search, 
  Filter,
  Eye,
  AlertCircle,
  CheckCircle,
  Edit,
  Trash,
  Plus,
  FileText
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ResponsiveTable } from '@/components/ui/responsive-table';

interface AuditLog {
  id: string;
  user_id: string | null;
  action: string;
  table_name: string | null;
  record_id: string | null;
  old_values: any;
  new_values: any;
  ip_address: unknown;
  user_agent: string | null;
  created_at: string;
}

export default function AdminAuditLogs() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [actionFilter, setActionFilter] = useState('all');
  const [tableFilter, setTableFilter] = useState('all');
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(500);

      if (error) throw error;
      setLogs(data || []);
    } catch (error: any) {
      console.error('Erreur:', error);
      toast.error('Erreur lors du chargement des logs');
    } finally {
      setLoading(false);
    }
  };

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'INSERT': return <Plus className="h-4 w-4 text-success" />;
      case 'UPDATE': return <Edit className="h-4 w-4 text-warning" />;
      case 'DELETE': return <Trash className="h-4 w-4 text-destructive" />;
      default: return <FileText className="h-4 w-4" />;
    }
  };

  const getActionBadge = (action: string) => {
    const variants: Record<string, any> = {
      'INSERT': 'default',
      'UPDATE': 'secondary',
      'DELETE': 'destructive',
    };
    return (
      <Badge variant={variants[action] || 'outline'} className="gap-1">
        {getActionIcon(action)}
        {action}
      </Badge>
    );
  };

  const filteredLogs = logs.filter(log => {
    const matchesSearch = !searchQuery || 
      log.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.table_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.record_id?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesAction = actionFilter === 'all' || log.action === actionFilter;
    const matchesTable = tableFilter === 'all' || log.table_name === tableFilter;
    
    return matchesSearch && matchesAction && matchesTable;
  });

  const uniqueTables = Array.from(new Set(logs.map(l => l.table_name).filter(Boolean)));
  const uniqueActions = Array.from(new Set(logs.map(l => l.action)));

  if (loading) {
    return <div className="flex items-center justify-center h-64">Chargement...</div>;
  }

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total d'actions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{logs.length}</div>
            <p className="text-xs text-muted-foreground mt-1">Dernières 500 actions</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Tables affectées
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{uniqueTables.length}</div>
            <p className="text-xs text-muted-foreground mt-1">Tables différentes</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Types d'actions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{uniqueActions.length}</div>
            <p className="text-xs text-muted-foreground mt-1">Actions différentes</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Card */}
      <Card>
        <CardHeader>
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5" />
              Journal d'Audit
            </CardTitle>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full lg:w-auto">
              <div className="relative flex-1 sm:flex-initial">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Rechercher..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 w-full sm:w-48"
                />
              </div>
              <Select value={actionFilter} onValueChange={setActionFilter}>
                <SelectTrigger className="w-full sm:w-32">
                  <SelectValue placeholder="Action" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toutes</SelectItem>
                  {uniqueActions.map(action => (
                    <SelectItem key={action} value={action}>{action}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={tableFilter} onValueChange={setTableFilter}>
                <SelectTrigger className="w-full sm:w-40">
                  <SelectValue placeholder="Table" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toutes les tables</SelectItem>
                  {uniqueTables.map(table => (
                    <SelectItem key={table} value={table!}>{table}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <ResponsiveTable>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="hidden lg:table-cell">Date/Heure</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead className="hidden md:table-cell">Table</TableHead>
                  <TableHead className="hidden xl:table-cell">ID Enregistrement</TableHead>
                  <TableHead className="hidden lg:table-cell">Utilisateur</TableHead>
                  <TableHead>Détails</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLogs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      Aucun log trouvé
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredLogs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="hidden lg:table-cell text-sm">
                        {format(new Date(log.created_at), 'dd/MM/yyyy HH:mm:ss', { locale: fr })}
                      </TableCell>
                      <TableCell>{getActionBadge(log.action)}</TableCell>
                      <TableCell className="hidden md:table-cell">
                        <code className="text-xs bg-muted px-2 py-1 rounded">{log.table_name}</code>
                      </TableCell>
                      <TableCell className="hidden xl:table-cell">
                        <code className="text-xs text-muted-foreground">
                          {log.record_id?.substring(0, 8)}...
                        </code>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        <code className="text-xs text-muted-foreground">
                          {log.user_id ? log.user_id.substring(0, 8) + '...' : 'System'}
                        </code>
                      </TableCell>
                      <TableCell>
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => setSelectedLog(log)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                            <DialogHeader>
                              <DialogTitle>Détails du log</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4">
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <p className="text-sm text-muted-foreground">Action</p>
                                  <p className="font-medium">{log.action}</p>
                                </div>
                                <div>
                                  <p className="text-sm text-muted-foreground">Table</p>
                                  <p className="font-medium">{log.table_name}</p>
                                </div>
                                <div>
                                  <p className="text-sm text-muted-foreground">Date/Heure</p>
                                  <p className="font-medium text-sm">
                                    {format(new Date(log.created_at), 'PPP à HH:mm:ss', { locale: fr })}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-sm text-muted-foreground">ID Utilisateur</p>
                                  <code className="text-xs">{log.user_id || 'System'}</code>
                                </div>
                              </div>
                              
                              {log.ip_address && (
                                <div>
                                  <p className="text-sm text-muted-foreground">Adresse IP</p>
                                  <code className="text-xs">{String(log.ip_address)}</code>
                                </div>
                              )}

                              {log.old_values && (
                                <div>
                                  <p className="text-sm text-muted-foreground mb-2">Anciennes valeurs</p>
                                  <pre className="text-xs bg-muted p-3 rounded overflow-auto max-h-40">
                                    {JSON.stringify(log.old_values, null, 2)}
                                  </pre>
                                </div>
                              )}

                              {log.new_values && (
                                <div>
                                  <p className="text-sm text-muted-foreground mb-2">Nouvelles valeurs</p>
                                  <pre className="text-xs bg-muted p-3 rounded overflow-auto max-h-40">
                                    {JSON.stringify(log.new_values, null, 2)}
                                  </pre>
                                </div>
                              )}

                              {log.user_agent && (
                                <div>
                                  <p className="text-sm text-muted-foreground">User Agent</p>
                                  <p className="text-xs text-muted-foreground break-all">{log.user_agent}</p>
                                </div>
                              )}
                            </div>
                          </DialogContent>
                        </Dialog>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </ResponsiveTable>
        </CardContent>
      </Card>
    </div>
  );
}

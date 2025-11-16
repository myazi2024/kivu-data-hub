import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { 
  Gift, 
  Search, 
  Download, 
  AlertCircle, 
  CheckCircle, 
  XCircle,
  Eye,
  Ban,
  TrendingUp,
  DollarSign,
  Calendar
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { ResponsiveTable } from '@/components/ui/responsive-table';

interface CCCCode {
  id: string;
  code: string;
  user_id: string;
  contribution_id: string;
  parcel_number: string;
  value_usd: number;
  is_used: boolean;
  is_valid: boolean;
  used_at: string | null;
  expires_at: string;
  created_at: string;
  invalidated_at: string | null;
  invalidation_reason: string | null;
  invoice_id: string | null;
}

interface CodeStats {
  total: number;
  valid: number;
  used: number;
  expired: number;
  invalidated: number;
  total_value: number;
  used_value: number;
}

export default function AdminCCCCodes() {
  const [codes, setCodes] = useState<CCCCode[]>([]);
  const [stats, setStats] = useState<CodeStats>({
    total: 0,
    valid: 0,
    used: 0,
    expired: 0,
    invalidated: 0,
    total_value: 0,
    used_value: 0
  });
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCode, setSelectedCode] = useState<CCCCode | null>(null);
  const [showInvalidateDialog, setShowInvalidateDialog] = useState(false);
  const [invalidationReason, setInvalidationReason] = useState('');

  useEffect(() => {
    fetchCodes();
  }, []);

  const fetchCodes = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('cadastral_contributor_codes')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      setCodes(data || []);
      calculateStats(data || []);
    } catch (error: any) {
      console.error('Erreur:', error);
      toast.error('Erreur lors du chargement des codes');
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (codesData: CCCCode[]) => {
    const now = new Date();
    const stats: CodeStats = {
      total: codesData.length,
      valid: codesData.filter(c => c.is_valid && !c.is_used && new Date(c.expires_at) > now).length,
      used: codesData.filter(c => c.is_used).length,
      expired: codesData.filter(c => !c.is_used && new Date(c.expires_at) <= now).length,
      invalidated: codesData.filter(c => !c.is_valid).length,
      total_value: codesData.reduce((sum, c) => sum + c.value_usd, 0),
      used_value: codesData.filter(c => c.is_used).reduce((sum, c) => sum + c.value_usd, 0)
    };
    setStats(stats);
  };

  const handleInvalidateCode = async () => {
    if (!selectedCode || !invalidationReason.trim()) {
      toast.error('Veuillez fournir une raison');
      return;
    }

    try {
      const { error } = await supabase
        .from('cadastral_contributor_codes')
        .update({
          is_valid: false,
          invalidated_at: new Date().toISOString(),
          invalidation_reason: invalidationReason
        })
        .eq('id', selectedCode.id);

      if (error) throw error;

      toast.success('Code invalidé avec succès');
      setShowInvalidateDialog(false);
      setInvalidationReason('');
      setSelectedCode(null);
      fetchCodes();
    } catch (error: any) {
      console.error('Erreur:', error);
      toast.error('Erreur lors de l\'invalidation');
    }
  };

  const exportCodes = () => {
    const csv = [
      ['Code', 'Parcelle', 'Valeur USD', 'Utilisé', 'Valide', 'Date création', 'Expire le'].join(','),
      ...filteredCodes.map(c => [
        c.code,
        c.parcel_number,
        c.value_usd,
        c.is_used ? 'Oui' : 'Non',
        c.is_valid ? 'Oui' : 'Non',
        format(new Date(c.created_at), 'dd/MM/yyyy', { locale: fr }),
        format(new Date(c.expires_at), 'dd/MM/yyyy', { locale: fr })
      ].join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `codes-ccc-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
  };

  const getStatusBadge = (code: CCCCode) => {
    const now = new Date();
    const isExpired = new Date(code.expires_at) <= now;

    if (!code.is_valid) {
      return <Badge variant="destructive" className="gap-1"><Ban className="h-3 w-3" />Invalidé</Badge>;
    }
    if (code.is_used) {
      return <Badge variant="secondary" className="gap-1"><CheckCircle className="h-3 w-3" />Utilisé</Badge>;
    }
    if (isExpired) {
      return <Badge variant="outline" className="gap-1"><XCircle className="h-3 w-3" />Expiré</Badge>;
    }
    return <Badge variant="default" className="gap-1"><Gift className="h-3 w-3" />Valide</Badge>;
  };

  const filteredCodes = codes.filter(code =>
    code.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
    code.parcel_number.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return <div className="flex items-center justify-center h-64">Chargement...</div>;
  }

  return (
    <div className="space-y-4">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Gift className="h-4 w-4" />
              Total Codes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats.valid} valides disponibles
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Valeur Totale
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${stats.total_value.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              ${stats.used_value.toFixed(2)} utilisés
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Taux d'utilisation
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.total > 0 ? ((stats.used / stats.total) * 100).toFixed(1) : 0}%
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats.used}/{stats.total} codes
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              Codes expirés
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.expired}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats.invalidated} invalidés
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Table Card */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <CardTitle className="flex items-center gap-2">
              <Gift className="w-5 h-5" />
              Gestion des Codes CCC
            </CardTitle>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
              <div className="relative flex-1 sm:flex-initial">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Rechercher..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 w-full sm:w-64"
                />
              </div>
              <Button onClick={exportCodes} variant="outline" size="sm" className="gap-2">
                <Download className="h-4 w-4" />
                <span className="hidden sm:inline">Exporter</span>
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <ResponsiveTable>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead className="hidden md:table-cell">Parcelle</TableHead>
                  <TableHead>Valeur</TableHead>
                  <TableHead className="hidden lg:table-cell">Créé le</TableHead>
                  <TableHead className="hidden lg:table-cell">Expire le</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCodes.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      Aucun code trouvé
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredCodes.map((code) => (
                    <TableRow key={code.id}>
                      <TableCell className="font-mono font-semibold">{code.code}</TableCell>
                      <TableCell className="hidden md:table-cell">{code.parcel_number}</TableCell>
                      <TableCell className="font-semibold">${code.value_usd.toFixed(2)}</TableCell>
                      <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                        {format(new Date(code.created_at), 'dd/MM/yyyy', { locale: fr })}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                        {format(new Date(code.expires_at), 'dd/MM/yyyy', { locale: fr })}
                      </TableCell>
                      <TableCell>{getStatusBadge(code)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <Eye className="h-4 w-4" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Détails du code {code.code}</DialogTitle>
                              </DialogHeader>
                              <div className="space-y-3">
                                <div>
                                  <Label className="text-muted-foreground">Parcelle</Label>
                                  <p className="font-medium">{code.parcel_number}</p>
                                </div>
                                <div>
                                  <Label className="text-muted-foreground">Valeur</Label>
                                  <p className="font-medium">${code.value_usd.toFixed(2)}</p>
                                </div>
                                <div>
                                  <Label className="text-muted-foreground">Date de création</Label>
                                  <p className="font-medium">
                                    {format(new Date(code.created_at), 'PPP à HH:mm', { locale: fr })}
                                  </p>
                                </div>
                                <div>
                                  <Label className="text-muted-foreground">Date d'expiration</Label>
                                  <p className="font-medium">
                                    {format(new Date(code.expires_at), 'PPP à HH:mm', { locale: fr })}
                                  </p>
                                </div>
                                {code.is_used && (
                                  <div>
                                    <Label className="text-muted-foreground">Utilisé le</Label>
                                    <p className="font-medium">
                                      {code.used_at && format(new Date(code.used_at), 'PPP à HH:mm', { locale: fr })}
                                    </p>
                                  </div>
                                )}
                                {!code.is_valid && code.invalidation_reason && (
                                  <div>
                                    <Label className="text-muted-foreground">Raison d'invalidation</Label>
                                    <p className="font-medium text-destructive">{code.invalidation_reason}</p>
                                  </div>
                                )}
                              </div>
                            </DialogContent>
                          </Dialog>
                          
                          {code.is_valid && !code.is_used && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedCode(code);
                                setShowInvalidateDialog(true);
                              }}
                            >
                              <Ban className="h-4 w-4 text-destructive" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </ResponsiveTable>
        </CardContent>
      </Card>

      {/* Invalidate Dialog */}
      <Dialog open={showInvalidateDialog} onOpenChange={setShowInvalidateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invalider le code {selectedCode?.code}</DialogTitle>
            <DialogDescription>
              Cette action rendra le code inutilisable. Veuillez fournir une raison.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Raison d'invalidation *</Label>
              <Textarea
                value={invalidationReason}
                onChange={(e) => setInvalidationReason(e.target.value)}
                placeholder="Ex: Code frauduleux, erreur de système..."
                rows={3}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowInvalidateDialog(false)}>
                Annuler
              </Button>
              <Button variant="destructive" onClick={handleInvalidateCode}>
                Invalider
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

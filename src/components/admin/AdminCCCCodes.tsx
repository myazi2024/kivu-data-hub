import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Gift, Eye, Ban, TrendingUp, DollarSign, AlertCircle, Search, Download } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { StatusBadge } from '@/components/shared/StatusBadge';

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
    } catch (error: any) {
      console.error('Erreur:', error);
      toast.error('Erreur lors du chargement des codes');
    } finally {
      setLoading(false);
    }
  };

  const stats = React.useMemo(() => {
    const now = new Date();
    return {
      total: codes.length,
      valid: codes.filter(c => c.is_valid && !c.is_used && new Date(c.expires_at) > now).length,
      used: codes.filter(c => c.is_used).length,
      expired: codes.filter(c => !c.is_used && new Date(c.expires_at) <= now).length,
      invalidated: codes.filter(c => !c.is_valid).length,
      total_value: codes.reduce((sum, c) => sum + c.value_usd, 0),
      used_value: codes.filter(c => c.is_used).reduce((sum, c) => sum + c.value_usd, 0)
    };
  }, [codes]);

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

  const getCodeStatus = (code: CCCCode): 'valid' | 'used' | 'expired' | 'invalidated' => {
    const now = new Date();
    const isExpired = new Date(code.expires_at) <= now;
    
    if (!code.is_valid) return 'invalidated';
    if (code.is_used) return 'used';
    if (isExpired) return 'expired';
    return 'valid';
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
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
        <Card>
          <CardHeader className="p-3 sm:pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground flex items-center gap-1">
              <Gift className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">Total Codes</span>
              <span className="sm:hidden">Total</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3">
            <div className="text-lg sm:text-2xl font-bold">{stats.total}</div>
            <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5 sm:mt-1">
              {stats.valid} valides
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="p-3 sm:pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground flex items-center gap-1">
              <DollarSign className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">Valeur Totale</span>
              <span className="sm:hidden">Valeur</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3">
            <div className="text-lg sm:text-2xl font-bold">${stats.total_value.toFixed(0)}</div>
            <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5 sm:mt-1">
              ${stats.used_value.toFixed(0)} utilisés
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="p-3 sm:pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground flex items-center gap-1">
              <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">Taux d'utilisation</span>
              <span className="sm:hidden">Taux</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3">
            <div className="text-lg sm:text-2xl font-bold">
              {stats.total > 0 ? ((stats.used / stats.total) * 100).toFixed(1) : 0}%
            </div>
            <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5 sm:mt-1 truncate">
              {stats.used}/{stats.total}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="p-3 sm:pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground flex items-center gap-1">
              <AlertCircle className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">Codes expirés</span>
              <span className="sm:hidden">Expirés</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3">
            <div className="text-lg sm:text-2xl font-bold">{stats.expired}</div>
            <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5 sm:mt-1">
              {stats.invalidated} inv.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Table Card */}
      <Card>
        <CardHeader className="p-3 sm:p-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-4">
            <CardTitle className="text-base sm:text-lg flex items-center gap-2">
              <Gift className="w-4 h-4 sm:w-5 sm:h-5" />
              Codes CCC
            </CardTitle>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
              <div className="relative flex-1 sm:flex-initial">
                <Search className="absolute left-2 top-2 h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
                <Input
                  placeholder="Rechercher..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-7 sm:pl-8 h-8 sm:h-9 text-xs sm:text-sm w-full sm:w-48"
                />
              </div>
              <Button onClick={exportCodes} variant="outline" size="sm" className="gap-1 h-8 text-xs">
                <Download className="h-3 w-3" />
                <span className="hidden sm:inline">Exporter</span>
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0 sm:p-6">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="text-xs">
                  <TableHead className="w-[100px] p-2">Code</TableHead>
                  <TableHead className="hidden sm:table-cell p-2">Parcelle</TableHead>
                  <TableHead className="p-2">Valeur</TableHead>
                  <TableHead className="hidden md:table-cell p-2">Créé</TableHead>
                  <TableHead className="hidden lg:table-cell p-2">Expire</TableHead>
                  <TableHead className="p-2">Statut</TableHead>
                  <TableHead className="p-2 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCodes.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-6 text-xs text-muted-foreground">
                      Aucun code trouvé
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredCodes.map((code) => (
                    <TableRow key={code.id} className="text-xs">
                      <TableCell className="font-mono font-semibold p-2">{code.code}</TableCell>
                      <TableCell className="hidden sm:table-cell p-2 text-xs">{code.parcel_number}</TableCell>
                      <TableCell className="font-semibold p-2">${code.value_usd.toFixed(0)}</TableCell>
                      <TableCell className="hidden md:table-cell p-2 text-xs text-muted-foreground">
                        {format(new Date(code.created_at), 'dd/MM', { locale: fr })}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell p-2 text-xs text-muted-foreground">
                        {format(new Date(code.expires_at), 'dd/MM', { locale: fr })}
                      </TableCell>
                      <TableCell className="p-2">
                        <StatusBadge status={getCodeStatus(code)} compact />
                      </TableCell>
                      <TableCell className="p-2">
                        <div className="flex items-center justify-end gap-1">
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                                <Eye className="h-3 w-3" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-[95vw] sm:max-w-md">
                              <DialogHeader>
                                <DialogTitle className="text-sm sm:text-base">Détails {code.code}</DialogTitle>
                              </DialogHeader>
                              <div className="space-y-2 sm:space-y-3">
                                <div>
                                  <Label className="text-xs text-muted-foreground">Parcelle</Label>
                                  <p className="text-sm font-medium">{code.parcel_number}</p>
                                </div>
                                <div>
                                  <Label className="text-xs text-muted-foreground">Valeur</Label>
                                  <p className="text-sm font-medium">${code.value_usd.toFixed(2)}</p>
                                </div>
                                <div>
                                  <Label className="text-xs text-muted-foreground">Date de création</Label>
                                  <p className="text-sm font-medium">
                                    {format(new Date(code.created_at), 'dd/MM/yyyy', { locale: fr })}
                                  </p>
                                </div>
                                <div>
                                  <Label className="text-xs text-muted-foreground">Date d'expiration</Label>
                                  <p className="text-sm font-medium">
                                    {format(new Date(code.expires_at), 'dd/MM/yyyy', { locale: fr })}
                                  </p>
                                </div>
                                {code.is_used && (
                                  <div>
                                    <Label className="text-xs text-muted-foreground">Utilisé le</Label>
                                    <p className="text-sm font-medium">
                                      {code.used_at && format(new Date(code.used_at), 'dd/MM/yyyy', { locale: fr })}
                                    </p>
                                  </div>
                                )}
                                {!code.is_valid && code.invalidation_reason && (
                                  <div>
                                    <Label className="text-xs text-muted-foreground">Raison d'invalidation</Label>
                                    <p className="text-sm font-medium text-destructive">{code.invalidation_reason}</p>
                                  </div>
                                )}
                              </div>
                            </DialogContent>
                          </Dialog>
                          
                          {code.is_valid && !code.is_used && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0"
                              onClick={() => {
                                setSelectedCode(code);
                                setShowInvalidateDialog(true);
                              }}
                            >
                              <Ban className="h-3 w-3 text-destructive" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
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

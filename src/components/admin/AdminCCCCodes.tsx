import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Tag, X, Search, DollarSign } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface CCCCode {
  id: string;
  code: string;
  user_id: string;
  parcel_number: string;
  value_usd: number;
  is_used: boolean;
  used_at?: string;
  is_valid: boolean;
  expires_at: string;
  invalidated_at?: string;
  invalidation_reason?: string;
  created_at: string;
  profiles?: {
    full_name?: string;
    email: string;
  };
}

const AdminCCCCodes = () => {
  const [codes, setCodes] = useState<CCCCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCode, setSelectedCode] = useState<CCCCode | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [invalidationReason, setInvalidationReason] = useState('');
  const { toast } = useToast();

  const fetchCodes = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('cadastral_contributor_codes')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Récupérer les profils des utilisateurs
      if (data && data.length > 0) {
        const userIds = [...new Set(data.map(code => code.user_id))];
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, full_name, email')
          .in('user_id', userIds);

        const profilesMap = new Map(profiles?.map(p => [p.user_id, p]) || []);
        const codesWithProfiles = data.map(code => ({
          ...code,
          profiles: profilesMap.get(code.user_id)
        }));
        setCodes(codesWithProfiles as any);
      } else {
        setCodes([]);
      }
    } catch (error) {
      console.error('Erreur lors du chargement des codes CCC:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les codes CCC",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCodes();
  }, []);

  const handleInvalidate = async (codeId: string) => {
    if (!invalidationReason.trim()) {
      toast({
        title: "Erreur",
        description: "Veuillez fournir une raison d'invalidation",
        variant: "destructive",
      });
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
        .eq('id', codeId);

      if (error) throw error;

      toast({
        title: "Succès",
        description: "Code CCC invalidé",
      });

      setIsDialogOpen(false);
      setInvalidationReason('');
      fetchCodes();
    } catch (error) {
      console.error('Erreur lors de l\'invalidation:', error);
      toast({
        title: "Erreur",
        description: "Impossible d'invalider le code",
        variant: "destructive",
      });
    }
  };

  const getStatusBadge = (code: CCCCode) => {
    if (!code.is_valid) {
      return <Badge variant="destructive">Invalidé</Badge>;
    }
    if (code.is_used) {
      return <Badge variant="secondary">Utilisé</Badge>;
    }
    if (new Date(code.expires_at) < new Date()) {
      return <Badge variant="outline">Expiré</Badge>;
    }
    return <Badge variant="default" className="bg-green-600">Valide</Badge>;
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(value);
  };

  const filteredCodes = codes.filter(code => {
    if (filterStatus === 'valid' && (!code.is_valid || code.is_used || new Date(code.expires_at) < new Date())) return false;
    if (filterStatus === 'used' && !code.is_used) return false;
    if (filterStatus === 'invalid' && code.is_valid) return false;
    if (searchQuery && !(
      code.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      code.parcel_number.toLowerCase().includes(searchQuery.toLowerCase())
    )) return false;
    return true;
  });

  const totalValue = codes.reduce((sum, code) => code.is_valid && !code.is_used ? sum + code.value_usd : sum, 0);
  const usedValue = codes.reduce((sum, code) => code.is_used ? sum + code.value_usd : sum, 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Statistiques */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Codes générés</p>
                <p className="text-2xl font-bold">{codes.length}</p>
              </div>
              <Tag className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Valeur disponible</p>
                <p className="text-2xl font-bold text-green-600">{formatCurrency(totalValue)}</p>
              </div>
              <DollarSign className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Codes utilisés</p>
                <p className="text-2xl font-bold">{codes.filter(c => c.is_used).length}</p>
              </div>
              <Tag className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Valeur utilisée</p>
                <p className="text-2xl font-bold">{formatCurrency(usedValue)}</p>
              </div>
              <DollarSign className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Codes Contributeur (CCC)</CardTitle>
            <div className="flex gap-2">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Code ou parcelle..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 w-[200px]"
                />
              </div>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filtrer par statut" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous</SelectItem>
                  <SelectItem value="valid">Valides</SelectItem>
                  <SelectItem value="used">Utilisés</SelectItem>
                  <SelectItem value="invalid">Invalidés</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code CCC</TableHead>
                <TableHead>Bénéficiaire</TableHead>
                <TableHead>N° Parcelle</TableHead>
                <TableHead className="text-right">Valeur</TableHead>
                <TableHead>Expiration</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Date création</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCodes.map((code) => (
                <TableRow key={code.id}>
                  <TableCell className="font-mono font-bold text-primary">{code.code}</TableCell>
                  <TableCell>
                    <div>
                      <div className="font-medium">{(code.profiles as any)?.full_name || 'N/A'}</div>
                      <div className="text-xs text-muted-foreground">{(code.profiles as any)?.email}</div>
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-sm">{code.parcel_number}</TableCell>
                  <TableCell className="text-right font-bold text-green-600">
                    {formatCurrency(code.value_usd)}
                  </TableCell>
                  <TableCell className="text-sm">
                    {format(new Date(code.expires_at), 'dd/MM/yyyy', { locale: fr })}
                  </TableCell>
                  <TableCell>{getStatusBadge(code)}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {format(new Date(code.created_at), 'dd MMM yyyy', { locale: fr })}
                  </TableCell>
                  <TableCell className="text-right">
                    {code.is_valid && !code.is_used && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectedCode(code);
                          setIsDialogOpen(true);
                        }}
                        className="text-red-600 hover:text-red-700"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {filteredCodes.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              Aucun code CCC trouvé
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invalider le code CCC</DialogTitle>
          </DialogHeader>
          
          {selectedCode && (
            <div className="space-y-4">
              <div className="p-4 bg-muted rounded-md">
                <div className="font-mono font-bold text-lg">{selectedCode.code}</div>
                <div className="text-sm text-muted-foreground mt-1">
                  Valeur: {formatCurrency(selectedCode.value_usd)}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Raison de l'invalidation</label>
                <Textarea
                  value={invalidationReason}
                  onChange={(e) => setInvalidationReason(e.target.value)}
                  placeholder="Expliquez pourquoi ce code doit être invalidé..."
                  rows={3}
                />
              </div>

              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Annuler
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => handleInvalidate(selectedCode.id)}
                >
                  <X className="h-4 w-4 mr-2" />
                  Invalider
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminCCCCodes;

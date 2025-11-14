import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { Gift, Copy, CheckCircle, XCircle, Clock, DollarSign } from 'lucide-react';

interface CCCCode {
  id: string;
  code: string;
  parcel_number: string;
  value_usd: number;
  is_used: boolean;
  is_valid: boolean;
  used_at: string | null;
  expires_at: string;
  created_at: string;
  invalidation_reason: string | null;
}

export const UserCCCCodes: React.FC = () => {
  const { user } = useAuth();
  const [codes, setCodes] = useState<CCCCode[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchCodes();
    }
  }, [user]);

  const fetchCodes = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('cadastral_contributor_codes')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCodes(data || []);
    } catch (error: any) {
      toast.error('Erreur lors du chargement des codes');
      console.error('Error fetching codes:', error);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success('Code copié dans le presse-papier');
  };

  const getStatusBadge = (code: CCCCode) => {
    if (!code.is_valid) {
      return <Badge variant="destructive" className="flex items-center gap-1">
        <XCircle className="h-3 w-3" />
        Invalide
      </Badge>;
    }
    
    if (code.is_used) {
      return <Badge variant="secondary" className="flex items-center gap-1">
        <CheckCircle className="h-3 w-3" />
        Utilisé
      </Badge>;
    }

    const expiresAt = new Date(code.expires_at);
    const now = new Date();
    
    if (expiresAt < now) {
      return <Badge variant="destructive" className="flex items-center gap-1">
        <Clock className="h-3 w-3" />
        Expiré
      </Badge>;
    }

    return <Badge variant="default" className="bg-green-500 flex items-center gap-1">
      <Gift className="h-3 w-3" />
      Disponible
    </Badge>;
  };

  const getStats = () => {
    const now = new Date();
    return {
      total: codes.length,
      available: codes.filter(c => c.is_valid && !c.is_used && new Date(c.expires_at) > now).length,
      used: codes.filter(c => c.is_used).length,
      totalValue: codes.filter(c => c.is_valid && !c.is_used && new Date(c.expires_at) > now)
        .reduce((sum, c) => sum + Number(c.value_usd), 0),
    };
  };

  const stats = getStats();

  if (loading) {
    return (
      <Card>
        <CardContent className="p-8">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-4 mb-3 md:mb-6">
        <Card>
          <CardHeader className="pb-1 md:pb-3 pt-2 md:pt-6">
            <CardTitle className="text-[10px] md:text-sm font-medium">Total codes</CardTitle>
          </CardHeader>
          <CardContent className="pb-2 md:pb-3">
            <div className="text-lg md:text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-1 md:pb-3 pt-2 md:pt-6">
            <CardTitle className="text-[10px] md:text-sm font-medium">Disponibles</CardTitle>
          </CardHeader>
          <CardContent className="pb-2 md:pb-3">
            <div className="text-lg md:text-2xl font-bold text-green-600">{stats.available}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-1 md:pb-3 pt-2 md:pt-6">
            <CardTitle className="text-[10px] md:text-sm font-medium">Utilisés</CardTitle>
          </CardHeader>
          <CardContent className="pb-2 md:pb-3">
            <div className="text-lg md:text-2xl font-bold text-blue-600">{stats.used}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-1 md:pb-3 pt-2 md:pt-6">
            <CardTitle className="text-[10px] md:text-sm font-medium">Valeur totale</CardTitle>
          </CardHeader>
          <CardContent className="pb-2 md:pb-3">
            <div className="text-lg md:text-2xl font-bold flex items-center gap-0.5">
              <DollarSign className="h-3 w-3 md:h-5 md:w-5" />
              <span className="text-sm md:text-2xl">{stats.totalValue.toFixed(2)}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3 md:pb-6">
          <CardTitle className="flex items-center gap-2 text-sm md:text-base">
            <Gift className="h-4 w-4 md:h-5 md:w-5" />
            Mes codes CCC
          </CardTitle>
        </CardHeader>
        <CardContent className="p-3 md:p-6">
          {codes.length === 0 ? (
            <div className="text-center py-12">
              <Gift className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground mb-2">Vous n'avez pas encore de codes CCC</p>
              <p className="text-sm text-muted-foreground">
                Soumettez des contributions pour gagner des codes
              </p>
            </div>
          ) : (
            <>
              {/* Desktop Table */}
              <div className="hidden lg:block rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Code</TableHead>
                      <TableHead>Parcelle</TableHead>
                      <TableHead>Valeur</TableHead>
                      <TableHead>Date création</TableHead>
                      <TableHead>Expire le</TableHead>
                      <TableHead>Statut</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {codes.map((code) => (
                      <TableRow key={code.id}>
                        <TableCell className="font-mono font-medium">{code.code}</TableCell>
                        <TableCell>{code.parcel_number}</TableCell>
                        <TableCell>
                          <span className="flex items-center gap-1 font-medium text-green-600">
                            <DollarSign className="h-3 w-3" />
                            {Number(code.value_usd).toFixed(2)}
                          </span>
                        </TableCell>
                        <TableCell>
                          {new Date(code.created_at).toLocaleDateString('fr-FR')}
                        </TableCell>
                        <TableCell>
                          {new Date(code.expires_at).toLocaleDateString('fr-FR')}
                        </TableCell>
                        <TableCell>{getStatusBadge(code)}</TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyToClipboard(code.code)}
                            disabled={!code.is_valid || code.is_used}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile Cards */}
              <div className="lg:hidden space-y-2">
                {codes.map((code) => (
                  <Card key={code.id} className="p-2">
                    <div className="space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="font-mono font-medium text-xs">{code.code}</p>
                          <p className="text-[10px] text-muted-foreground mt-0.5 truncate">
                            Parcelle: {code.parcel_number}
                          </p>
                        </div>
                        {getStatusBadge(code)}
                      </div>

                      <div className="flex items-center justify-between py-1 border-y">
                        <div>
                          <p className="text-[10px] text-muted-foreground">Valeur</p>
                          <p className="font-semibold text-green-600 flex items-center gap-0.5 mt-0.5 text-xs">
                            <DollarSign className="h-3 w-3" />
                            {Number(code.value_usd).toFixed(2)}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] text-muted-foreground">Expire</p>
                          <p className="text-[10px] font-medium mt-0.5">
                            {new Date(code.expires_at).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: '2-digit' })}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-muted-foreground">
                          {new Date(code.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })}
                        </span>
                        <Button
                          variant="default"
                          size="sm"
                          onClick={() => copyToClipboard(code.code)}
                          disabled={!code.is_valid || code.is_used}
                          className="h-7 text-[11px]"
                        >
                          <Copy className="h-3 w-3 mr-1" />
                          Copier
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </>
          )}

          {codes.length > 0 && (
            <div className="mt-4 p-4 bg-muted/50 rounded-lg">
              <p className="text-sm text-muted-foreground">
                <strong>💡 Astuce :</strong> Utilisez vos codes CCC lors du paiement pour bénéficier d'une remise automatique !
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
};

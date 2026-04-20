import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { DollarSign, Users, TrendingUp, CheckCircle, Clock, Search } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface Commission {
  id: string;
  reseller_id: string;
  sale_amount_usd: number;
  commission_earned_usd: number;
  commission_paid: boolean;
  commission_paid_at: string | null;
  discount_applied_usd: number | null;
  invoice_id: string | null;
  created_at: string;
  resellers: {
    business_name: string | null;
    reseller_code: string;
    commission_rate: number;
    profiles: {
      full_name: string | null;
      email: string;
    };
  };
}

const AdminCommissions = () => {
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCommissions, setSelectedCommissions] = useState<string[]>([]);
  const { toast } = useToast();

  // Stats
  const totalCommissions = commissions.reduce((sum, c) => sum + Number(c.commission_earned_usd), 0);
  const paidCommissions = commissions
    .filter(c => c.commission_paid)
    .reduce((sum, c) => sum + Number(c.commission_earned_usd), 0);
  const unpaidCommissions = commissions
    .filter(c => !c.commission_paid)
    .reduce((sum, c) => sum + Number(c.commission_earned_usd), 0);
  const activeResellers = new Set(commissions.map(c => c.reseller_id)).size;

  useEffect(() => {
    fetchCommissions();
  }, []);

  const fetchCommissions = async () => {
    try {
      setLoading(true);
      // Single join query to avoid N+1 (was fetching reseller + profile per row)
      const { data: salesData, error } = await supabase
        .from('reseller_sales')
        .select(`
          *,
          resellers:reseller_id (
            user_id,
            business_name,
            reseller_code,
            commission_rate
          )
        `)
        .order('created_at', { ascending: false })
        .limit(1000);

      if (error) throw error;

      // Batch-fetch profiles for all resellers in a single query
      const userIds = Array.from(
        new Set(
          (salesData || [])
            .map((s: any) => s.resellers?.user_id)
            .filter(Boolean),
        ),
      );

      let profilesMap: Record<string, { full_name: string | null; email: string }> = {};
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, full_name, email')
          .in('user_id', userIds as string[]);
        profilesMap = (profiles || []).reduce((acc, p: any) => {
          acc[p.user_id] = { full_name: p.full_name, email: p.email || '' };
          return acc;
        }, {} as Record<string, { full_name: string | null; email: string }>);
      }

      const enriched = (salesData || [])
        .filter((s: any) => s.resellers)
        .map((s: any) => ({
          ...s,
          resellers: {
            business_name: s.resellers.business_name,
            reseller_code: s.resellers.reseller_code,
            commission_rate: s.resellers.commission_rate,
            profiles: profilesMap[s.resellers.user_id] || { full_name: null, email: '' },
          },
        })) as Commission[];

      setCommissions(enriched);
    } catch (error: any) {
      console.error('Erreur:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les commissions",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsPaid = async (commissionIds: string[]) => {
    try {
      const { error } = await supabase
        .from('reseller_sales')
        .update({
          commission_paid: true,
          commission_paid_at: new Date().toISOString()
        })
        .in('id', commissionIds);

      if (error) throw error;

      toast({
        title: "Succès",
        description: `${commissionIds.length} commission(s) marquée(s) comme payée(s)`,
      });

      setSelectedCommissions([]);
      fetchCommissions();
    } catch (error: any) {
      console.error('Erreur:', error);
      toast({
        title: "Erreur",
        description: "Impossible de marquer les commissions comme payées",
        variant: "destructive"
      });
    }
  };

  const filteredCommissions = commissions.filter(commission => {
    const resellerName = commission.resellers.business_name || commission.resellers.profiles.full_name || '';
    const resellerEmail = commission.resellers.profiles.email || '';
    const resellerCode = commission.resellers.reseller_code || '';
    
    return (
      resellerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      resellerEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
      resellerCode.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  // Group by reseller
  const commissionsByReseller = filteredCommissions.reduce((acc, commission) => {
    const resellerId = commission.reseller_id;
    if (!acc[resellerId]) {
      acc[resellerId] = {
        reseller: commission.resellers,
        commissions: [],
        totalEarned: 0,
        totalPaid: 0,
        totalUnpaid: 0
      };
    }
    acc[resellerId].commissions.push(commission);
    acc[resellerId].totalEarned += Number(commission.commission_earned_usd);
    if (commission.commission_paid) {
      acc[resellerId].totalPaid += Number(commission.commission_earned_usd);
    } else {
      acc[resellerId].totalUnpaid += Number(commission.commission_earned_usd);
    }
    return acc;
  }, {} as Record<string, any>);

  if (loading) {
    return <div className="flex items-center justify-center h-64">Chargement...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Commissions</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalCommissions.toFixed(2)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Payées</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">${paidCommissions.toFixed(2)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">En Attente</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">${unpaidCommissions.toFixed(2)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Revendeurs Actifs</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeResellers}</div>
          </CardContent>
        </Card>
      </div>

      {/* Commissions List */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <CardTitle>Gestion des Commissions</CardTitle>
            {selectedCommissions.length > 0 && (
              <Button
                onClick={() => handleMarkAsPaid(selectedCommissions)}
                size="sm"
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Marquer comme payé ({selectedCommissions.length})
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="relative mb-4">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher par nom, email, code..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8"
            />
          </div>

          <div className="space-y-4">
            {Object.values(commissionsByReseller).map((group: any) => (
              <Card key={group.reseller.reseller_code}>
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-base">
                        {group.reseller.business_name || group.reseller.profiles.full_name}
                      </CardTitle>
                      <p className="text-sm text-muted-foreground mt-1">
                        {group.reseller.profiles.email} • Code: {group.reseller.reseller_code}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold">${group.totalEarned.toFixed(2)}</div>
                      <div className="text-xs text-muted-foreground mt-1">
                        <span className="text-green-600">${group.totalPaid.toFixed(2)} payé</span>
                        {group.totalUnpaid > 0 && (
                          <span className="text-orange-600 ml-2">${group.totalUnpaid.toFixed(2)} dû</span>
                        )}
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm">
                        Voir détails ({group.commissions.length})
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle>
                          Détails des commissions - {group.reseller.business_name || group.reseller.profiles.full_name}
                        </DialogTitle>
                      </DialogHeader>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>
                              <input
                                type="checkbox"
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    const unpaid = group.commissions
                                      .filter((c: Commission) => !c.commission_paid)
                                      .map((c: Commission) => c.id);
                                    setSelectedCommissions([...selectedCommissions, ...unpaid]);
                                  } else {
                                    const ids = group.commissions.map((c: Commission) => c.id);
                                    setSelectedCommissions(selectedCommissions.filter(id => !ids.includes(id)));
                                  }
                                }}
                              />
                            </TableHead>
                            <TableHead>Date</TableHead>
                            <TableHead>Vente</TableHead>
                            <TableHead>Commission</TableHead>
                            <TableHead>Taux</TableHead>
                            <TableHead>Statut</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {group.commissions.map((commission: Commission) => (
                            <TableRow key={commission.id}>
                              <TableCell>
                                {!commission.commission_paid && (
                                  <input
                                    type="checkbox"
                                    checked={selectedCommissions.includes(commission.id)}
                                    onChange={(e) => {
                                      if (e.target.checked) {
                                        setSelectedCommissions([...selectedCommissions, commission.id]);
                                      } else {
                                        setSelectedCommissions(selectedCommissions.filter(id => id !== commission.id));
                                      }
                                    }}
                                  />
                                )}
                              </TableCell>
                              <TableCell>
                                {format(new Date(commission.created_at), 'dd/MM/yyyy', { locale: fr })}
                              </TableCell>
                              <TableCell>${Number(commission.sale_amount_usd).toFixed(2)}</TableCell>
                              <TableCell className="font-medium">
                                ${Number(commission.commission_earned_usd).toFixed(2)}
                              </TableCell>
                              <TableCell>{commission.resellers.commission_rate}%</TableCell>
                              <TableCell>
                                {commission.commission_paid ? (
                                  <Badge variant="default">
                                    Payée {commission.commission_paid_at && 
                                      `le ${format(new Date(commission.commission_paid_at), 'dd/MM/yyyy', { locale: fr })}`}
                                  </Badge>
                                ) : (
                                  <Badge variant="secondary">En attente</Badge>
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </DialogContent>
                  </Dialog>
                </CardContent>
              </Card>
            ))}

            {Object.keys(commissionsByReseller).length === 0 && (
              <div className="text-center text-muted-foreground py-8">
                Aucune commission trouvée
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminCommissions;

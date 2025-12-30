import React, { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { 
  Plus, 
  Search, 
  Users, 
  TrendingUp, 
  Tag,
  Download,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { useResellers } from '@/hooks/useResellers';
import { useDiscountCodes } from '@/hooks/useDiscountCodes';
import { useResellerSales } from '@/hooks/useResellerSales';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface AdminResellersProps {
  onRefresh?: () => void;
}

const AdminResellers: React.FC<AdminResellersProps> = ({ onRefresh }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showCodeDialog, setShowCodeDialog] = useState(false);
  const [selectedReseller, setSelectedReseller] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [newResellerData, setNewResellerData] = useState({
    business_name: '',
    contact_phone: '',
    commission_rate: 10,
    fixed_commission_usd: 0
  });
  const [newCodeData, setNewCodeData] = useState({
    code: '',
    discount_percentage: 0,
    discount_amount_usd: 0,
    expires_at: '',
    max_usage: ''
  });

  const { resellers, loading, createReseller, toggleResellerStatus } = useResellers();
  const { codes, createDiscountCode } = useDiscountCodes();
  const { sales } = useResellerSales();
  const { toast } = useToast();

  const filteredResellers = useMemo(() => resellers.filter(reseller =>
    reseller.business_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    reseller.reseller_code.toLowerCase().includes(searchQuery.toLowerCase())
  ), [resellers, searchQuery]);

  const totalPages = Math.ceil(filteredResellers.length / itemsPerPage);
  const paginatedResellers = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredResellers.slice(start, start + itemsPerPage);
  }, [filteredResellers, currentPage, itemsPerPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  const exportToCSV = () => {
    const csv = [
      ['Code', 'Entreprise', 'Contact', 'Commission %', 'Commission Fixe', 'Ventes', 'Statut', 'Créé le'].join(','),
      ...filteredResellers.map(r => {
        const stats = getResellerStats(r.id);
        return [
          r.reseller_code,
          r.business_name || 'Non renseigné',
          r.contact_phone || '',
          r.commission_rate,
          r.fixed_commission_usd,
          stats.salesCount,
          r.is_active ? 'Actif' : 'Inactif',
          format(new Date(r.created_at), 'dd/MM/yyyy', { locale: fr })
        ].join(',');
      })
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `revendeurs-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
  };

  const handleCreateReseller = async () => {
    const result = await createReseller(newResellerData);
    if (result) {
      setShowCreateDialog(false);
      setNewResellerData({
        business_name: '',
        contact_phone: '',
        commission_rate: 10,
        fixed_commission_usd: 0
      });
      onRefresh?.();
    }
  };

  const handleCreateCode = async () => {
    if (!selectedReseller) return;

    const codeData = {
      reseller_id: selectedReseller,
      code: newCodeData.code.toUpperCase(),
      discount_percentage: newCodeData.discount_percentage,
      discount_amount_usd: newCodeData.discount_amount_usd,
      expires_at: newCodeData.expires_at || undefined,
      max_usage: newCodeData.max_usage ? parseInt(newCodeData.max_usage) : undefined
    };

    const result = await createDiscountCode(codeData);
    if (result) {
      setShowCodeDialog(false);
      setNewCodeData({
        code: '',
        discount_percentage: 0,
        discount_amount_usd: 0,
        expires_at: '',
        max_usage: ''
      });
      setSelectedReseller(null);
    }
  };

  const getResellerStats = (resellerId: string) => {
    const resellerSales = sales.filter(sale => sale.reseller_id === resellerId);
    const totalSales = resellerSales.reduce((sum, sale) => sum + sale.sale_amount_usd, 0);
    const totalCommission = resellerSales.reduce((sum, sale) => sum + sale.commission_earned_usd, 0);
    const pendingCommission = resellerSales
      .filter(sale => !sale.commission_paid)
      .reduce((sum, sale) => sum + sale.commission_earned_usd, 0);

    return { totalSales, totalCommission, pendingCommission, salesCount: resellerSales.length };
  };

  const getResellerCodes = (resellerId: string) => {
    return codes.filter(code => code.reseller_id === resellerId);
  };

  if (loading && resellers.length === 0) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
            <span className="ml-2">Chargement des revendeurs...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header avec stats globales */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Users className="h-8 w-8 text-blue-500" />
              <div>
                <p className="text-2xl font-bold">{resellers.length}</p>
                <p className="text-xs text-muted-foreground">Revendeurs actifs</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Tag className="h-8 w-8 text-green-500" />
              <div>
                <p className="text-2xl font-bold">{codes.length}</p>
                <p className="text-xs text-muted-foreground">Codes de remise</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-8 w-8 text-purple-500" />
              <div>
                <p className="text-2xl font-bold">{sales.length}</p>
                <p className="text-xs text-muted-foreground">Ventes via codes</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Gestion des revendeurs */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Gestion des Revendeurs
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={exportToCSV} className="gap-2">
                <Download className="h-4 w-4" />
                Exporter
              </Button>
            <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Nouveau Revendeur
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Créer un nouveau revendeur</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="business_name">Nom de l'entreprise</Label>
                    <Input
                      id="business_name"
                      value={newResellerData.business_name}
                      onChange={(e) => setNewResellerData(prev => ({ ...prev, business_name: e.target.value }))}
                      placeholder="Ex: Entreprise SARL"
                    />
                  </div>
                  <div>
                    <Label htmlFor="contact_phone">Téléphone de contact</Label>
                    <Input
                      id="contact_phone"
                      value={newResellerData.contact_phone}
                      onChange={(e) => setNewResellerData(prev => ({ ...prev, contact_phone: e.target.value }))}
                      placeholder="+243 XXX XXX XXX"
                    />
                  </div>
                  <div>
                    <Label htmlFor="commission_rate">Taux de commission (%)</Label>
                    <Input
                      id="commission_rate"
                      type="number"
                      min="0"
                      max="100"
                      step="0.01"
                      value={newResellerData.commission_rate}
                      onChange={(e) => setNewResellerData(prev => ({ ...prev, commission_rate: parseFloat(e.target.value) || 0 }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="fixed_commission">Commission fixe (USD) - optionnel</Label>
                    <Input
                      id="fixed_commission"
                      type="number"
                      min="0"
                      step="0.01"
                      value={newResellerData.fixed_commission_usd}
                      onChange={(e) => setNewResellerData(prev => ({ ...prev, fixed_commission_usd: parseFloat(e.target.value) || 0 }))}
                    />
                  </div>
                  <Button onClick={handleCreateReseller} className="w-full">
                    Créer le revendeur
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
            </div>
          </div>
        </CardHeader>
        
        <CardContent>
          <div className="flex items-center space-x-2 mb-4">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher par nom ou code..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="max-w-sm"
            />
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Entreprise</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Commission</TableHead>
                <TableHead>Ventes</TableHead>
                <TableHead>Codes</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedResellers.map((reseller) => {
                const stats = getResellerStats(reseller.id);
                const resellerCodes = getResellerCodes(reseller.id);
                
                return (
                  <TableRow key={reseller.id}>
                    <TableCell>
                      <Badge variant="outline" className="font-mono">
                        {reseller.reseller_code}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{reseller.business_name || 'Non renseigné'}</div>
                        <div className="text-sm text-muted-foreground">
                          Créé le {new Date(reseller.created_at).toLocaleDateString()}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{reseller.contact_phone || '-'}</TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {reseller.fixed_commission_usd > 0 ? (
                          <span>${reseller.fixed_commission_usd} fixe</span>
                        ) : (
                          <span>{reseller.commission_rate}%</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <div>{stats.salesCount} ventes</div>
                        <div className="text-muted-foreground">${stats.totalSales.toFixed(2)}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        {resellerCodes.length} codes
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Switch
                          checked={reseller.is_active}
                          onCheckedChange={() => toggleResellerStatus(reseller.id)}
                        />
                        <span className="text-sm">
                          {reseller.is_active ? 'Actif' : 'Inactif'}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedReseller(reseller.id);
                            setShowCodeDialog(true);
                          }}
                        >
                          <Tag className="h-4 w-4 mr-1" />
                          Code
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>

          {filteredResellers.length === 0 && (
            <div className="text-center py-6 text-muted-foreground">
              {searchQuery ? 'Aucun revendeur trouvé' : 'Aucun revendeur enregistré'}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 pt-4 border-t">
              <p className="text-sm text-muted-foreground">
                Page {currentPage} sur {totalPages} ({filteredResellers.length} revendeurs)
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog création code de remise */}
      <Dialog open={showCodeDialog} onOpenChange={setShowCodeDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Créer un code de remise</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="code">Code de remise</Label>
              <Input
                id="code"
                value={newCodeData.code}
                onChange={(e) => setNewCodeData(prev => ({ ...prev, code: e.target.value.toUpperCase() }))}
                placeholder="Ex: PROMO2024"
                className="uppercase"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="discount_percentage">Remise en % (optionnel)</Label>
                <Input
                  id="discount_percentage"
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  value={newCodeData.discount_percentage}
                  onChange={(e) => setNewCodeData(prev => ({ ...prev, discount_percentage: parseFloat(e.target.value) || 0 }))}
                />
              </div>
              <div>
                <Label htmlFor="discount_amount">Remise fixe en USD (optionnel)</Label>
                <Input
                  id="discount_amount"
                  type="number"
                  min="0"
                  step="0.01"
                  value={newCodeData.discount_amount_usd}
                  onChange={(e) => setNewCodeData(prev => ({ ...prev, discount_amount_usd: parseFloat(e.target.value) || 0 }))}
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="expires_at">Date d'expiration (optionnel)</Label>
                <Input
                  id="expires_at"
                  type="datetime-local"
                  value={newCodeData.expires_at}
                  onChange={(e) => setNewCodeData(prev => ({ ...prev, expires_at: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="max_usage">Utilisations max (optionnel)</Label>
                <Input
                  id="max_usage"
                  type="number"
                  min="1"
                  value={newCodeData.max_usage}
                  onChange={(e) => setNewCodeData(prev => ({ ...prev, max_usage: e.target.value }))}
                />
              </div>
            </div>
            
            <Button onClick={handleCreateCode} className="w-full">
              Créer le code
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminResellers;
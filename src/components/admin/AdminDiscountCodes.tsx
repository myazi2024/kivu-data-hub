import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useDiscountCodes } from '@/hooks/useDiscountCodes';
import { useResellers } from '@/hooks/useResellers';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Search, Tag, Eye, Power, Pencil, Trash2, TrendingUp, Users, DollarSign, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { toast } from 'sonner';
import { Alert, AlertDescription } from '@/components/ui/alert';

const AdminDiscountCodes = () => {
  const { codes, loading, fetchAllCodes, createDiscountCode, updateDiscountCode, toggleCodeStatus } = useDiscountCodes();
  const { resellers, fetchResellers } = useResellers();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [selectedCode, setSelectedCode] = useState<any>(null);

  // Form state
  const [formData, setFormData] = useState({
    reseller_id: '',
    code: '',
    discount_type: 'percentage' as 'percentage' | 'fixed',
    discount_percentage: 0,
    discount_amount_usd: 0,
    expires_at: '',
    max_usage: undefined as number | undefined,
  });

  useEffect(() => {
    fetchAllCodes();
    fetchResellers();
  }, []);

  const filteredCodes = codes.filter((code) => {
    const matchesSearch = code.code.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = 
      filterStatus === 'all' ? true :
      filterStatus === 'active' ? code.is_active :
      !code.is_active;
    return matchesSearch && matchesStatus;
  });

  const stats = {
    total: codes.length,
    active: codes.filter(c => c.is_active).length,
    totalUsage: codes.reduce((sum, c) => sum + c.usage_count, 0),
    totalDiscount: codes.reduce((sum, c) => {
      return sum + (c.discount_amount_usd * c.usage_count);
    }, 0)
  };

  const handleCreate = async () => {
    if (!formData.reseller_id || !formData.code) {
      toast.error('Veuillez remplir tous les champs obligatoires');
      return;
    }

    const result = await createDiscountCode({
      reseller_id: formData.reseller_id,
      code: formData.code.toUpperCase(),
      discount_percentage: formData.discount_type === 'percentage' ? formData.discount_percentage : 0,
      discount_amount_usd: formData.discount_type === 'fixed' ? formData.discount_amount_usd : 0,
      expires_at: formData.expires_at || undefined,
      max_usage: formData.max_usage,
    });

    if (result) {
      setCreateDialogOpen(false);
      resetForm();
      fetchAllCodes();
    }
  };

  const handleUpdate = async () => {
    if (!selectedCode) return;

    const updates: any = {
      discount_percentage: formData.discount_type === 'percentage' ? formData.discount_percentage : 0,
      discount_amount_usd: formData.discount_type === 'fixed' ? formData.discount_amount_usd : 0,
      expires_at: formData.expires_at || null,
      max_usage: formData.max_usage || null,
    };

    const result = await updateDiscountCode(selectedCode.id, updates);

    if (result) {
      setEditDialogOpen(false);
      setSelectedCode(null);
      resetForm();
      fetchAllCodes();
    }
  };

  const handleToggleStatus = async (id: string) => {
    await toggleCodeStatus(id);
    fetchAllCodes();
  };

  const resetForm = () => {
    setFormData({
      reseller_id: '',
      code: '',
      discount_type: 'percentage',
      discount_percentage: 0,
      discount_amount_usd: 0,
      expires_at: '',
      max_usage: undefined,
    });
  };

  const openEditDialog = (code: any) => {
    setSelectedCode(code);
    setFormData({
      reseller_id: code.reseller_id,
      code: code.code,
      discount_type: code.discount_percentage > 0 ? 'percentage' : 'fixed',
      discount_percentage: code.discount_percentage || 0,
      discount_amount_usd: code.discount_amount_usd || 0,
      expires_at: code.expires_at ? format(new Date(code.expires_at), 'yyyy-MM-dd') : '',
      max_usage: code.max_usage || undefined,
    });
    setEditDialogOpen(true);
  };

  const openViewDialog = (code: any) => {
    setSelectedCode(code);
    setViewDialogOpen(true);
  };

  if (loading && codes.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Codes</CardTitle>
            <Tag className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Codes Actifs</CardTitle>
            <Power className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.active}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Utilisations</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalUsage}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Remises Totales</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${stats.totalDiscount.toFixed(2)}</div>
          </CardContent>
        </Card>
      </div>

      {/* Main Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Gestion des Codes de Remise</CardTitle>
              <CardDescription>
                Créez et gérez les codes de remise pour les revendeurs
              </CardDescription>
            </div>
            <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => { resetForm(); setCreateDialogOpen(true); }}>
                  <Plus className="h-4 w-4 mr-2" />
                  Créer un code
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Créer un code de remise</DialogTitle>
                  <DialogDescription>
                    Créez un nouveau code de remise pour un revendeur
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>Revendeur *</Label>
                    <Select value={formData.reseller_id} onValueChange={(value) => setFormData({ ...formData, reseller_id: value })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner un revendeur" />
                      </SelectTrigger>
                      <SelectContent>
                        {resellers.map((reseller) => (
                          <SelectItem key={reseller.id} value={reseller.id}>
                            {reseller.business_name || reseller.reseller_code}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Code *</Label>
                    <Input
                      value={formData.code}
                      onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                      placeholder="PROMO2024"
                      className="uppercase"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Type de remise</Label>
                    <Select value={formData.discount_type} onValueChange={(value: 'percentage' | 'fixed') => setFormData({ ...formData, discount_type: value })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="percentage">Pourcentage</SelectItem>
                        <SelectItem value="fixed">Montant fixe</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {formData.discount_type === 'percentage' ? (
                    <div className="space-y-2">
                      <Label>Pourcentage (%)</Label>
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        value={formData.discount_percentage}
                        onChange={(e) => setFormData({ ...formData, discount_percentage: parseFloat(e.target.value) })}
                      />
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Label>Montant (USD)</Label>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={formData.discount_amount_usd}
                        onChange={(e) => setFormData({ ...formData, discount_amount_usd: parseFloat(e.target.value) })}
                      />
                    </div>
                  )}
                  <div className="space-y-2">
                    <Label>Date d'expiration (optionnel)</Label>
                    <Input
                      type="date"
                      value={formData.expires_at}
                      onChange={(e) => setFormData({ ...formData, expires_at: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Utilisations max (optionnel)</Label>
                    <Input
                      type="number"
                      min="0"
                      value={formData.max_usage || ''}
                      onChange={(e) => setFormData({ ...formData, max_usage: e.target.value ? parseInt(e.target.value) : undefined })}
                      placeholder="Illimité"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
                    Annuler
                  </Button>
                  <Button onClick={handleCreate}>Créer</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex gap-4 mb-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Rechercher un code..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
            <Select value={filterStatus} onValueChange={(value: any) => setFilterStatus(value)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les codes</SelectItem>
                <SelectItem value="active">Actifs</SelectItem>
                <SelectItem value="inactive">Inactifs</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Table */}
          {filteredCodes.length === 0 ? (
            <Alert>
              <AlertDescription>Aucun code de remise trouvé.</AlertDescription>
            </Alert>
          ) : (
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Code</TableHead>
                    <TableHead>Revendeur</TableHead>
                    <TableHead>Remise</TableHead>
                    <TableHead>Utilisations</TableHead>
                    <TableHead>Expiration</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCodes.map((code) => (
                    <TableRow key={code.id}>
                      <TableCell className="font-mono font-medium">{code.code}</TableCell>
                      <TableCell>
                        {(code as any).resellers?.business_name || (code as any).resellers?.reseller_code || 'N/A'}
                      </TableCell>
                      <TableCell>
                        {code.discount_percentage > 0 
                          ? `${code.discount_percentage}%` 
                          : `$${code.discount_amount_usd}`}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {code.usage_count}
                          {code.max_usage && ` / ${code.max_usage}`}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {code.expires_at ? (
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {format(new Date(code.expires_at), 'dd MMM yyyy', { locale: fr })}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">Aucune</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={code.is_active ? 'default' : 'secondary'}>
                          {code.is_active ? 'Actif' : 'Inactif'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openViewDialog(code)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEditDialog(code)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleToggleStatus(code.id)}
                          >
                            <Power className={`h-4 w-4 ${code.is_active ? 'text-green-600' : 'text-muted-foreground'}`} />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modifier le code de remise</DialogTitle>
            <DialogDescription>Code: {selectedCode?.code}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Type de remise</Label>
              <Select value={formData.discount_type} onValueChange={(value: 'percentage' | 'fixed') => setFormData({ ...formData, discount_type: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="percentage">Pourcentage</SelectItem>
                  <SelectItem value="fixed">Montant fixe</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {formData.discount_type === 'percentage' ? (
              <div className="space-y-2">
                <Label>Pourcentage (%)</Label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  value={formData.discount_percentage}
                  onChange={(e) => setFormData({ ...formData, discount_percentage: parseFloat(e.target.value) })}
                />
              </div>
            ) : (
              <div className="space-y-2">
                <Label>Montant (USD)</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.discount_amount_usd}
                  onChange={(e) => setFormData({ ...formData, discount_amount_usd: parseFloat(e.target.value) })}
                />
              </div>
            )}
            <div className="space-y-2">
              <Label>Date d'expiration (optionnel)</Label>
              <Input
                type="date"
                value={formData.expires_at}
                onChange={(e) => setFormData({ ...formData, expires_at: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Utilisations max (optionnel)</Label>
              <Input
                type="number"
                min="0"
                value={formData.max_usage || ''}
                onChange={(e) => setFormData({ ...formData, max_usage: e.target.value ? parseInt(e.target.value) : undefined })}
                placeholder="Illimité"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Annuler
            </Button>
            <Button onClick={handleUpdate}>Enregistrer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Détails du code</DialogTitle>
          </DialogHeader>
          {selectedCode && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Code</Label>
                  <p className="font-mono font-bold text-lg">{selectedCode.code}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Statut</Label>
                  <Badge className="mt-1" variant={selectedCode.is_active ? 'default' : 'secondary'}>
                    {selectedCode.is_active ? 'Actif' : 'Inactif'}
                  </Badge>
                </div>
                <div>
                  <Label className="text-muted-foreground">Remise</Label>
                  <p className="font-semibold">
                    {selectedCode.discount_percentage > 0 
                      ? `${selectedCode.discount_percentage}%` 
                      : `$${selectedCode.discount_amount_usd}`}
                  </p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Utilisations</Label>
                  <p className="font-semibold">
                    {selectedCode.usage_count}
                    {selectedCode.max_usage && ` / ${selectedCode.max_usage}`}
                  </p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Créé le</Label>
                  <p>{format(new Date(selectedCode.created_at), 'dd MMM yyyy', { locale: fr })}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Expire le</Label>
                  <p>
                    {selectedCode.expires_at 
                      ? format(new Date(selectedCode.expires_at), 'dd MMM yyyy', { locale: fr })
                      : 'Jamais'}
                  </p>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminDiscountCodes;

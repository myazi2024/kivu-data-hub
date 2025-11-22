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
import { Plus, Tag, TrendingUp, DollarSign, Power, Eye, Copy, Check } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { toast } from 'sonner';
import { Alert, AlertDescription } from '@/components/ui/alert';

export const ResellerDiscountCodes: React.FC = () => {
  const { codes, loading, fetchMyCodes, createDiscountCode, toggleCodeStatus } = useDiscountCodes();
  const { currentReseller, fetchCurrentReseller } = useResellers();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [selectedCode, setSelectedCode] = useState<any>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    code: '',
    discount_type: 'percentage' as 'percentage' | 'fixed',
    discount_percentage: 10,
    discount_amount_usd: 5,
    expires_at: '',
    max_usage: undefined as number | undefined,
  });

  useEffect(() => {
    fetchMyCodes();
    fetchCurrentReseller();
  }, []);

  const stats = {
    total: codes.length,
    active: codes.filter(c => c.is_active).length,
    totalUsage: codes.reduce((sum, c) => sum + c.usage_count, 0),
    totalRevenue: codes.reduce((sum, c) => sum + (c.discount_amount_usd * c.usage_count), 0)
  };

  const handleCreate = async () => {
    if (!currentReseller || !formData.code) {
      toast.error('Veuillez remplir tous les champs obligatoires');
      return;
    }

    const result = await createDiscountCode({
      reseller_id: currentReseller.id,
      code: formData.code.toUpperCase(),
      discount_percentage: formData.discount_type === 'percentage' ? formData.discount_percentage : 0,
      discount_amount_usd: formData.discount_type === 'fixed' ? formData.discount_amount_usd : 0,
      expires_at: formData.expires_at || undefined,
      max_usage: formData.max_usage,
    });

    if (result) {
      setCreateDialogOpen(false);
      resetForm();
      fetchMyCodes();
    }
  };

  const handleToggleStatus = async (id: string) => {
    await toggleCodeStatus(id);
    fetchMyCodes();
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    toast.success('Code copié dans le presse-papiers');
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const resetForm = () => {
    setFormData({
      code: '',
      discount_type: 'percentage',
      discount_percentage: 10,
      discount_amount_usd: 5,
      expires_at: '',
      max_usage: undefined,
    });
  };

  const openViewDialog = (code: any) => {
    setSelectedCode(code);
    setViewDialogOpen(true);
  };

  if (!currentReseller) {
    return (
      <Alert>
        <AlertDescription>
          Vous n'êtes pas encore enregistré comme revendeur. Contactez l'administrateur pour devenir revendeur.
        </AlertDescription>
      </Alert>
    );
  }

  if (loading && codes.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Statistics */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Mes Codes</CardTitle>
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
            <CardTitle className="text-sm font-medium">Remises Générées</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${stats.totalRevenue.toFixed(2)}</div>
          </CardContent>
        </Card>
      </div>

      {/* Main Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Mes Codes de Remise</CardTitle>
              <CardDescription>
                Code Revendeur: <span className="font-mono font-bold">{currentReseller.reseller_code}</span>
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
                    Créez un nouveau code pour vos clients
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
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
          {codes.length === 0 ? (
            <Alert>
              <AlertDescription>Aucun code de remise créé pour le moment.</AlertDescription>
            </Alert>
          ) : (
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Code</TableHead>
                    <TableHead>Remise</TableHead>
                    <TableHead>Utilisations</TableHead>
                    <TableHead>Expiration</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {codes.map((code) => (
                    <TableRow key={code.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-medium">{code.code}</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleCopyCode(code.code)}
                            className="h-6 w-6 p-0"
                          >
                            {copiedCode === code.code ? (
                              <Check className="h-3 w-3 text-green-600" />
                            ) : (
                              <Copy className="h-3 w-3" />
                            )}
                          </Button>
                        </div>
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
                          format(new Date(code.expires_at), 'dd MMM yyyy', { locale: fr })
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

      {/* View Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Détails du code</DialogTitle>
          </DialogHeader>
          {selectedCode && (
            <div className="space-y-4 py-4">
              <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                <span className="font-mono font-bold text-2xl">{selectedCode.code}</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleCopyCode(selectedCode.code)}
                >
                  {copiedCode === selectedCode.code ? (
                    <>
                      <Check className="h-4 w-4 mr-2" />
                      Copié
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4 mr-2" />
                      Copier
                    </>
                  )}
                </Button>
              </div>
              <div className="grid grid-cols-2 gap-4">
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
                <div className="col-span-2">
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

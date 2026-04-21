import { useState, useEffect, lazy, Suspense } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DollarSign, TrendingUp, TrendingDown, Save, Plus, Pencil, Trash2 } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const BillingOverviewTab = lazy(() => import('./billing/BillingOverviewTab'));
const MortgageDisputeFeesTab = lazy(() => import('./billing/MortgageDisputeFeesTab'));
const AdminMutationFeesConfig = lazy(() => import('./AdminMutationFeesConfig'));
const AdminSubdivisionFeesConfig = lazy(() => import('./AdminSubdivisionFeesConfig'));
const AdminExpertiseFeesConfig = lazy(() => import('./AdminExpertiseFeesConfig'));
const AdminLandTitleFeesConfig = lazy(() => import('./AdminLandTitleFeesConfig'));

const LazyFallback = () => (
  <div className="flex items-center justify-center py-8">
    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
  </div>
);

interface Publication {
  id: string;
  title: string;
  price_usd: number;
  category: string;
  status: string;
}

interface CadastralService {
  id: string;
  name: string;
  service_id: string;
  price_usd: number;
  is_active: boolean;
}

interface PermitFee {
  id: string;
  fee_name: string;
  permit_type: string;
  amount_usd: number;
  is_mandatory: boolean;
  is_active: boolean;
}

const AdminBillingConfig = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  
  // Publications
  const [publications, setPublications] = useState<Publication[]>([]);
  const [selectedPub, setSelectedPub] = useState<Publication | null>(null);
  const [newPubPrice, setNewPubPrice] = useState('');
  
  // Cadastral Services
  const [services, setServices] = useState<CadastralService[]>([]);
  const [selectedService, setSelectedService] = useState<CadastralService | null>(null);
  const [newServicePrice, setNewServicePrice] = useState('');
  
  // Permit Fees
  const [permitFees, setPermitFees] = useState<PermitFee[]>([]);
  const [selectedFee, setSelectedFee] = useState<PermitFee | null>(null);
  const [newFeeAmount, setNewFeeAmount] = useState('');
  
  // Bulk update
  const [bulkOperation, setBulkOperation] = useState<'increase' | 'decrease'>('increase');
  const [bulkPercentage, setBulkPercentage] = useState('');

  useEffect(() => {
    fetchAllPricing();
  }, []);

  const fetchAllPricing = async () => {
    setLoading(true);
    try {
      const [pubsRes, servicesRes, feesRes] = await Promise.all([
        supabase.from('publications').select('id, title, price_usd, category, status').is('deleted_at', null),
        supabase.from('cadastral_services_config').select('*').is('deleted_at', null),
        supabase.from('permit_fees_config').select('*')
      ]);

      if (pubsRes.data) setPublications(pubsRes.data);
      if (servicesRes.data) setServices(servicesRes.data);
      if (feesRes.data) setPermitFees(feesRes.data);
    } catch (error) {
      console.error('Error fetching pricing:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les données de facturation",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const updatePublicationPrice = async () => {
    if (!selectedPub || !newPubPrice) return;

    try {
      const { error } = await supabase
        .from('publications')
        .update({ price_usd: parseFloat(newPubPrice) })
        .eq('id', selectedPub.id);

      if (error) throw error;

      toast({
        title: "Prix mis à jour",
        description: `Prix de "${selectedPub.title}" mis à jour avec succès`
      });
      
      fetchAllPricing();
      setSelectedPub(null);
      setNewPubPrice('');
    } catch (error) {
      console.error('Error updating publication price:', error);
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour le prix",
        variant: "destructive"
      });
    }
  };

  const updateServicePrice = async () => {
    if (!selectedService || !newServicePrice) return;

    try {
      const { error } = await supabase
        .from('cadastral_services_config')
        .update({ price_usd: parseFloat(newServicePrice) })
        .eq('id', selectedService.id);

      if (error) throw error;

      toast({
        title: "Prix mis à jour",
        description: `Prix de "${selectedService.name}" mis à jour avec succès`
      });
      
      fetchAllPricing();
      setSelectedService(null);
      setNewServicePrice('');
    } catch (error) {
      console.error('Error updating service price:', error);
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour le prix",
        variant: "destructive"
      });
    }
  };

  const updatePermitFee = async () => {
    if (!selectedFee || !newFeeAmount) return;

    try {
      const { error } = await supabase
        .from('permit_fees_config')
        .update({ amount_usd: parseFloat(newFeeAmount) })
        .eq('id', selectedFee.id);

      if (error) throw error;

      toast({
        title: "Frais mis à jour",
        description: `Frais "${selectedFee.fee_name}" mis à jour avec succès`
      });
      
      fetchAllPricing();
      setSelectedFee(null);
      setNewFeeAmount('');
    } catch (error) {
      console.error('Error updating permit fee:', error);
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour les frais",
        variant: "destructive"
      });
    }
  };

  const applyBulkUpdate = async (category: 'publications' | 'services' | 'fees') => {
    if (!bulkPercentage) {
      toast({ title: "Erreur", description: "Veuillez entrer un pourcentage", variant: "destructive" });
      return;
    }
    const percentage = parseFloat(bulkPercentage);
    if (isNaN(percentage) || percentage <= 0 || percentage > 100) {
      toast({ title: "Erreur", description: "Pourcentage invalide (0 < p ≤ 100)", variant: "destructive" });
      return;
    }

    const tableMap: Record<typeof category, string> = {
      publications: 'publications',
      services: 'cadastral_services_config',
      fees: 'permit_fees_config',
    };

    try {
      // B6 — RPC transactionnelle + audit unique côté SQL
      const { data, error } = await (supabase as any).rpc('bulk_update_service_prices', {
        p_table: tableMap[category],
        p_operation: bulkOperation,
        p_percentage: percentage,
      });
      if (error) throw error;

      toast({
        title: "Mise à jour en masse effectuée",
        description: `${(data as any)?.updated_count ?? 0} prix ${bulkOperation === 'increase' ? 'augmentés' : 'diminués'} de ${percentage}% (transactionnel)`,
      });

      fetchAllPricing();
      setBulkPercentage('');
    } catch (error: any) {
      console.error('Error applying bulk update:', error);
      toast({
        title: "Erreur",
        description: error?.message || "Impossible d'appliquer la mise à jour en masse",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl md:text-3xl font-bold">Configuration de la facturation</h1>
        <p className="text-sm text-muted-foreground">
          Gérez les prix des publications, services cadastraux et frais de permis
        </p>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="flex flex-wrap h-auto w-full justify-start gap-1">
          <TabsTrigger value="overview" className="text-xs md:text-sm">Vue d'ensemble</TabsTrigger>
          <TabsTrigger value="publications" className="text-xs md:text-sm">Publications</TabsTrigger>
          <TabsTrigger value="services" className="text-xs md:text-sm">Services</TabsTrigger>
          <TabsTrigger value="fees" className="text-xs md:text-sm">Autorisation bâtir</TabsTrigger>
          <TabsTrigger value="mutations" className="text-xs md:text-sm">Mutation</TabsTrigger>
          <TabsTrigger value="land-titles" className="text-xs md:text-sm">Titre foncier</TabsTrigger>
          <TabsTrigger value="subdivisions" className="text-xs md:text-sm">Lotissement</TabsTrigger>
          <TabsTrigger value="expertise" className="text-xs md:text-sm">Expertise</TabsTrigger>
          <TabsTrigger value="mortgage-dispute" className="text-xs md:text-sm">Hypothèque & Litiges</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <Suspense fallback={<LazyFallback />}><BillingOverviewTab /></Suspense>
        </TabsContent>
        <TabsContent value="mutations" className="space-y-4">
          <Suspense fallback={<LazyFallback />}><AdminMutationFeesConfig /></Suspense>
        </TabsContent>
        <TabsContent value="land-titles" className="space-y-4">
          <Suspense fallback={<LazyFallback />}><AdminLandTitleFeesConfig /></Suspense>
        </TabsContent>
        <TabsContent value="subdivisions" className="space-y-4">
          <Suspense fallback={<LazyFallback />}><AdminSubdivisionFeesConfig /></Suspense>
        </TabsContent>
        <TabsContent value="expertise" className="space-y-4">
          <Suspense fallback={<LazyFallback />}><AdminExpertiseFeesConfig /></Suspense>
        </TabsContent>
        <TabsContent value="mortgage-dispute" className="space-y-4">
          <Suspense fallback={<LazyFallback />}><MortgageDisputeFeesTab /></Suspense>
        </TabsContent>

        {/* Publications */}
        <TabsContent value="publications" className="space-y-4">
          <Card>
            <CardHeader className="p-4 md:p-6">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                <div>
                  <CardTitle className="text-lg md:text-xl">Publications ({publications.length})</CardTitle>
                  <CardDescription className="text-xs md:text-sm">Gérer les prix des publications</CardDescription>
                </div>
                <div className="flex flex-col sm:flex-row gap-2">
                  <Select value={bulkOperation} onValueChange={(v: any) => setBulkOperation(v)}>
                    <SelectTrigger className="w-full sm:w-[140px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="increase">Augmenter</SelectItem>
                      <SelectItem value="decrease">Diminuer</SelectItem>
                    </SelectContent>
                  </Select>
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      placeholder="%"
                      value={bulkPercentage}
                      onChange={(e) => setBulkPercentage(e.target.value)}
                      className="w-20"
                    />
                    <Button onClick={() => applyBulkUpdate('publications')} size="sm">
                      Appliquer
                    </Button>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-2 md:p-6">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">Titre</TableHead>
                      <TableHead className="text-xs">Catégorie</TableHead>
                      <TableHead className="text-xs">Prix</TableHead>
                      <TableHead className="text-xs">Statut</TableHead>
                      <TableHead className="text-xs text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {publications.map((pub) => (
                      <TableRow key={pub.id}>
                        <TableCell className="text-xs md:text-sm font-medium max-w-[150px] truncate">{pub.title}</TableCell>
                        <TableCell className="text-xs">{pub.category}</TableCell>
                        <TableCell className="text-xs md:text-sm font-semibold">${pub.price_usd}</TableCell>
                        <TableCell>
                          <Badge variant={pub.status === 'published' ? 'default' : 'secondary'} className="text-xs">
                            {pub.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setSelectedPub(pub);
                                  setNewPubPrice(pub.price_usd.toString());
                                }}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-[90vw] sm:max-w-md">
                              <DialogHeader>
                                <DialogTitle className="text-base md:text-lg">Modifier le prix</DialogTitle>
                                <DialogDescription className="text-xs md:text-sm">{pub.title}</DialogDescription>
                              </DialogHeader>
                              <div className="space-y-4 py-4">
                                <div className="space-y-2">
                                  <Label htmlFor="price" className="text-xs md:text-sm">Nouveau prix (USD)</Label>
                                  <Input
                                    id="price"
                                    type="number"
                                    step="0.01"
                                    value={newPubPrice}
                                    onChange={(e) => setNewPubPrice(e.target.value)}
                                    placeholder="0.00"
                                  />
                                </div>
                              </div>
                              <DialogFooter>
                                <Button onClick={updatePublicationPrice} size="sm">
                                  <Save className="h-4 w-4 mr-2" />
                                  Enregistrer
                                </Button>
                              </DialogFooter>
                            </DialogContent>
                          </Dialog>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Services */}
        <TabsContent value="services" className="space-y-4">
          <Card>
            <CardHeader className="p-4 md:p-6">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                <div>
                  <CardTitle className="text-lg md:text-xl">Services cadastraux ({services.length})</CardTitle>
                  <CardDescription className="text-xs md:text-sm">Gérer les prix des services</CardDescription>
                </div>
                <div className="flex flex-col sm:flex-row gap-2">
                  <Select value={bulkOperation} onValueChange={(v: any) => setBulkOperation(v)}>
                    <SelectTrigger className="w-full sm:w-[140px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="increase">Augmenter</SelectItem>
                      <SelectItem value="decrease">Diminuer</SelectItem>
                    </SelectContent>
                  </Select>
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      placeholder="%"
                      value={bulkPercentage}
                      onChange={(e) => setBulkPercentage(e.target.value)}
                      className="w-20"
                    />
                    <Button onClick={() => applyBulkUpdate('services')} size="sm">
                      Appliquer
                    </Button>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-2 md:p-6">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">Service</TableHead>
                      <TableHead className="text-xs">ID Service</TableHead>
                      <TableHead className="text-xs">Prix</TableHead>
                      <TableHead className="text-xs">Statut</TableHead>
                      <TableHead className="text-xs text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {services.map((service) => (
                      <TableRow key={service.id}>
                        <TableCell className="text-xs md:text-sm font-medium max-w-[150px] truncate">{service.name}</TableCell>
                        <TableCell className="text-xs">{service.service_id}</TableCell>
                        <TableCell className="text-xs md:text-sm font-semibold">${service.price_usd}</TableCell>
                        <TableCell>
                          <Badge variant={service.is_active ? 'default' : 'secondary'} className="text-xs">
                            {service.is_active ? 'Actif' : 'Inactif'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setSelectedService(service);
                                  setNewServicePrice(service.price_usd.toString());
                                }}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-[90vw] sm:max-w-md">
                              <DialogHeader>
                                <DialogTitle className="text-base md:text-lg">Modifier le prix</DialogTitle>
                                <DialogDescription className="text-xs md:text-sm">{service.name}</DialogDescription>
                              </DialogHeader>
                              <div className="space-y-4 py-4">
                                <div className="space-y-2">
                                  <Label htmlFor="service-price" className="text-xs md:text-sm">Nouveau prix (USD)</Label>
                                  <Input
                                    id="service-price"
                                    type="number"
                                    step="0.01"
                                    value={newServicePrice}
                                    onChange={(e) => setNewServicePrice(e.target.value)}
                                    placeholder="0.00"
                                  />
                                </div>
                              </div>
                              <DialogFooter>
                                <Button onClick={updateServicePrice} size="sm">
                                  <Save className="h-4 w-4 mr-2" />
                                  Enregistrer
                                </Button>
                              </DialogFooter>
                            </DialogContent>
                          </Dialog>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Permit Fees */}
        <TabsContent value="fees" className="space-y-4">
          <Card>
            <CardHeader className="p-4 md:p-6">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                <div>
                  <CardTitle className="text-lg md:text-xl">Frais de permis ({permitFees.length})</CardTitle>
                  <CardDescription className="text-xs md:text-sm">Gérer les frais des permis</CardDescription>
                </div>
                <div className="flex flex-col sm:flex-row gap-2">
                  <Select value={bulkOperation} onValueChange={(v: any) => setBulkOperation(v)}>
                    <SelectTrigger className="w-full sm:w-[140px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="increase">Augmenter</SelectItem>
                      <SelectItem value="decrease">Diminuer</SelectItem>
                    </SelectContent>
                  </Select>
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      placeholder="%"
                      value={bulkPercentage}
                      onChange={(e) => setBulkPercentage(e.target.value)}
                      className="w-20"
                    />
                    <Button onClick={() => applyBulkUpdate('fees')} size="sm">
                      Appliquer
                    </Button>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-2 md:p-6">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">Frais</TableHead>
                      <TableHead className="text-xs">Type de permis</TableHead>
                      <TableHead className="text-xs">Montant</TableHead>
                      <TableHead className="text-xs">Type</TableHead>
                      <TableHead className="text-xs text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {permitFees.map((fee) => (
                      <TableRow key={fee.id}>
                        <TableCell className="text-xs md:text-sm font-medium max-w-[150px] truncate">{fee.fee_name}</TableCell>
                        <TableCell className="text-xs">{fee.permit_type}</TableCell>
                        <TableCell className="text-xs md:text-sm font-semibold">${fee.amount_usd}</TableCell>
                        <TableCell>
                          <Badge variant={fee.is_mandatory ? 'default' : 'secondary'} className="text-xs">
                            {fee.is_mandatory ? 'Obligatoire' : 'Optionnel'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setSelectedFee(fee);
                                  setNewFeeAmount(fee.amount_usd.toString());
                                }}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-[90vw] sm:max-w-md">
                              <DialogHeader>
                                <DialogTitle className="text-base md:text-lg">Modifier les frais</DialogTitle>
                                <DialogDescription className="text-xs md:text-sm">{fee.fee_name}</DialogDescription>
                              </DialogHeader>
                              <div className="space-y-4 py-4">
                                <div className="space-y-2">
                                  <Label htmlFor="fee-amount" className="text-xs md:text-sm">Nouveau montant (USD)</Label>
                                  <Input
                                    id="fee-amount"
                                    type="number"
                                    step="0.01"
                                    value={newFeeAmount}
                                    onChange={(e) => setNewFeeAmount(e.target.value)}
                                    placeholder="0.00"
                                  />
                                </div>
                              </div>
                              <DialogFooter>
                                <Button onClick={updatePermitFee} size="sm">
                                  <Save className="h-4 w-4 mr-2" />
                                  Enregistrer
                                </Button>
                              </DialogFooter>
                            </DialogContent>
                          </Dialog>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminBillingConfig;

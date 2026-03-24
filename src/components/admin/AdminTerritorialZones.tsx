import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { MapPin, Edit2, Plus, Trash2, Save, Download } from 'lucide-react';

interface TerritorialZone {
  id: string;
  name: string;
  zone_type: string;
  coordinates: any;
  recettes_fiscales_estimees_usd: number;
  valeur_fonciere_moyenne_parcelle_usd: number;
  typologie_dominante: string;
  indice_pression_fonciere: string;
  parent_zone_id?: string;
  created_at: string;
  updated_at: string;
}

const AdminTerritorialZones = () => {
  const [zones, setZones] = useState<TerritorialZone[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingZone, setEditingZone] = useState<TerritorialZone | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [filterType, setFilterType] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    name: '',
    zone_type: 'province',
    recettes_fiscales_estimees_usd: 0,
    valeur_fonciere_moyenne_parcelle_usd: 0,
    typologie_dominante: 'Usage mixte',
    indice_pression_fonciere: 'Modéré',
    coordinates: '[]'
  });

  const fetchZones = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('territorial_zones')
        .select('*')
        .order('zone_type', { ascending: true })
        .order('name', { ascending: true });

      if (error) throw error;
      setZones(data || []);
    } catch (error) {
      console.error('Erreur lors du chargement des zones:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les zones territoriales",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchZones();
  }, []);

  const handleSave = async () => {
    try {
      let coordinates;
      try {
        coordinates = JSON.parse(formData.coordinates);
      } catch {
        coordinates = [];
      }

      const zoneData = {
        name: formData.name,
        zone_type: formData.zone_type,
        coordinates,
        recettes_fiscales_estimees_usd: Number(formData.recettes_fiscales_estimees_usd),
        valeur_fonciere_moyenne_parcelle_usd: Number(formData.valeur_fonciere_moyenne_parcelle_usd),
        typologie_dominante: formData.typologie_dominante,
        indice_pression_fonciere: formData.indice_pression_fonciere,
      };

      if (editingZone) {
        const { error } = await supabase
          .from('territorial_zones')
          .update(zoneData)
          .eq('id', editingZone.id);
        
        if (error) throw error;
        
        toast({ title: "Succès", description: "Zone mise à jour avec succès" });
      } else {
        const { error } = await supabase
          .from('territorial_zones')
          .insert([zoneData]);
        
        if (error) throw error;
        
        toast({ title: "Succès", description: "Zone créée avec succès" });
      }

      setIsDialogOpen(false);
      setEditingZone(null);
      resetForm();
      fetchZones();
    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error);
      toast({
        title: "Erreur",
        description: "Impossible de sauvegarder la zone",
        variant: "destructive",
      });
    }
  };

  const handleEdit = (zone: TerritorialZone) => {
    setEditingZone(zone);
    setFormData({
      name: zone.name,
      zone_type: zone.zone_type,
      recettes_fiscales_estimees_usd: zone.recettes_fiscales_estimees_usd || 0,
      valeur_fonciere_moyenne_parcelle_usd: zone.valeur_fonciere_moyenne_parcelle_usd || 0,
      typologie_dominante: zone.typologie_dominante,
      indice_pression_fonciere: zone.indice_pression_fonciere,
      coordinates: JSON.stringify(zone.coordinates)
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette zone ?')) return;
    
    try {
      const { error } = await supabase
        .from('territorial_zones')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      
      toast({ title: "Succès", description: "Zone supprimée avec succès" });
      fetchZones();
    } catch (error) {
      console.error('Erreur lors de la suppression:', error);
      toast({
        title: "Erreur",
        description: "Impossible de supprimer la zone",
        variant: "destructive",
      });
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      zone_type: 'province',
      recettes_fiscales_estimees_usd: 0,
      valeur_fonciere_moyenne_parcelle_usd: 0,
      typologie_dominante: 'Usage mixte',
      indice_pression_fonciere: 'Modéré',
      coordinates: '[]'
    });
  };

  const handleExport = () => {
    if (zones.length === 0) return;

    const csvContent = zones.map(zone => ({
      Nom: zone.name,
      Type: zone.zone_type,
      'Typologie dominante': zone.typologie_dominante,
      'Pression foncière': zone.indice_pression_fonciere,
      'Valeur foncière moy. (USD)': zone.valeur_fonciere_moyenne_parcelle_usd || 0,
      'Recettes fiscales (USD)': zone.recettes_fiscales_estimees_usd || 0,
    }));

    const csvString = [
      Object.keys(csvContent[0]).join(','),
      ...csvContent.map(row => Object.values(row).join(','))
    ].join('\n');

    const blob = new Blob([csvString], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'donnees_foncieres_rdc.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const filteredZones = zones.filter(zone => {
    if (filterType !== 'all' && zone.zone_type !== filterType) return false;
    if (searchQuery && !zone.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(value);
  };

  const getPressureColor = (pression: string) => {
    switch (pression) {
      case 'Très élevé': return 'bg-red-100 text-red-800';
      case 'Élevé': return 'bg-orange-100 text-orange-800';
      case 'Modéré': return 'bg-yellow-100 text-yellow-800';
      case 'Faible': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'province': return 'bg-blue-100 text-blue-800';
      case 'ville': return 'bg-purple-100 text-purple-800';
      case 'commune': return 'bg-indigo-100 text-indigo-800';
      case 'quartier': return 'bg-pink-100 text-pink-800';
      case 'avenue': return 'bg-cyan-100 text-cyan-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MapPin className="h-5 w-5" />
          <h2 className="text-2xl font-bold">Gestion des Zones Territoriales</h2>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleExport} variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Exporter
          </Button>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => { resetForm(); setEditingZone(null); }}>
                <Plus className="h-4 w-4 mr-2" />
                Nouvelle Zone
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingZone ? 'Modifier la zone' : 'Nouvelle zone territoriale'}
                </DialogTitle>
              </DialogHeader>
              
              <Tabs defaultValue="general" className="space-y-4">
                <TabsList>
                  <TabsTrigger value="general">Général</TabsTrigger>
                  <TabsTrigger value="geographique">Géographique</TabsTrigger>
                </TabsList>
                
                <TabsContent value="general" className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Nom de la zone</Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => setFormData({...formData, name: e.target.value})}
                        placeholder="Ex: Kinshasa Province"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="zone_type">Type de zone</Label>
                      <Select value={formData.zone_type} onValueChange={(value) => setFormData({...formData, zone_type: value})}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="province">Province</SelectItem>
                          <SelectItem value="ville">Ville</SelectItem>
                          <SelectItem value="commune">Commune</SelectItem>
                          <SelectItem value="quartier">Quartier</SelectItem>
                          <SelectItem value="avenue">Avenue</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="typologie_dominante">Typologie dominante</Label>
                      <Select value={formData.typologie_dominante} onValueChange={(value) => setFormData({...formData, typologie_dominante: value})}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Usage mixte">Usage mixte</SelectItem>
                          <SelectItem value="Maisons individuelles">Maisons individuelles</SelectItem>
                          <SelectItem value="Appartements modernes">Appartements modernes</SelectItem>
                          <SelectItem value="Immeubles résidentiels">Immeubles résidentiels</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="indice_pression_fonciere">Pression foncière</Label>
                      <Select value={formData.indice_pression_fonciere} onValueChange={(value) => setFormData({...formData, indice_pression_fonciere: value})}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Faible">Faible</SelectItem>
                          <SelectItem value="Modéré">Modéré</SelectItem>
                          <SelectItem value="Élevé">Élevé</SelectItem>
                          <SelectItem value="Très élevé">Très élevé</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="valeur_fonciere_moyenne_parcelle_usd">Valeur foncière moy./parcelle (USD)</Label>
                      <Input
                        id="valeur_fonciere_moyenne_parcelle_usd"
                        type="number"
                        value={formData.valeur_fonciere_moyenne_parcelle_usd}
                        onChange={(e) => setFormData({...formData, valeur_fonciere_moyenne_parcelle_usd: Number(e.target.value)})}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="recettes_fiscales_estimees_usd">Recettes fiscales estimées (USD)</Label>
                      <Input
                        id="recettes_fiscales_estimees_usd"
                        type="number"
                        value={formData.recettes_fiscales_estimees_usd}
                        onChange={(e) => setFormData({...formData, recettes_fiscales_estimees_usd: Number(e.target.value)})}
                      />
                    </div>
                  </div>
                </TabsContent>
                
                <TabsContent value="geographique" className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="coordinates">Coordonnées (JSON)</Label>
                    <textarea
                      id="coordinates"
                      className="w-full h-32 p-2 border rounded"
                      value={formData.coordinates}
                      onChange={(e) => setFormData({...formData, coordinates: e.target.value})}
                      placeholder='[[[lat1, lng1], [lat2, lng2], [lat3, lng3], [lat1, lng1]]]'
                    />
                    <p className="text-sm text-muted-foreground">
                      Format: tableau de coordonnées [latitude, longitude] formant un polygone fermé
                    </p>
                  </div>
                </TabsContent>
              </Tabs>
              
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Annuler
                </Button>
                <Button onClick={handleSave}>
                  <Save className="h-4 w-4 mr-2" />
                  Sauvegarder
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Zones Territoriales ({filteredZones.length})</CardTitle>
            <div className="flex gap-2">
              <Input
                placeholder="Rechercher une zone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-64"
              />
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous types</SelectItem>
                  <SelectItem value="province">Provinces</SelectItem>
                  <SelectItem value="ville">Villes</SelectItem>
                  <SelectItem value="commune">Communes</SelectItem>
                  <SelectItem value="quartier">Quartiers</SelectItem>
                  <SelectItem value="avenue">Avenues</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p>Chargement...</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nom</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Typologie</TableHead>
                    <TableHead>Pression foncière</TableHead>
                    <TableHead>Valeur foncière moy.</TableHead>
                    <TableHead>Recettes fiscales</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredZones.map((zone) => (
                    <TableRow key={zone.id}>
                      <TableCell className="font-medium">{zone.name}</TableCell>
                      <TableCell>
                        <Badge className={getTypeColor(zone.zone_type)}>
                          {zone.zone_type}
                        </Badge>
                      </TableCell>
                      <TableCell>{zone.typologie_dominante}</TableCell>
                      <TableCell>
                        <Badge className={getPressureColor(zone.indice_pression_fonciere)}>
                          {zone.indice_pression_fonciere}
                        </Badge>
                      </TableCell>
                      <TableCell>{formatCurrency(zone.valeur_fonciere_moyenne_parcelle_usd || 0)}</TableCell>
                      <TableCell>{formatCurrency(zone.recettes_fiscales_estimees_usd || 0)}</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEdit(zone)}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDelete(zone.id)}
                            className="text-destructive hover:bg-destructive hover:text-destructive-foreground"
                          >
                            <Trash2 className="h-4 w-4" />
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
    </div>
  );
};

export default AdminTerritorialZones;

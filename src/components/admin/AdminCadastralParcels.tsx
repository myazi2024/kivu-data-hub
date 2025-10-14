import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Pencil, Trash2, Plus, Search, MapPin } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface CadastralParcel {
  id: string;
  parcel_number: string;
  parcel_type: string;
  location: string;
  property_title_type: string;
  area_sqm: number;
  current_owner_name: string;
  province?: string;
  ville?: string;
  commune?: string;
  created_at: string;
  updated_at: string;
}

const AdminCadastralParcels: React.FC = () => {
  const [parcels, setParcels] = useState<CadastralParcel[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedParcel, setSelectedParcel] = useState<CadastralParcel | null>(null);
  const [formData, setFormData] = useState<Partial<CadastralParcel>>({});
  const { toast } = useToast();

  const fetchParcels = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('cadastral_parcels')
        .select('*')
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setParcels(data || []);
    } catch (error) {
      console.error('Erreur chargement parcelles:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les parcelles",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchParcels();
  }, []);

  const handleEdit = (parcel: CadastralParcel) => {
    setSelectedParcel(parcel);
    setFormData(parcel);
    setIsEditDialogOpen(true);
  };

  const handleCreate = () => {
    setSelectedParcel(null);
    setFormData({
      parcel_type: 'Urbain',
      property_title_type: "Certificat d'enregistrement",
      province: 'Nord-Kivu',
    });
    setIsEditDialogOpen(true);
  };

  const handleSave = async () => {
    try {
      if (!formData.parcel_number || !formData.location || !formData.current_owner_name || !formData.area_sqm) {
        toast({
          title: "Erreur",
          description: "Veuillez remplir tous les champs obligatoires",
          variant: "destructive",
        });
        return;
      }

      if (selectedParcel) {
        // Update
        const { error } = await supabase
          .from('cadastral_parcels')
          .update({
            ...formData,
            updated_at: new Date().toISOString(),
          })
          .eq('id', selectedParcel.id);

        if (error) throw error;

        toast({
          title: "Succès",
          description: "Parcelle mise à jour",
        });
      } else {
        // Create
        const { error } = await supabase
          .from('cadastral_parcels')
          .insert([{
            parcel_number: formData.parcel_number!,
            parcel_type: formData.parcel_type!,
            location: formData.location!,
            property_title_type: formData.property_title_type!,
            area_sqm: formData.area_sqm!,
            current_owner_name: formData.current_owner_name!,
            current_owner_since: new Date().toISOString().split('T')[0],
            province: formData.province,
            ville: formData.ville,
            commune: formData.commune,
          }]);

        if (error) throw error;

        toast({
          title: "Succès",
          description: "Parcelle créée",
        });
      }

      setIsEditDialogOpen(false);
      fetchParcels();
    } catch (error: any) {
      console.error('Erreur sauvegarde:', error);
      toast({
        title: "Erreur",
        description: error.message || "Impossible de sauvegarder la parcelle",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async () => {
    if (!selectedParcel) return;

    try {
      const { error } = await supabase
        .from('cadastral_parcels')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', selectedParcel.id);

      if (error) throw error;

      toast({
        title: "Succès",
        description: "Parcelle supprimée",
      });

      setIsDeleteDialogOpen(false);
      fetchParcels();
    } catch (error) {
      console.error('Erreur suppression:', error);
      toast({
        title: "Erreur",
        description: "Impossible de supprimer la parcelle",
        variant: "destructive",
      });
    }
  };

  const filteredParcels = parcels.filter(parcel =>
    parcel.parcel_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
    parcel.current_owner_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    parcel.location.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Parcelles Cadastrales</CardTitle>
            <div className="flex gap-2">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Rechercher..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 w-[250px]"
                />
              </div>
              <Button onClick={handleCreate}>
                <Plus className="h-4 w-4 mr-2" />
                Nouvelle parcelle
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>N° Parcelle</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Localisation</TableHead>
                <TableHead>Propriétaire</TableHead>
                <TableHead>Superficie</TableHead>
                <TableHead>Date création</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredParcels.map((parcel) => (
                <TableRow key={parcel.id}>
                  <TableCell className="font-mono font-semibold">{parcel.parcel_number}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{parcel.parcel_type}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <MapPin className="h-3 w-3 text-muted-foreground" />
                      <span className="text-sm">{parcel.location}</span>
                    </div>
                  </TableCell>
                  <TableCell>{parcel.current_owner_name}</TableCell>
                  <TableCell>{parcel.area_sqm?.toLocaleString()} m²</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {format(new Date(parcel.created_at), 'dd/MM/yyyy', { locale: fr })}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex gap-1 justify-end">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(parcel)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectedParcel(parcel);
                          setIsDeleteDialogOpen(true);
                        }}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {filteredParcels.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              Aucune parcelle trouvée
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit/Create Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedParcel ? 'Modifier' : 'Créer'} une parcelle</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>N° Parcelle *</Label>
                <Input
                  value={formData.parcel_number || ''}
                  onChange={(e) => setFormData({ ...formData, parcel_number: e.target.value })}
                  placeholder="Ex: NK-GOM-001"
                />
              </div>
              
              <div className="space-y-2">
                <Label>Type de parcelle *</Label>
                <Select
                  value={formData.parcel_type || ''}
                  onValueChange={(value) => setFormData({ ...formData, parcel_type: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Urbain">Urbain</SelectItem>
                    <SelectItem value="Rural">Rural</SelectItem>
                    <SelectItem value="Agricole">Agricole</SelectItem>
                    <SelectItem value="Forestier">Forestier</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Type de titre *</Label>
                <Select
                  value={formData.property_title_type || ''}
                  onValueChange={(value) => setFormData({ ...formData, property_title_type: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Certificat d'enregistrement">Certificat d'enregistrement</SelectItem>
                    <SelectItem value="Titre de propriété">Titre de propriété</SelectItem>
                    <SelectItem value="Concession perpétuelle">Concession perpétuelle</SelectItem>
                    <SelectItem value="Concession ordinaire">Concession ordinaire</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Superficie (m²) *</Label>
                <Input
                  type="number"
                  value={formData.area_sqm || ''}
                  onChange={(e) => setFormData({ ...formData, area_sqm: parseFloat(e.target.value) })}
                  placeholder="Ex: 500"
                />
              </div>

              <div className="space-y-2 col-span-2">
                <Label>Propriétaire actuel *</Label>
                <Input
                  value={formData.current_owner_name || ''}
                  onChange={(e) => setFormData({ ...formData, current_owner_name: e.target.value })}
                  placeholder="Nom complet du propriétaire"
                />
              </div>

              <div className="space-y-2 col-span-2">
                <Label>Localisation *</Label>
                <Textarea
                  value={formData.location || ''}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  placeholder="Adresse complète de la parcelle"
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <Label>Province</Label>
                <Input
                  value={formData.province || ''}
                  onChange={(e) => setFormData({ ...formData, province: e.target.value })}
                  placeholder="Nord-Kivu"
                />
              </div>

              <div className="space-y-2">
                <Label>Ville</Label>
                <Input
                  value={formData.ville || ''}
                  onChange={(e) => setFormData({ ...formData, ville: e.target.value })}
                  placeholder="Goma"
                />
              </div>

              <div className="space-y-2">
                <Label>Commune</Label>
                <Input
                  value={formData.commune || ''}
                  onChange={(e) => setFormData({ ...formData, commune: e.target.value })}
                  placeholder="Ex: Goma"
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Annuler
            </Button>
            <Button onClick={handleSave}>
              {selectedParcel ? 'Mettre à jour' : 'Créer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer la parcelle <strong>{selectedParcel?.parcel_number}</strong> ?
              Cette action peut être annulée en restaurant la parcelle.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AdminCadastralParcels;

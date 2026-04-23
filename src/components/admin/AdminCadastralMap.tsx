import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { MapPin, Search, Filter, Eye, Trash2, RefreshCw, Download, Map as MapIcon, Edit } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { geographicData } from '@/lib/geographicData';
import { AdminParcelEditDialog } from './AdminParcelEditDialog';
import { EmptyMapBanner } from './map/EmptyMapBanner';

// Extraire les provinces
const provinces = Object.keys(geographicData);

// Interface locale pour les parcelles affichées sur la carte (sous-ensemble du type complet)
interface CadastralParcel {
  id: string;
  parcel_number: string;
  current_owner_name: string;
  area_sqm: number;
  property_title_type: string;
  province: string | null;
  ville: string | null;
  commune: string | null;
  quartier: string | null;
  latitude: number | null;
  longitude: number | null;
  gps_coordinates: any;
  created_at: string;
  deleted_at: string | null;
}

const AdminCadastralMap = () => {
  const [parcels, setParcels] = useState<CadastralParcel[]>([]);
  const [filteredParcels, setFilteredParcels] = useState<CadastralParcel[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProvince, setSelectedProvince] = useState('all');
  const [selectedParcel, setSelectedParcel] = useState<CadastralParcel | null>(null);
  const [showMapDialog, setShowMapDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  
  const ITEMS_PER_PAGE = 20;

  // Statistiques
  const [stats, setStats] = useState({
    total: 0,
    withGPS: 0,
    withoutGPS: 0,
    byProvince: {} as Record<string, number>
  });

  const fetchParcels = async () => {
    try {
      setLoading(true);
      
      // Compter le total des contributions validées (exclure TEST-% en production)
      const { count } = await supabase
        .from('cadastral_contributions')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'approved')
        .not('parcel_number', 'ilike', 'TEST-%') as any;
      
      setTotalCount(count || 0);

      // Récupérer les contributions validées avec pagination (exclure TEST-%)
      const { data, error } = await supabase
        .from('cadastral_contributions')
        .select('id, parcel_number, current_owner_name, area_sqm, property_title_type, province, ville, commune, quartier, gps_coordinates, created_at, verified_at')
        .eq('status', 'approved')
        .not('parcel_number', 'ilike', 'TEST-%')
        .order('verified_at', { ascending: false })
        .range((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE - 1);

      if (error) throw error;

      // Transformer les données pour correspondre à l'interface CadastralParcel
      const transformedData = (data || []).map(contribution => {
        let latitude = null;
        let longitude = null;
        
        // Extraire latitude/longitude depuis gps_coordinates
        if (contribution.gps_coordinates && Array.isArray(contribution.gps_coordinates) && contribution.gps_coordinates.length > 0) {
          const firstCoord = contribution.gps_coordinates[0] as { lat?: number; latitude?: number; lng?: number; longitude?: number };
          latitude = firstCoord.lat ?? firstCoord.latitude ?? null;
          longitude = firstCoord.lng ?? firstCoord.longitude ?? null;
        }

        return {
          ...contribution,
          latitude,
          longitude,
          deleted_at: null
        };
      });

      setParcels(transformedData);
      setFilteredParcels(transformedData);
      
      // Calculer les statistiques
      calculateStats(transformedData);
    } catch (error) {
      console.error('Erreur lors du chargement des parcelles:', error);
      toast.error('Erreur lors du chargement des parcelles');
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = async (parcelsData: CadastralParcel[]) => {
    try {
      // Compter toutes les contributions validées
      const { count: totalCount } = await supabase
        .from('cadastral_contributions')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'approved');

      // Compter les contributions validées avec GPS
      const withGPSCount = parcelsData.filter(p => p.latitude && p.longitude).length;

      // Compter par province
      const byProvince: Record<string, number> = {};
      parcelsData.forEach(item => {
        if (item.province) {
          byProvince[item.province] = (byProvince[item.province] || 0) + 1;
        }
      });

      setStats({
        total: totalCount || 0,
        withGPS: withGPSCount,
        withoutGPS: (totalCount || 0) - withGPSCount,
        byProvince
      });
    } catch (error) {
      console.error('Erreur calcul statistiques:', error);
    }
  };

  useEffect(() => {
    fetchParcels();
  }, [page]);

  // Filtrage
  useEffect(() => {
    let filtered = parcels;

    if (searchQuery) {
      filtered = filtered.filter(p => 
        p.parcel_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.current_owner_name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (selectedProvince !== 'all') {
      filtered = filtered.filter(p => p.province === selectedProvince);
    }

    setFilteredParcels(filtered);
  }, [searchQuery, selectedProvince, parcels]);

  const handleViewOnMap = async (parcel: CadastralParcel) => {
    if (!parcel.latitude || !parcel.longitude) {
      toast.error('Cette parcelle n\'a pas de coordonnées GPS');
      return;
    }

    setSelectedParcel(parcel);
    setShowMapDialog(true);

    // Initialiser la carte
    setTimeout(async () => {
      if (!mapRef.current || mapInstanceRef.current) return;

      try {
        const L = await import('leaflet');
        await import('leaflet/dist/leaflet.css');

        delete (L as any).Icon.Default.prototype._getIconUrl;
        L.Icon.Default.mergeOptions({
          iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
          iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
          shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
        });

        const map = L.map(mapRef.current).setView([parcel.latitude!, parcel.longitude!], 16);

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '© OpenStreetMap contributors'
        }).addTo(map);

        // Ajouter le polygone si disponible
        if (parcel.gps_coordinates && Array.isArray(parcel.gps_coordinates) && parcel.gps_coordinates.length >= 3) {
          const polygonPoints: [number, number][] = parcel.gps_coordinates.map(
            (coord: any) => [coord.lat, coord.lng]
          );
          
          const polygon = L.polygon(polygonPoints, {
            color: '#ef4444',
            weight: 2,
            fillColor: '#ef4444',
            fillOpacity: 0.2
          }).addTo(map);

          map.fitBounds(polygon.getBounds(), { padding: [50, 50] });
        } else {
          L.marker([parcel.latitude!, parcel.longitude!]).addTo(map);
        }

        mapInstanceRef.current = map;
        setTimeout(() => map.invalidateSize(), 100);
      } catch (error) {
        console.error('Erreur initialisation carte:', error);
        toast.error('Erreur lors de l\'initialisation de la carte');
      }
    }, 100);
  };

  const handleCloseMapDialog = () => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }
    setShowMapDialog(false);
    setSelectedParcel(null);
  };

  const handleEditGPS = (parcel: CadastralParcel) => {
    setSelectedParcel(parcel);
    setShowEditDialog(true);
  };

  const handleCloseEditDialog = () => {
    setShowEditDialog(false);
    setSelectedParcel(null);
  };

  const handleSaveEdit = () => {
    setShowEditDialog(false);
    setSelectedParcel(null);
    fetchParcels(); // Recharger les parcelles
    toast.success('Modifications GPS enregistrées');
  };

  const handleDelete = async (parcelId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette contribution validée ?')) return;

    try {
      // Rejeter la contribution au lieu de la supprimer
      const { error } = await supabase
        .from('cadastral_contributions')
        .update({ 
          status: 'rejected',
          rejection_reason: 'Supprimée par l\'administrateur',
          rejection_date: new Date().toISOString()
        })
        .eq('id', parcelId);

      if (error) throw error;

      toast.success('Contribution retirée avec succès');
      fetchParcels();
    } catch (error) {
      console.error('Erreur suppression:', error);
      toast.error('Erreur lors de la suppression');
    }
  };

  const exportToCSV = () => {
    const headers = ['Numéro Parcelle', 'Propriétaire', 'Superficie (m²)', 'Type Titre', 'Province', 'Ville', 'Commune', 'Quartier', 'GPS'];
    const rows = filteredParcels.map(p => [
      p.parcel_number,
      p.current_owner_name,
      p.area_sqm,
      p.property_title_type,
      p.province || '',
      p.ville || '',
      p.commune || '',
      p.quartier || '',
      p.latitude && p.longitude ? `${p.latitude}, ${p.longitude}` : 'Non'
    ]);

    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `parcelles_cadastrales_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);

  return (
    <div className="space-y-4 p-2 md:p-4">
      <EmptyMapBanner />
      {/* Statistiques */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <Card>
          <CardHeader className="pb-2 md:pb-3">
            <CardTitle className="text-xs md:text-sm font-medium text-muted-foreground">Total Parcelles</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl md:text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2 md:pb-3">
            <CardTitle className="text-xs md:text-sm font-medium text-muted-foreground">Avec GPS</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl md:text-2xl font-bold text-green-600">{stats.withGPS}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2 md:pb-3">
            <CardTitle className="text-xs md:text-sm font-medium text-muted-foreground">Sans GPS</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl md:text-2xl font-bold text-orange-600">{stats.withoutGPS}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2 md:pb-3">
            <CardTitle className="text-xs md:text-sm font-medium text-muted-foreground">Provinces</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl md:text-2xl font-bold">{Object.keys(stats.byProvince).length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filtres et actions */}
      <Card>
        <CardHeader className="pb-3 md:pb-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 md:gap-4">
            <CardTitle className="text-base md:text-lg">Gestion des Parcelles Cadastrales</CardTitle>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={fetchParcels}>
                <RefreshCw className="h-4 w-4" />
              </Button>
              <Button size="sm" variant="outline" onClick={exportToCSV}>
                <Download className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">Exporter</span>
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-3 md:gap-4 mb-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Rechercher par numéro ou propriétaire..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 text-sm"
                />
              </div>
            </div>
            <div className="w-full md:w-48">
              <Select value={selectedProvince} onValueChange={setSelectedProvince}>
                <SelectTrigger className="text-sm">
                  <SelectValue placeholder="Province" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toutes les provinces</SelectItem>
                  {provinces.map(p => (
                    <SelectItem key={p} value={p}>{p}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : filteredParcels.length === 0 ? (
            <Alert>
              <AlertDescription>Aucune parcelle trouvée</AlertDescription>
            </Alert>
          ) : (
            <>
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="text-xs">
                      <TableHead className="px-2 py-2">Numéro</TableHead>
                      <TableHead className="px-2 py-2 hidden md:table-cell">Propriétaire</TableHead>
                      <TableHead className="px-2 py-2 hidden lg:table-cell">Superficie</TableHead>
                      <TableHead className="px-2 py-2 hidden lg:table-cell">Type</TableHead>
                      <TableHead className="px-2 py-2">Localisation</TableHead>
                      <TableHead className="px-2 py-2">GPS</TableHead>
                      <TableHead className="px-2 py-2 text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredParcels.map((parcel) => (
                      <TableRow key={parcel.id} className="text-xs">
                        <TableCell className="px-2 py-2 font-medium">{parcel.parcel_number}</TableCell>
                        <TableCell className="px-2 py-2 hidden md:table-cell">{parcel.current_owner_name}</TableCell>
                        <TableCell className="px-2 py-2 hidden lg:table-cell">{parcel.area_sqm.toLocaleString()} m²</TableCell>
                        <TableCell className="px-2 py-2 hidden lg:table-cell">
                          <Badge variant="outline" className="text-[10px]">{parcel.property_title_type}</Badge>
                        </TableCell>
                        <TableCell className="px-2 py-2">
                          <div className="text-xs">
                            {parcel.province && <div>{parcel.province}</div>}
                            {parcel.ville && <div className="text-[10px] text-muted-foreground">{parcel.ville}</div>}
                          </div>
                        </TableCell>
                        <TableCell className="px-2 py-2">
                          {parcel.latitude && parcel.longitude ? (
                            <Badge variant="default" className="bg-green-600 text-[10px]">Oui</Badge>
                          ) : (
                            <Badge variant="secondary" className="text-[10px]">Non</Badge>
                          )}
                        </TableCell>
                        <TableCell className="px-2 py-2 text-right">
                          <div className="flex justify-end gap-1">
                            {parcel.latitude && parcel.longitude && (
                              <>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleViewOnMap(parcel)}
                                  className="h-7 px-2"
                                  title="Voir sur carte"
                                >
                                  <Eye className="h-3 w-3" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleEditGPS(parcel)}
                                  className="h-7 px-2"
                                  title="Éditer GPS"
                                >
                                  <Edit className="h-3 w-3" />
                                </Button>
                              </>
                            )}
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDelete(parcel.id)}
                              className="h-7 px-2 text-destructive hover:text-destructive"
                              title="Supprimer"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              <div className="flex items-center justify-between mt-4">
                <p className="text-xs text-muted-foreground">
                  Page {page} sur {totalPages} ({totalCount} parcelles)
                </p>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="text-xs"
                  >
                    Précédent
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="text-xs"
                  >
                    Suivant
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Dialog Carte */}
      <Dialog open={showMapDialog} onOpenChange={handleCloseMapDialog}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>
              Parcelle {selectedParcel?.parcel_number}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {selectedParcel && (
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <Label className="text-xs text-muted-foreground">Propriétaire</Label>
                  <p className="font-medium">{selectedParcel.current_owner_name}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Superficie</Label>
                  <p className="font-medium">{selectedParcel.area_sqm.toLocaleString()} m²</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Province</Label>
                  <p className="font-medium">{selectedParcel.province || 'N/A'}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Ville</Label>
                  <p className="font-medium">{selectedParcel.ville || 'N/A'}</p>
                </div>
              </div>
            )}
            <div ref={mapRef} className="w-full h-96 rounded-lg border" />
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog Édition GPS */}
      <AdminParcelEditDialog
        parcel={selectedParcel}
        open={showEditDialog}
        onClose={handleCloseEditDialog}
        onSave={handleSaveEdit}
      />
    </div>
  );
};

export default AdminCadastralMap;

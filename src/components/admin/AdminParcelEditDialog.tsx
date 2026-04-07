import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { ParcelMapPreview } from '@/components/cadastral/ParcelMapPreview';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Save, X, AlertCircle, CheckCircle } from 'lucide-react';

interface Coordinate {
  borne: string;
  lat: string;
  lng: string;
}

interface AdminParcelEditDialogProps {
  parcel: {
    id: string;
    parcel_number: string;
    current_owner_name: string;
    province: string | null;
    ville: string | null;
    gps_coordinates: any;
  } | null;
  open: boolean;
  onClose: () => void;
  onSave: () => void;
}

export const AdminParcelEditDialog = ({ parcel, open, onClose, onSave }: AdminParcelEditDialogProps) => {
  const [coordinates, setCoordinates] = useState<Coordinate[]>([]);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  useEffect(() => {
    if (parcel && parcel.gps_coordinates && open) {
      // Convertir les coordonnées de la parcelle au format attendu
      const coords = Array.isArray(parcel.gps_coordinates) 
        ? parcel.gps_coordinates.map((coord: any, index: number) => ({
            borne: `Borne ${index + 1}`,
            lat: coord.lat?.toString() || '',
            lng: coord.lng?.toString() || ''
          }))
        : [];
      setCoordinates(coords);
      setHasChanges(false);
      setValidationError(null);
    }
  }, [parcel, open]);

  const handleCoordinatesUpdate = (newCoords: Coordinate[]) => {
    setCoordinates(newCoords);
    setHasChanges(true);
    setValidationError(null);
  };

  const validateCoordinates = (): boolean => {
    if (coordinates.length < 3) {
      setValidationError('Au moins 3 bornes sont requises pour former un polygone valide');
      return false;
    }

    const validCoords = coordinates.filter(c => c.lat && c.lng && !isNaN(parseFloat(c.lat)) && !isNaN(parseFloat(c.lng)));
    if (validCoords.length < 3) {
      setValidationError('Au moins 3 coordonnées GPS valides sont requises');
      return false;
    }

    // Vérifier que les coordonnées sont dans une plage valide
    for (const coord of validCoords) {
      const lat = parseFloat(coord.lat);
      const lng = parseFloat(coord.lng);
      
      if (lat < -90 || lat > 90) {
        setValidationError(`Latitude invalide: ${lat} (doit être entre -90 et 90)`);
        return false;
      }
      
      if (lng < -180 || lng > 180) {
        setValidationError(`Longitude invalide: ${lng} (doit être entre -180 et 180)`);
        return false;
      }
    }

    return true;
  };

  const handleSave = async () => {
    if (!parcel || !validateCoordinates()) return;

    setSaving(true);
    try {
      // Convertir les coordonnées au format de stockage
      const gpsCoordinates = coordinates.map(coord => ({
        borne: coord.borne,
        lat: parseFloat(coord.lat),
        lng: parseFloat(coord.lng)
      }));

      // Calculer latitude et longitude (premier point)
      const firstCoord = gpsCoordinates[0];
      const latitude = firstCoord.lat;
      const longitude = firstCoord.lng;

      // Mettre à jour la parcelle dans cadastral_parcels
      const { error: updateError } = await supabase
        .from('cadastral_parcels')
        .update({
          gps_coordinates: gpsCoordinates,
          latitude,
          longitude,
          updated_at: new Date().toISOString()
        })
        .eq('id', parcel.id);

      if (updateError) throw updateError;

      // Créer une entrée d'audit
      await supabase.rpc('log_audit_action', {
        action_param: 'GPS_EDIT',
        table_name_param: 'cadastral_parcels',
        record_id_param: parcel.id,
        new_values_param: {
          gps_coordinates: gpsCoordinates,
          latitude,
          longitude,
          edited_by: 'admin',
          edit_reason: 'Correction des coordonnées GPS via interface admin'
        }
      });

      toast.success('Coordonnées GPS mises à jour avec succès');
      setHasChanges(false);
      onSave();
    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error);
      toast.error('Erreur lors de la mise à jour des coordonnées GPS');
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    if (hasChanges) {
      if (!confirm('Vous avez des modifications non sauvegardées. Voulez-vous vraiment fermer ?')) {
        return;
      }
    }
    setHasChanges(false);
    setValidationError(null);
    onClose();
  };

  if (!parcel) return null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span>Éditer les coordonnées GPS</span>
            {hasChanges && (
              <Badge variant="outline" className="bg-orange-100 text-orange-800 border-orange-300">
                Modifications non sauvegardées
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Informations de la parcelle */}
          <div className="bg-muted/50 p-3 rounded-lg space-y-2">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="font-medium">Parcelle:</span> {parcel.parcel_number}
              </div>
              <div>
                <span className="font-medium">Propriétaire:</span> {parcel.current_owner_name}
              </div>
              {parcel.province && (
                <div>
                  <span className="font-medium">Province:</span> {parcel.province}
                </div>
              )}
              {parcel.ville && (
                <div>
                  <span className="font-medium">Ville:</span> {parcel.ville}
                </div>
              )}
            </div>
          </div>

          {/* Instructions */}
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-xs">
              <strong>Instructions:</strong>
              <ul className="list-disc list-inside mt-1 space-y-1">
                <li>Mode individuel: déplacez chaque marqueur séparément</li>
                <li>Mode groupé: cliquez sur "Déplacer groupe" pour déplacer tous les marqueurs ensemble</li>
                <li>Au moins 3 bornes valides sont requises pour former un polygone</li>
              </ul>
            </AlertDescription>
          </Alert>

          {/* Erreur de validation */}
          {validationError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{validationError}</AlertDescription>
            </Alert>
          )}

          {/* Carte interactive */}
          <div className="border rounded-lg overflow-hidden">
            <ParcelMapPreview
              coordinates={coordinates}
              onCoordinatesUpdate={handleCoordinatesUpdate}
              currentParcelNumber={parcel.parcel_number}
              
              config={{
                enableDragging: true,
                showSideDimensions: true,
                defaultCenter: parcel.gps_coordinates?.[0] 
                  ? { lat: parseFloat(parcel.gps_coordinates[0].lat), lng: parseFloat(parcel.gps_coordinates[0].lng) }
                  : { lat: -1.6786, lng: 29.2284 }
              }}
            />
          </div>

          {/* Résumé des coordonnées */}
          <div className="bg-muted/30 p-3 rounded-lg">
            <div className="text-sm font-medium mb-2">
              Coordonnées ({coordinates.length} bornes)
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs">
              {coordinates.map((coord, idx) => (
                <div key={idx} className="bg-background p-2 rounded border">
                  <div className="font-medium">{coord.borne}</div>
                  <div className="text-muted-foreground">
                    Lat: {coord.lat ? parseFloat(coord.lat).toFixed(6) : 'N/A'}
                  </div>
                  <div className="text-muted-foreground">
                    Lng: {coord.lng ? parseFloat(coord.lng).toFixed(6) : 'N/A'}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            disabled={saving}
          >
            <X className="h-4 w-4 mr-2" />
            Annuler
          </Button>
          <Button
            type="button"
            onClick={handleSave}
            disabled={!hasChanges || saving}
          >
            {saving ? (
              <>
                <span className="animate-spin mr-2">⏳</span>
                Sauvegarde...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Sauvegarder
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { ParcelMapPreview } from '@/components/cadastral/ParcelMapPreview';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Save, X, AlertCircle } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getLandDistrictsForProvince, getSectionTypeForLandDistrict } from '@/lib/geographicData';

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
    land_district?: string | null;
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
  const [landDistrict, setLandDistrict] = useState<string>('');
  const [gpsChanged, setGpsChanged] = useState(false);

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
      setLandDistrict(parcel.land_district || '');
      setGpsChanged(false);
      setHasChanges(false);
      setValidationError(null);
    }
  }, [parcel, open]);

  const handleCoordinatesUpdate = (newCoords: Coordinate[]) => {
    setCoordinates(newCoords);
    setGpsChanged(true);
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

  const districtOptions = parcel?.province ? getLandDistrictsForProvince(parcel.province) : [];
  const derivedSection = getSectionTypeForLandDistrict(landDistrict);
  const districtChanged = (parcel?.land_district || '') !== landDistrict;

  const handleSave = async () => {
    if (!parcel) return;
    if (gpsChanged && !validateCoordinates()) return;
    if (districtOptions.length > 0 && !landDistrict) {
      setValidationError('La circonscription foncière est obligatoire');
      return;
    }

    setSaving(true);
    try {
      const patch: Record<string, unknown> = {};
      if (gpsChanged) {
        const gpsCoordinates = coordinates.map(coord => ({
          borne: coord.borne,
          lat: parseFloat(coord.lat),
          lng: parseFloat(coord.lng),
        }));
        patch.gps_coordinates = gpsCoordinates;
        patch.latitude = gpsCoordinates[0].lat;
        patch.longitude = gpsCoordinates[0].lng;
      }
      if (districtChanged) {
        patch.land_district = landDistrict || null;
        if (derivedSection) patch.parcel_type = derivedSection === 'urbaine' ? 'SU' : 'SR';
      }

      // La ligne affichée est une contribution : la parcelle se retrouve par son numéro.
      const { data: updated, error: updateError } = await supabase
        .from('cadastral_parcels')
        .update({ ...patch, updated_at: new Date().toISOString() } as any)
        .eq('parcel_number', parcel.parcel_number)
        .is('deleted_at', null)
        .select('id');
      if (updateError) throw updateError;
      if (!updated || updated.length === 0) {
        throw new Error('Parcelle introuvable dans le cadastre pour ce numéro');
      }

      // Garder la contribution alignée (source affichée sur cette carte)
      const contribPatch: Record<string, unknown> = {};
      if (gpsChanged) contribPatch.gps_coordinates = patch.gps_coordinates;
      if (districtChanged) contribPatch.land_district = patch.land_district;
      const { error: contribError } = await supabase
        .from('cadastral_contributions')
        .update(contribPatch as any)
        .eq('id', parcel.id);
      if (contribError) throw contribError;

      await supabase.rpc('log_audit_action', {
        action_param: gpsChanged ? 'GPS_EDIT' : 'PARCEL_LOCATION_EDIT',
        table_name_param: 'cadastral_parcels',
        record_id_param: updated[0].id,
        new_values_param: { ...patch, edited_by: 'admin', edit_reason: 'Correction via la carte cadastrale admin' } as any,
      });

      toast.success('Parcelle mise à jour');
      setHasChanges(false);
      setGpsChanged(false);
      onSave();
    } catch (error: any) {
      console.error('Erreur lors de la sauvegarde:', error);
      toast.error(error?.message || 'Erreur lors de la mise à jour de la parcelle');
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
            <span>Éditer la parcelle</span>
            {hasChanges && (
              <Badge variant="outline" className="border-warning text-warning">
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

          {/* Circonscription foncière */}
          <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-3 items-end">
            <div className="space-y-1">
              <Label className="text-xs">Circonscription foncière</Label>
              {districtOptions.length > 0 ? (
                <Select
                  value={landDistrict || undefined}
                  onValueChange={(v) => { setLandDistrict(v); setHasChanges(true); setValidationError(null); }}
                >
                  <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Sélectionner" /></SelectTrigger>
                  <SelectContent>
                    {districtOptions.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                  </SelectContent>
                </Select>
              ) : (
                <p className="text-xs text-muted-foreground">
                  {landDistrict || 'Province inconnue : aucune circonscription disponible'}
                </p>
              )}
            </div>
            <div className="text-xs">
              <span className="text-muted-foreground">Section : </span>
              <Badge variant="secondary">
                {derivedSection === 'urbaine' ? 'SU (urbaine)' : derivedSection === 'rurale' ? 'SR (rurale)' : '—'}
              </Badge>
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

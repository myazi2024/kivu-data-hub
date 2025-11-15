import { MapPin, Map, Navigation } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface PermitLocationMapProps {
  permit: any;
}

export function PermitLocationMap({ permit }: PermitLocationMapProps) {
  const hasCoordinates =
    permit.gps_coordinates?.latitude && permit.gps_coordinates?.longitude;

  const getLocationAddress = () => {
    const parts = [
      permit.avenue,
      permit.quartier,
      permit.commune,
      permit.ville,
      permit.province,
    ].filter(Boolean);
    return parts.join(", ") || "Adresse non spécifiée";
  };

  const handleOpenInMaps = () => {
    if (hasCoordinates) {
      const { latitude, longitude } = permit.gps_coordinates;
      window.open(
        `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`,
        "_blank"
      );
    }
  };

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-base">
          <span className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-primary" />
            Localisation
          </span>
          {hasCoordinates && (
            <Badge variant="outline" className="text-xs gap-1">
              <Navigation className="h-3 w-3" />
              GPS
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Carte miniature */}
        <div className="relative h-[180px] overflow-hidden rounded-lg border border-border/50 bg-muted/20">
          {hasCoordinates ? (
            <iframe
              width="100%"
              height="100%"
              frameBorder="0"
              style={{ border: 0 }}
              src={`https://www.google.com/maps/embed/v1/place?key=YOUR_GOOGLE_MAPS_API_KEY&q=${permit.gps_coordinates.latitude},${permit.gps_coordinates.longitude}&zoom=16`}
              allowFullScreen
              className="grayscale"
            />
          ) : (
            <div className="flex h-full items-center justify-center flex-col gap-2 text-muted-foreground">
              <Map className="h-8 w-8" />
              <p className="text-xs">Coordonnées GPS non disponibles</p>
            </div>
          )}
        </div>

        {/* Adresse */}
        <div className="space-y-2 rounded-lg bg-muted/50 p-3">
          <div className="flex items-start gap-2">
            <MapPin className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0 space-y-1">
              <p className="text-xs font-medium text-muted-foreground">Adresse</p>
              <p className="text-sm leading-relaxed">{getLocationAddress()}</p>
              {permit.parcel_number && (
                <p className="text-xs text-muted-foreground">
                  Parcelle: {permit.parcel_number}
                </p>
              )}
            </div>
          </div>

          {hasCoordinates && (
            <div className="flex items-center justify-between pt-2 border-t border-border/50">
              <div className="text-xs text-muted-foreground space-y-0.5">
                <p>Lat: {permit.gps_coordinates.latitude}°</p>
                <p>Long: {permit.gps_coordinates.longitude}°</p>
              </div>
              <Button
                size="sm"
                variant="outline"
                className="gap-2"
                onClick={handleOpenInMaps}
              >
                <Navigation className="h-3 w-3" />
                Ouvrir
              </Button>
            </div>
          )}
        </div>

        {/* Informations complémentaires */}
        {permit.circonscription_fonciere && (
          <div className="rounded-lg border border-border/50 bg-background/50 p-3 space-y-1">
            <p className="text-xs font-medium text-muted-foreground">
              Circonscription foncière
            </p>
            <p className="text-sm">{permit.circonscription_fonciere}</p>
          </div>
        )}

        {!hasCoordinates && (
          <div className="rounded-lg bg-yellow-50 border border-yellow-200 p-3 text-xs text-yellow-800">
            <p className="font-medium mb-1">⚠️ Coordonnées GPS manquantes</p>
            <p>
              Pour une meilleure précision, veuillez ajouter les coordonnées GPS de
              votre parcelle dans vos futures demandes.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

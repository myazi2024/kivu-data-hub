import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { MapPin, X, MessageCircle, AlertTriangle } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';

interface ParcelInfoPanelProps {
  parcel: {
    parcel_number: string;
    area_sqm?: number;
    gps_coordinates?: any[];
    province?: string;
    ville?: string;
    commune?: string;
    quartier?: string;
  };
  onClose: () => void;
  hasIncompleteData?: boolean;
  onReportMissingData?: () => void;
  calculatedArea?: number;
}

const ParcelInfoPanel: React.FC<ParcelInfoPanelProps> = ({
  parcel,
  onClose,
  hasIncompleteData = false,
  onReportMissingData,
  calculatedArea
}) => {
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  const displayArea = calculatedArea 
    ? calculatedArea.toLocaleString(undefined, { maximumFractionDigits: 2 })
    : parcel.area_sqm?.toLocaleString();

  const handleWhatsAppHelp = () => {
    const phoneNumber = '243816996077';
    const message = 'Bonjour, j\'ai besoin d\'aide concernant les informations cadastrales.';
    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodedMessage}`;
    window.open(whatsappUrl, '_blank');
  };

  return (
    <div className="absolute bottom-4 right-4 z-[1000] w-80 max-w-[calc(100vw-2rem)]">
      <Card className="shadow-lg bg-background/95 backdrop-blur-sm">
        <CardHeader className="pb-2 sm:pb-3 pt-3 sm:pt-6 px-3 sm:px-6">
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-sm sm:text-base flex items-center gap-1.5 sm:gap-2">
                <MapPin className="h-3 w-3 sm:h-4 sm:w-4 text-primary" />
                Parcelle sélectionnée
              </CardTitle>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="h-5 w-5 sm:h-6 sm:w-6 p-0 -mt-1 hover:bg-muted"
              onClick={onClose}
            >
              <X className="h-3 w-3 sm:h-4 sm:w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-2 sm:space-y-3 text-xs sm:text-sm px-3 sm:px-6 pb-3 sm:pb-6">
          <div>
            <p className="font-mono font-bold text-primary text-xs sm:text-sm">
              {parcel.parcel_number}
            </p>
          </div>
          
          <div className="space-y-1.5 sm:space-y-2">
            <div>
              <span className="text-muted-foreground text-xs">Surface:</span>
              <p className="font-medium text-xs sm:text-sm">
                {displayArea} m²
              </p>
            </div>
            
            <div>
              <span className="text-muted-foreground text-xs">Localisation:</span>
              <p className="font-medium text-xs sm:text-sm leading-tight">
                {parcel.province} - {parcel.ville}
                {parcel.commune && <><br />{parcel.commune}</>}
                {parcel.quartier && ` ${parcel.quartier}`}
              </p>
            </div>
          </div>
          
          <div className="space-y-1.5 sm:space-y-2">
            <div className="grid grid-cols-2 gap-1.5 sm:gap-2">
              <Button
                onClick={() => navigate(`/services?search=${encodeURIComponent(parcel.parcel_number)}&from=map`)}
                className="w-full text-xs sm:text-sm h-8 sm:h-9 px-2 sm:px-4"
                size="sm"
              >
                {isMobile ? "Plus de données" : "Afficher plus de données"}
              </Button>
              
              <Button
                onClick={handleWhatsAppHelp}
                variant="outline"
                size="sm"
                className="w-full text-xs sm:text-sm h-8 sm:h-9 px-2 sm:px-4"
              >
                <MessageCircle className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                Besoin d'aide ?
              </Button>
            </div>
            
            {hasIncompleteData && onReportMissingData && (
              <Alert 
                className="bg-orange-50 border-orange-200 cursor-pointer hover:bg-orange-100 transition-colors py-2 sm:py-3"
                onClick={onReportMissingData}
              >
                <AlertTriangle className="h-3 w-3 sm:h-4 sm:w-4 text-orange-600" />
                <AlertDescription className="text-orange-800 text-[10px] sm:text-xs leading-tight">
                  Cette parcelle a des données incomplètes, cliquez ici pour compléter les données manquantes.
                </AlertDescription>
              </Alert>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ParcelInfoPanel;

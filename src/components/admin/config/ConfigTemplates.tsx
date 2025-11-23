import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, Download, Upload } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ConfigTemplatesProps {
  onApplyTemplate: (template: any) => void;
}

const TEMPLATES = {
  minimal: {
    name: 'Configuration Minimale',
    description: 'Seulement les champs essentiels',
    config: {
      form_sections: {
        general: { label: 'Informations générales', enabled: true, order: 1 },
        location: { label: 'Localisation', enabled: true, order: 2 },
        owners: { label: 'Propriétaires', enabled: true, order: 3 }
      },
      required_fields: {
        propertyTitleType: true,
        province: true,
        currentOwnerName: true
      }
    }
  },
  standard: {
    name: 'Configuration Standard',
    description: 'Configuration équilibrée pour la plupart des cas',
    config: {
      form_sections: {
        general: { label: 'Informations générales', enabled: true, order: 1 },
        location: { label: 'Localisation', enabled: true, order: 2 },
        owners: { label: 'Propriétaires', enabled: true, order: 3 },
        dimensions: { label: 'Dimensions', enabled: true, order: 4 },
        gps: { label: 'Coordonnées GPS', enabled: true, order: 5 }
      },
      required_fields: {
        propertyTitleType: true,
        province: true,
        ville: true,
        commune: true,
        currentOwnerName: true,
        area_sqm: true
      }
    }
  },
  complete: {
    name: 'Configuration Complète',
    description: 'Tous les champs activés pour une documentation exhaustive',
    config: {
      form_sections: {
        general: { label: 'Informations générales', enabled: true, order: 1 },
        location: { label: 'Localisation', enabled: true, order: 2 },
        owners: { label: 'Propriétaires', enabled: true, order: 3 },
        previousOwners: { label: 'Anciens propriétaires', enabled: true, order: 4 },
        dimensions: { label: 'Dimensions', enabled: true, order: 5 },
        gps: { label: 'Coordonnées GPS', enabled: true, order: 6 },
        buildingPermits: { label: 'Permis de construire', enabled: true, order: 7 },
        taxes: { label: 'Taxes', enabled: true, order: 8 },
        mortgages: { label: 'Hypothèques', enabled: true, order: 9 }
      },
      required_fields: {
        propertyTitleType: true,
        province: true,
        ville: true,
        commune: true,
        quartier: true,
        avenue: true,
        currentOwnerName: true,
        currentOwnerSince: true,
        area_sqm: true,
        gpsCoordinates: true
      }
    }
  }
};

export const ConfigTemplates: React.FC<ConfigTemplatesProps> = ({ onApplyTemplate }) => {
  const { toast } = useToast();

  const handleApplyTemplate = (templateKey: string) => {
    const template = TEMPLATES[templateKey as keyof typeof TEMPLATES];
    onApplyTemplate(template.config);
    toast({
      title: "Template appliqué",
      description: `La configuration "${template.name}" a été appliquée`
    });
  };

  const handleExportConfig = () => {
    // TODO: Implémenter l'export
    toast({
      title: "Export en cours",
      description: "La fonctionnalité d'export sera disponible prochainement"
    });
  };

  const handleImportConfig = () => {
    // TODO: Implémenter l'import
    toast({
      title: "Import en cours",
      description: "La fonctionnalité d'import sera disponible prochainement"
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Templates de configuration</CardTitle>
        <CardDescription className="text-xs">
          Appliquez rapidement des configurations prédéfinies
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {Object.entries(TEMPLATES).map(([key, template]) => (
          <div key={key} className="p-3 border rounded-lg space-y-2">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <h4 className="text-sm font-medium">{template.name}</h4>
                <p className="text-xs text-muted-foreground">{template.description}</p>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleApplyTemplate(key)}
              >
                <FileText className="mr-1 h-3 w-3" />
                Appliquer
              </Button>
            </div>
          </div>
        ))}

        <div className="pt-3 border-t space-y-2">
          <Button
            size="sm"
            variant="outline"
            className="w-full"
            onClick={handleExportConfig}
          >
            <Download className="mr-2 h-4 w-4" />
            Exporter la configuration actuelle
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="w-full"
            onClick={handleImportConfig}
          >
            <Upload className="mr-2 h-4 w-4" />
            Importer une configuration
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

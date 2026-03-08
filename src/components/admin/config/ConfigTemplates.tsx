import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, Download, Upload } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

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
        buildingPermits: { label: 'Autorisation de bâtir', enabled: true, order: 7 },
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

  const handleExportConfig = async () => {
    try {
      // Récupérer toutes les configs actives
      const { data: configs, error } = await supabase
        .from('cadastral_contribution_config')
        .select('*')
        .eq('is_active', true);

      if (error) throw error;

      const exportData = {
        version: '1.0',
        exportDate: new Date().toISOString(),
        configurations: configs
      };

      // Créer un blob et télécharger
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `config-ccc-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: "Export réussi",
        description: "La configuration a été exportée avec succès"
      });
    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: "Erreur d'export",
        description: "Impossible d'exporter la configuration",
        variant: "destructive"
      });
    }
  };

  const handleImportConfig = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    
    input.onchange = async (e: any) => {
      try {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (event) => {
          try {
            const importData = JSON.parse(event.target?.result as string);
            
            if (!importData.configurations || !Array.isArray(importData.configurations)) {
              throw new Error('Format de fichier invalide');
            }

            // Confirmer l'import
            if (!confirm(`Importer ${importData.configurations.length} configuration(s) ? Cette action écrasera les configurations existantes.`)) {
              return;
            }

            // Désactiver toutes les configs existantes
            await supabase
              .from('cadastral_contribution_config')
              .update({ is_active: false })
              .eq('is_active', true);

            // Insérer les nouvelles configs
            for (const config of importData.configurations) {
              const { id, created_at, updated_at, ...configData } = config;
              await supabase
                .from('cadastral_contribution_config')
                .insert({
                  ...configData,
                  is_active: true
                });
            }

            toast({
              title: "Import réussi",
              description: `${importData.configurations.length} configuration(s) importée(s)`
            });

            // Rafraîchir la page pour voir les changements
            window.location.reload();
          } catch (error) {
            console.error('Import error:', error);
            toast({
              title: "Erreur d'import",
              description: "Fichier invalide ou erreur lors de l'import",
              variant: "destructive"
            });
          }
        };
        reader.readAsText(file);
      } catch (error) {
        console.error('File reading error:', error);
      }
    };
    
    input.click();
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

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Eye, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface ConfigPreviewProps {
  config: any;
  type: 'sections' | 'fields' | 'validation' | 'ccc' | 'map';
}

export const ConfigPreview: React.FC<ConfigPreviewProps> = ({ config, type }) => {
  const renderSectionsPreview = () => {
    if (!config || Object.keys(config).length === 0) {
      return <p className="text-sm text-muted-foreground">Aucune section configurée</p>;
    }

    const enabledSections = Object.entries(config)
      .filter(([_, value]: [string, any]) => value.enabled)
      .sort((a: [string, any], b: [string, any]) => a[1].order - b[1].order);

    return (
      <div className="space-y-2">
        {enabledSections.map(([key, value]: [string, any]) => (
          <div key={key} className="flex items-center justify-between p-2 border rounded">
            <span className="text-sm font-medium">{value.label}</span>
            <Badge variant="secondary">Ordre {value.order}</Badge>
          </div>
        ))}
      </div>
    );
  };

  const renderFieldsPreview = () => {
    if (!config || Object.keys(config).length === 0) {
      return <p className="text-sm text-muted-foreground">Aucun champ configuré</p>;
    }

    const requiredFields = Object.entries(config)
      .filter(([_, value]) => value)
      .map(([key]) => key);

    return (
      <div className="flex flex-wrap gap-2">
        {requiredFields.map(field => (
          <Badge key={field} variant="destructive">{field}</Badge>
        ))}
      </div>
    );
  };

  const renderValidationPreview = () => {
    if (!config) {
      return <p className="text-sm text-muted-foreground">Aucune règle configurée</p>;
    }

    return (
      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span>Surface min:</span>
          <span className="font-medium">{config.min_area_sqm || 0} m²</span>
        </div>
        <div className="flex justify-between">
          <span>Surface max:</span>
          <span className="font-medium">{config.max_area_sqm || 0} m²</span>
        </div>
        <div className="flex justify-between">
          <span>Points GPS min:</span>
          <span className="font-medium">{config.min_gps_points || 3}</span>
        </div>
        <div className="flex justify-between">
          <span>GPS obligatoire:</span>
          <Badge variant={config.require_gps ? "default" : "secondary"}>
            {config.require_gps ? 'Oui' : 'Non'}
          </Badge>
        </div>
      </div>
    );
  };

  const renderCccPreview = () => {
    if (!config) {
      return <p className="text-sm text-muted-foreground">Aucun paramètre configuré</p>;
    }

    return (
      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span>Valeur de base:</span>
          <span className="font-medium">${config.base_value_usd || 0}</span>
        </div>
        <div className="flex justify-between">
          <span>Taux par m²:</span>
          <span className="font-medium">${config.per_sqm_rate || 0}</span>
        </div>
        <div className="flex justify-between">
          <span>Validité:</span>
          <span className="font-medium">{config.validity_days || 90} jours</span>
        </div>
      </div>
    );
  };

  const renderMapPreview = () => {
    if (!config) {
      return <p className="text-sm text-muted-foreground">Aucun paramètre configuré</p>;
    }

    return (
      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span>Zoom par défaut:</span>
          <span className="font-medium">{config.defaultZoom || 15}</span>
        </div>
        <div className="flex justify-between">
          <span>Marqueurs min:</span>
          <span className="font-medium">{config.minMarkers || 3}</span>
        </div>
        <div className="flex justify-between">
          <span>Marqueurs max:</span>
          <span className="font-medium">{config.maxMarkers || 50}</span>
        </div>
        <div className="flex justify-between">
          <span>Détection conflits:</span>
          <Badge variant={config.enableConflictDetection ? "default" : "secondary"}>
            {config.enableConflictDetection ? 'Activée' : 'Désactivée'}
          </Badge>
        </div>
      </div>
    );
  };

  const renderPreview = () => {
    switch (type) {
      case 'sections':
        return renderSectionsPreview();
      case 'fields':
        return renderFieldsPreview();
      case 'validation':
        return renderValidationPreview();
      case 'ccc':
        return renderCccPreview();
      case 'map':
        return renderMapPreview();
      default:
        return null;
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Eye className="h-4 w-4" />
          <CardTitle className="text-sm">Prévisualisation</CardTitle>
        </div>
        <CardDescription className="text-xs">
          Aperçu en temps réel de la configuration
        </CardDescription>
      </CardHeader>
      <CardContent>
        {renderPreview()}
      </CardContent>
    </Card>
  );
};
